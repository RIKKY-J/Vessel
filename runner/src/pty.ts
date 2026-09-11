import { fork, IPty } from 'node-pty';
import fs from "fs";

const SHELL = fs.existsSync("/bin/bash") ? "/bin/bash" : "bash";

export class TerminalManager {
    private sessions: { [id: string]: { terminal: IPty; replId: string } } = {};

    constructor() {
        this.sessions = {};
    }
    
    createPty(id: string, replId: string, onData: (data: string, id: number) => void, cols: number = 100, rows: number = 24) {
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

        console.log(`[PTY] Creating new PTY (${cols}x${rows}) for socket ${id}, replId=${replId}`);
        const term = fork(SHELL, [], {
            cols: cols || 100,
            rows: rows || 24,
            name: 'xterm-256color',
            cwd: '/workspace',
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                SHELL: SHELL,
                NODE_PATH: process.env.NODE_PATH || '/code/node_modules:/usr/local/lib/node_modules:/workspace/node_modules',
                PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            },
        });
        console.log(`[PTY] PTY created with pid=${term.pid}`);
    
        term.on('data', (data: string) => onData(data, term.pid));
        this.sessions[id] = {
            terminal: term,
            replId
        };
        term.on('exit', (exitCode) => {
            console.log(`[PTY] PTY exited for socket ${id}, pid=${term.pid}, exitCode=${exitCode}`);
            delete this.sessions[id];
        });
        return term;
    }

    write(terminalId: string, data: string) {
        const session = this.sessions[terminalId];
        if (!session) {
            console.warn(`[PTY] write: No session found for terminalId=${terminalId}.`);
            return;
        }
        session.terminal.write(data);
    }

    resize(terminalId: string, cols: number, rows: number) {
        const session = this.sessions[terminalId];
        if (session && session.terminal) {
            try {
                session.terminal.resize(cols, rows);
            } catch (e) {
                console.warn("[PTY] resize error:", e);
            }
        }
    }

    clear(terminalId: string) {
        if (this.sessions[terminalId]) {
            try {
                this.sessions[terminalId].terminal.kill();
            } catch (e) {
                console.warn("[PTY] clear error:", e);
            }
            delete this.sessions[terminalId];
        }
    }
}
