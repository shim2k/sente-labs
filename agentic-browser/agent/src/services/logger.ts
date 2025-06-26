import * as fs from 'fs';
import * as path from 'path';

export type LogDomain = 'dom_parser' | 'agent' | 'llm' | 'session';

export class Logger {
    private sessionId: string;
    private sessionDir: string;
    private baseLogDir: string = 'logs';
    private logFilePaths: Map<LogDomain, string> = new Map();

    constructor(sessionId: string) {
        this.sessionId = sessionId;
        this.sessionDir = path.join(this.baseLogDir, sessionId);
        this.setupLogDirectory();
        this.initializeLogFiles();
    }

    private setupLogDirectory(): void {
        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }
    }

    private initializeLogFiles(): void {
        const domains: LogDomain[] = ['dom_parser', 'agent', 'llm', 'session'];
        domains.forEach(domain => {
            const logFilePath = path.join(this.sessionDir, `${domain}.log`);
            this.logFilePaths.set(domain, logFilePath);
        });
    }

    private writeToFile(domain: LogDomain, level: string, message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        
        const logEntry = `[${timestamp}] [${level}] [${domain}] ${message}${formattedArgs}\n`;
        const logFilePath = this.logFilePaths.get(domain);
        
        if (logFilePath) {
            fs.appendFileSync(logFilePath, logEntry, 'utf8');
        }
    }

    log(domain: LogDomain, message: string, ...args: any[]): void {
        this.writeToFile(domain, 'LOG', message, ...args);
        console.log(`[${this.sessionId}] [${domain}] ${message}`, ...args);
    }

    error(domain: LogDomain, message: string, ...args: any[]): void {
        this.writeToFile(domain, 'ERROR', message, ...args);
        console.error(`[${this.sessionId}] [${domain}] ${message}`, ...args);
    }

    warn(domain: LogDomain, message: string, ...args: any[]): void {
        this.writeToFile(domain, 'WARN', message, ...args);
        console.warn(`[${this.sessionId}] [${domain}] ${message}`, ...args);
    }

    info(domain: LogDomain, message: string, ...args: any[]): void {
        this.writeToFile(domain, 'INFO', message, ...args);
        console.info(`[${this.sessionId}] [${domain}] ${message}`, ...args);
    }

    debug(domain: LogDomain, message: string, ...args: any[]): void {
        this.writeToFile(domain, 'DEBUG', message, ...args);
        console.debug(`[${this.sessionId}] [${domain}] ${message}`, ...args);
    }
}