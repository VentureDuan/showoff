// Local-only visual prototype. No dependencies, database, or external requests.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(await readFile(new URL('./index.html', import.meta.url)));
}).listen(4321, '127.0.0.1', () => console.log('视觉原型：http://127.0.0.1:4321/?variant=A'));
