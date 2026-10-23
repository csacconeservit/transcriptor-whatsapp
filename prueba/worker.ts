// Worker solo para probar la transcripción sin pasar por WhatsApp: recibe los bytes de un audio
// por POST y devuelve el texto. No se publica: corre con `npm run probar` y
// curl --data-binary @audio.ogg http://localhost:8788
import { transcribir, type EnvIA } from '../src/transcribir';

export default {
  async fetch(req: Request, env: EnvIA): Promise<Response> {
    if (req.method !== 'POST') return new Response('mandá un audio por POST', { status: 405 });
    const inicio = Date.now();
    const texto = await transcribir(await req.arrayBuffer(), env);
    return Response.json({ texto, ms: Date.now() - inicio });
  },
} satisfies ExportedHandler<EnvIA>;
