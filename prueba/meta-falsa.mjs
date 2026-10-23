// Prueba de punta a punta sin Meta: hace de Meta para el Worker corriendo en local.
// 1) Levanta una API de Graph falsa que sirve el audio y anota lo que el Worker manda.
// 2) Le manda al Worker avisos firmados como los de Meta: un audio y un texto.
// 3) Espera las respuestas y controla que citen el mensaje correcto.
// Uso (dos terminales):  npm run probar:worker   y   npm run probar:punta -- <audio.ogg>
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const WORKER = 'http://127.0.0.1:8787';
const PUERTO = 8790;
const SECRETO = 'secreto-de-prueba'; // el mismo que recibe el Worker en package.json
const archivo = process.argv[2];
if (!archivo) throw new Error('falta la ruta de un audio');
const audio = readFileSync(archivo);

const enviados = [];
createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (d) => (cuerpo += d)).on('end', () => {
    const url = new URL(req.url, `http://127.0.0.1:${PUERTO}`);
    if (req.method === 'GET' && url.pathname === '/archivo') {
      res.writeHead(200, { 'Content-Type': 'audio/ogg' });
      return res.end(audio);
    }
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ url: `http://127.0.0.1:${PUERTO}/archivo`, mime_type: 'audio/ogg; codecs=opus' }));
    }
    const m = JSON.parse(cuerpo);
    if (m.type === 'text') enviados.push(m);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages: [{ id: 'wamid.respuesta' }] }));
  });
}).listen(PUERTO);

async function avisar(mensaje, firma) {
  const cuerpo = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'messages', value: { messages: [mensaje] } }] }],
  });
  const res = await fetch(WORKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': firma ?? 'sha256=' + createHmac('sha256', SECRETO).update(cuerpo).digest('hex') },
    body: cuerpo,
  });
  return res.status;
}

const fallas = [];
const controlar = (ok, que) => (ok ? console.log('  ok   ', que) : (fallas.push(que), console.log('  FALLA', que)));

controlar((await fetch(`${WORKER}/?hub.mode=subscribe&hub.verify_token=palabra-de-prueba&hub.challenge=123`).then((r) => r.text())) === '123', 'verificación del webhook');
controlar((await avisar({ from: '5491100000000', id: 'wamid.x', type: 'text', text: { body: 'hola' } }, 'sha256=00')) === 401, 'rechaza un aviso sin firma válida');
controlar((await avisar({ from: '5491100000000', id: 'wamid.audio', type: 'audio', audio: { id: 'media.1' } })) === 200, 'acepta el aviso del audio');
controlar((await avisar({ from: '5491100000000', id: 'wamid.texto', type: 'text', text: { body: 'hola' } })) === 200, 'acepta el aviso del texto');

const limite = Date.now() + 170_000;
while (Date.now() < limite && !enviados.some((m) => m.context?.message_id === 'wamid.audio')) {
  await new Promise((ok) => setTimeout(ok, 500));
}
const alAudio = enviados.filter((m) => m.context?.message_id === 'wamid.audio');
const alTexto = enviados.filter((m) => m.context?.message_id === 'wamid.texto');
controlar(alTexto.length === 1 && alTexto[0].text.body.includes('audio'), 'al texto le contesta que mande un audio');
controlar(alAudio.length >= 1 && alAudio[0].text.body.startsWith('📝'), 'al audio le contesta con la transcripción citándolo');
controlar(alAudio.every((m) => m.text.body.length <= 4096), 'ningún mensaje pasa los 4096 caracteres');
for (const m of alAudio) console.log(`\n  → ${m.text.body.length} caracteres: ${m.text.body.slice(0, 160)}…`);

console.log(fallas.length ? `\n${fallas.length} fallas` : '\nTodo bien');
process.exit(fallas.length ? 1 : 0);
