// src/http/StaticServer.ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** ส่งไฟล์หน้าเว็บ (HTML / CSS / JS) จากโฟลเดอร์ public */
export class StaticServer {
    private static readonly TYPES: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon'
    };
    private root: string;

    constructor(root: string) {
        this.root = path.resolve(root);
    }

    async serve(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
        const file = path.resolve(this.root, '.' + (pathname === '/' ? '/index.html' : pathname));
        // ป้องกันการอ่านไฟล์นอกโฟลเดอร์ public
        if (!file.startsWith(this.root)) {
            res.writeHead(403).end('Forbidden');
            return;
        }
        try {
            const content = await readFile(file);
            res.writeHead(200, { 'Content-Type': StaticServer.TYPES[path.extname(file)] ?? 'application/octet-stream' });
            res.end(content);
        } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ไม่พบหน้าที่ต้องการ');
        }
    }
}
