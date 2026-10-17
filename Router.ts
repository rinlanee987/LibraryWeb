// src/http/Router.ts
import type { IncomingMessage, ServerResponse } from 'node:http';

export type Params = Record<string, string>;
export type Handler = (ctx: RequestContext) => Promise<void> | void;

type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler };

/** ข้อมูลของ request หนึ่งครั้ง พร้อมเมธอดช่วยตอบกลับ */
export class RequestContext {
    readonly req: IncomingMessage;
    readonly res: ServerResponse;
    readonly params: Params;
    readonly query: URLSearchParams;

    constructor(req: IncomingMessage, res: ServerResponse, params: Params, query: URLSearchParams) {
        this.req = req;
        this.res = res;
        this.params = params;
        this.query = query;
    }

    async body<T = Record<string, unknown>>(): Promise<T> {
        const chunks: Buffer[] = [];
        for await (const chunk of this.req) chunks.push(chunk as Buffer);
        const text = Buffer.concat(chunks).toString('utf8');
        return (text ? JSON.parse(text) : {}) as T;
    }

    json(data: unknown, status = 200): void {
        this.res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        this.res.end(JSON.stringify(data));
    }

    error(message: string, status = 400): void {
        this.json({ message }, status);
    }
}

/** Router อย่างง่าย รองรับ path parameter เช่น /api/items/:id */
export class Router {
    private routes: Route[] = [];

    private add(method: string, path: string, handler: Handler): this {
        const keys: string[] = [];
        const pattern = new RegExp(
            '^' +
                path.replace(/:(\w+)/g, (_, key: string) => {
                    keys.push(key);
                    return '([^/]+)';
                }) +
                '/?$'
        );
        this.routes.push({ method, pattern, keys, handler });
        return this;
    }

    get(path: string, handler: Handler): this {
        return this.add('GET', path, handler);
    }
    post(path: string, handler: Handler): this {
        return this.add('POST', path, handler);
    }
    delete(path: string, handler: Handler): this {
        return this.add('DELETE', path, handler);
    }

    // คืนค่า true ถ้ามี route ที่ตรง
    async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
        const url = new URL(req.url ?? '/', 'http://localhost');
        for (const route of this.routes) {
            if (route.method !== req.method) continue;
            const match = route.pattern.exec(url.pathname);
            if (!match) continue;
            const params: Params = {};
            route.keys.forEach((key, i) => (params[key] = decodeURIComponent(match[i + 1])));
            await route.handler(new RequestContext(req, res, params, url.searchParams));
            return true;
        }
        return false;
    }
}
