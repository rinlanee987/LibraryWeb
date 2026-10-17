// src/server.ts
import { createServer } from 'node:http';
import path from 'node:path';
import { Router } from './http/Router.ts';
import type { RequestContext } from './http/Router.ts';
import { StaticServer } from './http/StaticServer.ts';
import { LibraryService } from './services/LibraryService.ts';
import type { Result } from './types.ts';

const PORT = Number(process.env.PORT ?? 3000);
const library = new LibraryService();
library.seedIfEmpty();

const router = new Router();
const staticServer = new StaticServer(path.join(import.meta.dirname, '..', 'public'));

// ส่งผลลัพธ์แบบ [data, error] กลับไปยังผู้ใช้งาน
function reply<T>(ctx: RequestContext, [data, error]: Result<T>, okStatus = 200): void {
    if (error) ctx.error(error.message, error.status);
    else ctx.json(data, okStatus);
}

// ---------- สถิติ ----------
router.get('/api/stats', (ctx) => ctx.json(library.getStats()));

// ---------- ทรัพยากร ----------
router.get('/api/items', (ctx) => ctx.json(library.getItems(ctx.query.get('q') ?? '')));
router.post('/api/items', async (ctx) => {
    const b = await ctx.body();
    reply(
        ctx,
        library.addItem({
            type: String(b.type ?? ''),
            title: String(b.title ?? ''),
            author: String(b.author ?? ''),
            year: Number(b.year),
            extra: String(b.extra ?? '')
        }),
        201
    );
});
router.delete('/api/items/:id', (ctx) => reply(ctx, library.deleteItem(Number(ctx.params.id))));

// ---------- สมาชิก ----------
router.get('/api/members', (ctx) => ctx.json(library.getMembers()));
router.post('/api/members', async (ctx) => {
    const b = await ctx.body();
    reply(ctx, library.addMember({ type: String(b.type ?? ''), name: String(b.name ?? ''), email: String(b.email ?? '') }), 201);
});
router.delete('/api/members/:id', (ctx) => reply(ctx, library.deleteMember(Number(ctx.params.id))));

// ---------- ยืม-คืน ----------
router.get('/api/loans', (ctx) => ctx.json(library.getLoans(ctx.query.get('active') === '1')));
router.post('/api/loans', async (ctx) => {
    const b = await ctx.body();
    reply(ctx, library.borrow(Number(b.itemId), Number(b.memberId)), 201);
});
router.post('/api/loans/:id/return', (ctx) => reply(ctx, library.returnItem(Number(ctx.params.id))));

createServer(async (req, res) => {
    try {
        const handled = await router.handle(req, res);
        if (!handled) await staticServer.serve(req, res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ message: 'เกิดข้อผิดพลาดภายในระบบ' }));
        }
    }
}).listen(PORT, () => {
    console.log(`📚 Library Web พร้อมใช้งานที่ http://localhost:${PORT}`);
});
