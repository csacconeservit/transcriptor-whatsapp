// Meta Cloud API: firma de los avisos, bajar un audio y mandar texto.
// La firma y los formatos de número salen de salon-fiestas/supabase/functions/_shared/whatsapp.ts.
export const GRAPH = 'https://graph.facebook.com/v25.0';

// graph: la API de Meta; en la prueba de punta a punta apunta a una Meta falsa local.
export type Cfg = { token: string; phoneId: string; graph: string };

// Meta firma cada aviso con el secreto de la app: X-Hub-Signature-256: sha256=<hex>.
export async function firmaValida(cuerpo: string, firma: string | null, secreto: string): Promise<boolean> {
  if (!firma?.startsWith('sha256=') || !secreto) return false;
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo)));
  const esperado = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  const recibido = firma.slice(7).toLowerCase();
  if (recibido.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ recibido.charCodeAt(i);
  return dif === 0;
}

// El audio llega como un id: primero se pide la URL y después se baja con el mismo token.
export async function bajarMedio(cfg: Cfg, mediaId: string): Promise<{ bytes: ArrayBuffer; tipo: string }> {
  const info = await fetch(`${cfg.graph}/${mediaId}`, { headers: { Authorization: `Bearer ${cfg.token}` } });
  const data: any = await info.json();
  if (!info.ok) throw new Error(`pedir media: ${data.error?.message}`);
  const res = await fetch(data.url, { headers: { Authorization: `Bearer ${cfg.token}` } });
  if (!res.ok) throw new Error(`bajar media: ${res.status}`);
  return { bytes: await res.arrayBuffer(), tipo: data.mime_type ?? '' };
}

// Los números de Argentina llegan como 549 + característica + número, pero el número de prueba de Meta
// solo acepta enviar al formato en que se cargó en la lista permitida: a veces sin el 9, y a veces
// con el 15 después de la característica (de 2, 3 o 4 dígitos). Se prueban en orden.
export function variantes(telefono: string): string[] {
  if (!telefono.startsWith('549')) return [telefono];
  const resto = telefono.slice(3);
  return [telefono, '54' + resto, ...[2, 3, 4].map((n) => '54' + resto.slice(0, n) + '15' + resto.slice(n))];
}

// Manda un texto como respuesta citando el mensaje original (queda "colgado" del audio).
export async function responderTexto(cfg: Cfg, telefono: string, citaId: string, body: string): Promise<void> {
  let ultimo = '';
  for (const to of variantes(telefono)) {
    const res = await fetch(`${cfg.graph}/${cfg.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        context: { message_id: citaId },
        type: 'text',
        text: { body, preview_url: false },
      }),
    });
    if (res.ok) return;
    const data: any = await res.json();
    ultimo = `${data.error?.code}: ${data.error?.message}`;
    if (data.error?.code !== 131030) break; // 131030 = el número no está en la lista permitida
  }
  // Sin el teléfono: los logs no llevan nada que identifique a nadie.
  throw new Error(`no se pudo responder: ${ultimo}`);
}

// Marca como leído y muestra "escribiendo…" mientras se transcribe. Si falla, no importa.
export async function leidoYEscribiendo(cfg: Cfg, messageId: string): Promise<void> {
  await fetch(`${cfg.graph}/${cfg.phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
      typing_indicator: { type: 'text' },
    }),
  }).catch(() => {});
}
