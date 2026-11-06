import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = fileURLToPath(new URL('../', import.meta.url));
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
export function crearServidor() {
    return createServer(async (peticion, respuesta) => {
        try {
            if (!['GET', 'HEAD'].includes(peticion.method)) {
                respuesta.writeHead(405).end();
                return;
            }
            const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
            const archivo = resolve(raiz, `.${ruta === '/' ? '/index.html' : ruta}`);
            if (!archivo.startsWith(raiz.endsWith(sep) ? raiz : raiz + sep) || !tipos[extname(archivo)] || ruta.split(/[\\/]/).some((parte) => parte.startsWith('.'))) {
                respuesta.writeHead(403).end();
                return;
            }
            const bytes = await readFile(archivo);
            respuesta.writeHead(200, { 'Content-Type': tipos[extname(archivo)], 'Cache-Control': 'no-store' });
            respuesta.end(peticion.method === 'HEAD' ? undefined : bytes);
        } catch {
            respuesta.writeHead(404).end('Archivo no encontrado');
        }
    });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const servidor = crearServidor();
    servidor.listen(8080, '127.0.0.1', () => console.log('Tienda local: http://127.0.0.1:8080'));
    servidor.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
}