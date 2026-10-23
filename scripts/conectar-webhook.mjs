// Conecta el webhook de WhatsApp al Worker, sin pasar por la pantalla de Meta.
// 1) Suscribe la app al objeto whatsapp_business_account (campo "messages") con la URL y la palabra de verificación.
// 2) Suscribe la cuenta de WhatsApp a la app, para que le lleguen los avisos.
// Uso: WORKER_URL=https://transcriptor-whatsapp.<tu-subdominio>.workers.dev node scripts/conectar-webhook.mjs
// Lee META_APP_ID, META_APP_SECRET, WHATSAPP_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID y WHATSAPP_VERIFY_TOKEN
// del entorno o de .dev.vars. No imprime ningún secreto.
import { existsSync, readFileSync } from 'node:fs';

const env = { ...leerDevVars(), ...process.env };
for (const k of ['WORKER_URL', 'META_APP_ID', 'META_APP_SECRET', 'WHATSAPP_TOKEN', 'WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_VERIFY_TOKEN']) {
  if (!env[k]) throw new Error(`falta ${k}`);
}

const GRAPH = 'https://graph.facebook.com/v25.0';
const appToken = `${env.META_APP_ID}|${env.META_APP_SECRET}`;

function leerDevVars() {
  if (!existsSync('.dev.vars')) return {};
  return Object.fromEntries(
    readFileSync('.dev.vars', 'utf8').split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
}

async function llamar(metodo, ruta, token, params = {}) {
  const res = await fetch(`${GRAPH}/${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: metodo === 'GET' ? undefined : new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${ruta}: ${data.error?.message}`);
  return data;
}

await llamar('POST', `${env.META_APP_ID}/subscriptions`, appToken, {
  object: 'whatsapp_business_account',
  callback_url: env.WORKER_URL,
  verify_token: env.WHATSAPP_VERIFY_TOKEN,
  fields: 'messages',
  include_values: 'true',
});
console.log(`Webhook de la app → ${env.WORKER_URL} (campo messages)`);

await llamar('POST', `${env.WHATSAPP_BUSINESS_ACCOUNT_ID}/subscribed_apps`, env.WHATSAPP_TOKEN);
console.log('Cuenta de WhatsApp suscrita a la app');
