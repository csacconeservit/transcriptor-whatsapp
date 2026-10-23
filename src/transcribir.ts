// Whisper en Workers AI. El audio va en base64 y no queda guardado en ningún lado.
import { Buffer } from 'node:buffer';

export type EnvIA = { AI: Ai; IDIOMA: string; MODELO: string };

export async function transcribir(bytes: ArrayBuffer, env: EnvIA): Promise<string> {
  const entrada: Record<string, unknown> = {
    audio: Buffer.from(bytes).toString('base64'),
    vad_filter: true, // saca los silencios: menos texto inventado en audios con pausas largas
  };
  if (env.IDIOMA) entrada.language = env.IDIOMA;
  const salida: any = await env.AI.run(env.MODELO as any, entrada);
  return String(salida?.text ?? '').trim();
}
