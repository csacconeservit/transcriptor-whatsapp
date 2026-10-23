// Transcriptor de audios de WhatsApp (Meta Cloud API + Whisper en Workers AI).
// GET: Meta verifica el webhook. POST: llega un mensaje; si es un audio, se transcribe
// y se responde en el mismo chat citando el audio.
//
// El webhook le contesta 200 a Meta enseguida (si tardamos, reintenta) y deja el audio en una cola.
// La transcripción corre en el consumidor de la cola, que tiene hasta 15 minutos: un audio de
// 5 minutos tarda ~55 s, más que los 30 s que Cloudflare da para seguir trabajando tras responder.
//
// No se retiene nada: no hay base, ni archivos, ni caché. Por la cola pasan solo tres ids
// (quién mandó, el mensaje y el audio), que se borran al procesarse. El audio y el texto viven
// solo en la memoria del consumidor. Los logs nunca llevan teléfonos, ids, nombres ni texto:
// solo tipos, tamaños y tiempos. Ver PRIVACIDAD.md.
import { transcribir, type EnvIA } from './transcribir';
import { bajarMedio, firmaValida, GRAPH, leidoYEscribiendo, responderTexto, type Cfg } from './whatsapp';

// Lo que viaja por la cola: ids, nunca el audio ni el texto.
type Pedido = { de: string; mensaje: string; audio: string };

interface Env extends EnvIA {
  COLA: Queue<Pedido>;
  WHATSAPP_TOKEN: string;
  WHATSAPP_PHONE_ID: string;
  META_APP_SECRET: string;
  WHATSAPP_VERIFY_TOKEN: string;
  GRAPH_URL?: string; // solo para la prueba de punta a punta (prueba/meta-falsa.mjs)
  // Los pone el despliegue de GitHub Actions: qué repositorio y qué commit corre acá.
  CODIGO?: string;
  VERSION?: string;
}

// WhatsApp corta los textos en 4096 caracteres.
const LARGO_MAXIMO = 4000;

const cfgDe = (env: Env): Cfg => ({ token: env.WHATSAPP_TOKEN, phoneId: env.WHATSAPP_PHONE_ID, graph: env.GRAPH_URL || GRAPH });

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // Cualquiera puede ver de qué commit del repositorio público sale lo que corre.
    if (req.method === 'GET' && !url.searchParams.has('hub.mode')) {
      return Response.json({ codigo: env.CODIGO ?? null, version: env.VERSION ?? 'local' });
    }
    if (req.method === 'GET') {
      const ok = url.searchParams.get('hub.mode') === 'subscribe' &&
        !!env.WHATSAPP_VERIFY_TOKEN &&
        url.searchParams.get('hub.verify_token') === env.WHATSAPP_VERIFY_TOKEN;
      return ok ? new Response(url.searchParams.get('hub.challenge') ?? '') : new Response('no', { status: 403 });
    }
    if (req.method !== 'POST') return new Response('no', { status: 405 });

    const cuerpo = await req.text();
    if (!(await firmaValida(cuerpo, req.headers.get('x-hub-signature-256'), env.META_APP_SECRET))) {
      console.warn('firma inválida');
      return new Response('firma inválida', { status: 401 });
    }

    let aviso: any;
    try {
      aviso = JSON.parse(cuerpo);
    } catch {
      return new Response('json inválido', { status: 400 });
    }
    ctx.waitUntil(procesar(aviso, env).catch((e) => console.error('procesar:', e instanceof Error ? e.message : 'error')));
    return new Response('ok');
  },

  async queue(lote: MessageBatch<Pedido>, env: Env): Promise<void> {
    for (const msg of lote.messages) {
      try {
        await transcribirYResponder(msg.body, cfgDe(env), env);
        msg.ack();
      } catch (e) {
        console.error('cola:', e instanceof Error ? e.message : 'error');
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env, Pedido>;

async function procesar(aviso: any, env: Env) {
  const cfg = cfgDe(env);
  for (const entry of aviso.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      for (const m of v.messages ?? []) await recibir(m, cfg, env);
      for (const s of v.statuses ?? []) {
        if (s.status === 'failed') console.warn('mensaje no entregado', (s.errors ?? []).map((e: any) => e.code).join(','));
      }
    }
  }
}

async function recibir(m: any, cfg: Cfg, env: Env) {
  const de = String(m.from);
  if (m.type === 'audio') {
    await leidoYEscribiendo(cfg, m.id);
    await env.COLA.send({ de, mensaje: m.id, audio: m.audio.id });
  } else if (m.type === 'text') {
    await responderTexto(cfg, de, m.id, 'Mandame o reenviame un audio y te lo paso a texto.');
  }
}

async function transcribirYResponder(p: Pedido, cfg: Cfg, env: Env) {
  let respuesta: string;
  try {
    const { bytes, tipo } = await bajarMedio(cfg, p.audio);
    const inicio = Date.now();
    const texto = await transcribir(bytes, env);
    console.log(`audio (${tipo}, ${bytes.byteLength} bytes) transcripto en ${Date.now() - inicio} ms`);
    respuesta = texto ? `📝 ${texto}` : '📝 (no se entendió nada en el audio)';
  } catch (e) {
    console.error('transcribir:', e instanceof Error ? e.message : 'error');
    respuesta = 'No pude transcribir este audio. Probá mandarlo de nuevo en un rato.';
  }
  for (const parte of partir(respuesta)) await responderTexto(cfg, p.de, p.mensaje, parte);
}

// Corta en pedazos que entren en un mensaje, prefiriendo cortar entre oraciones.
export function partir(texto: string): string[] {
  const partes: string[] = [];
  let resto = texto;
  while (resto.length > LARGO_MAXIMO) {
    const corte = resto.lastIndexOf('. ', LARGO_MAXIMO);
    const en = corte > LARGO_MAXIMO / 2 ? corte + 1 : LARGO_MAXIMO;
    partes.push(resto.slice(0, en).trim());
    resto = resto.slice(en);
  }
  if (resto.trim()) partes.push(resto.trim());
  return partes;
}
