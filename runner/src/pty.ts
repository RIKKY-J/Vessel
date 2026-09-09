//@ts-ignore => someone fix this
import { fork, IPty } from 'node-pty';
import path from "path";

const SHELL = "bash";

export class TerminalManager {
    private sessions: { [id: string]: {terminal: IPty, replId: string;} } = {};

    constructor() {
        this.sessions = {};
    }
    
    createPty(id: string, replId: string, onData: (data: string, id: number) => void) {
        // Kill existing PTY for this socket ID if one exists
        if (this.sessions[id]) {
            console.log(`[PTY] Killing existing PTY for socket ${id} before creating new one`);
            try {
                this.sessions[id].terminal.kill();
            } catch (e) {
                console.warn("[PTY] Error killing existing PTY:", e);
            }
            delete this.sessions[id];
        }

        console.log(`[PTY] Creating new PTY for socket ${id}, replId=${replId}`);
        let term = fork(SHELL, [], {
            cols: 100,
            name: 'xterm',
            cwd: `/workspace`
        });
        console.log(`[PTY] PTY created with pid=${term.pid}`);
    
        term.on('data', (data: string) => onData(data, term.pid));
        this.sessions[id] = {
            terminal: term,
            replId
        };
        term.on('exit', () => {
            console.log(`[PTY] PTY exited for socket ${id}, pid=${term.pid}`);
            delete this.sessions[id];
        });
        return term;
    }

    write(terminalId: string, data: string) {
        const session = this.sessions[terminalId];
        if (!session) {
            console.warn(`[PTY] write: No session found for terminalId=${terminalId}. Active sessions: [${Object.keys(this.sessions).join(', ')}]`);
            return;
        }
        session.terminal.write(data);
    }

    clear(terminalId: string) {
        this.sessions[terminalId].terminal.kill();
        delete this.sessions[terminalId];
    }
}
