import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { saveToS3, fetchS3Folder, saveFolderToS3 } from "./aws";
import path from "path";
import { fetchDir, fetchFileContent, saveFile } from "./fs";
import { TerminalManager } from "./pty";

const terminalManager = new TerminalManager();

export function initWs(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            // Should restrict this more!
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
      
    io.on("connection", async (socket) => {
        // Auth checks should happen here
        const host = socket.handshake.headers.host;
        console.log(`[WS] New connection: socket.id=${socket.id}, host=${host}, transport=${socket.conn.transport.name}`);
        // Split the host by '.' and take the first part as replId
        const replId = host?.split('.')[0];
    
        if (!replId) {
            console.log("[WS] No replId found, disconnecting");
            socket.disconnect();
            terminalManager.clear(socket.id);
            return;
        }

        console.log(`[WS] replId=${replId}, checking /workspace`);
        let rootContent = await fetchDir("/workspace", "");

        // If workspace is empty, fetch files from S3 code folder as fallback
        if (!rootContent || rootContent.length === 0) {
            console.log(`[WS] /workspace is empty. Attempting S3 fallback fetch for replId=${replId}...`);
            try {
                await fetchS3Folder(`code/${replId}`, "/workspace");
                rootContent = await fetchDir("/workspace", "");
                console.log(`[WS] Fallback fetch complete. Files found: ${rootContent.length}`);
            } catch (err) {
                console.error("[WS] Fallback S3 fetch error:", err);
            }
        }

        socket.emit("loaded", {
            rootContent
        });

        initHandlers(socket, replId);
    });
}

function initHandlers(socket: Socket, replId: string) {

    socket.on("disconnect", () => {
        console.log(`[WS] User disconnected: socket.id=${socket.id}`);
    });

    socket.on("fetchDir", async (dir: string, callback) => {
        const dirPath = `/workspace/${dir}`;
        const contents = await fetchDir(dirPath, dir);
        callback(contents);
    });

    socket.on("fetchContent", async ({ path: filePath }: { path: string }, callback) => {
        const fullPath = `/workspace/${filePath}`;
        const data = await fetchFileContent(fullPath);
        callback(data);
    });

    // TODO: contents should be diff, not full file
    // Should be validated for size
    // Should be throttled before updating S3 (or use an S3 mount)
    socket.on("updateContent", async ({ path: filePath, content }: { path: string, content: string }) => {
        const fullPath =  `/workspace/${filePath}`;
        await saveFile(fullPath, content);
        await saveToS3(`code/${replId}`, filePath, content);
    });

    socket.on("requestTerminal", async () => {
        console.log(`[WS] requestTerminal from socket.id=${socket.id}`);
        terminalManager.createPty(socket.id, replId, (data, id) => {
            const buf = Buffer.from(data,"utf-8");
            console.log(`[WS] Sending terminal data to client: ${buf.length} bytes, preview: ${JSON.stringify(data.substring(0, 80))}`);
            socket.emit('terminal', {
                data: buf
            });
        });
    });
    
    socket.on("terminalData", async ({ data }: { data: string, terminalId: number }) => {
        console.log(`[WS] Received terminalData from client: ${JSON.stringify(data)}`);
        terminalManager.write(socket.id, data);
    });

    socket.on("terminalResize", ({ cols, rows }: { cols: number, rows: number }) => {
        terminalManager.resize(socket.id, cols, rows);
    });

    socket.on("saveAll", async (callback) => {
        console.log(`[WS] saveAll requested from client socket.id=${socket.id} for replId=${replId}`);
        try {
            await saveFolderToS3("/workspace", `code/${replId}`);
            if (typeof callback === "function") callback({ success: true });
        } catch (err: any) {
            console.error("[WS] saveAll error:", err);
            if (typeof callback === "function") callback({ success: false, error: err?.message });
        }
    });

}