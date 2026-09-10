import dotenv from "dotenv"
dotenv.config()
import express from "express";
import { createServer } from "http";
import { initWs } from "./ws";
import cors from "cors";
import { saveFolderToS3 } from "./aws";

const app = express();
app.use(cors());
app.use(express.json());
const httpServer = createServer(app);

app.post("/sync", async (req, res) => {
  const replId = req.body?.replId || process.env.REPL_ID;
  if (!replId) {
    return res.status(400).json({ error: "replId is required" });
  }
  try {
    await saveFolderToS3("/workspace", `code/${replId}`);
    return res.json({ success: true, message: `Synced /workspace to code/${replId}` });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

initWs(httpServer);

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`listening on *:${port}`);
});

const handleGracefulShutdown = async (signal: string) => {
  console.log(`[Runner] Received ${signal}. Starting graceful shutdown...`);
  const replId = process.env.REPL_ID;
  if (replId) {
    try {
      console.log(`[Runner] Persisting /workspace to S3 code/${replId}...`);
      await saveFolderToS3("/workspace", `code/${replId}`);
      console.log(`[Runner] Workspace successfully persisted to S3.`);
    } catch (err) {
      console.error("[Runner] Error persisting workspace on shutdown:", err);
    }
  }
  process.exit(0);
};

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));