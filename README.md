# Transcriptor de audios de WhatsApp

Le mandás o reenviás un audio a un número de WhatsApp y te responde con el texto, citando el audio.

- **WhatsApp**: Meta Cloud API (API oficial).
- **Transcripción**: Whisper (`whisper-large-v3-turbo`) en Cloudflare Workers AI, ~US$0,0005 por minuto de audio.
- **Servidor**: un Cloudflare Worker con una cola. No hay máquina que mantener.
- **Privacidad**: no guarda nada, y se puede verificar qué versión corre. Ver [PRIVACIDAD.md](PRIVACIDAD.md).
- **Licencia**: [AGPL-3.0](LICENSE). Quien lo ofrezca como servicio con cambios tiene que publicarlos.

## Cómo funciona

```
Meta ──aviso firmado──▶ Worker (fetch) ──ids──▶ Cola ──▶ Worker (queue)
                          │ 200 enseguida                 │ baja el audio de Meta
                          │                               │ Whisper en Workers AI
                          ◀───────────── responde citando el audio ─┘
```

El webhook contesta enseguida y deja el audio en la cola. El consumidor de la cola tiene hasta
15 minutos por audio (5 minutos de audio tardan ~55 s).

## Puesta en marcha

1. **Meta**: en developers.facebook.com, crear una app de tipo Business y agregarle el producto WhatsApp.
   Anotar el *Phone number ID*, el *WhatsApp Business Account ID*, el *App ID* y el *App secret*.
   Generar un token permanente de usuario de sistema con los permisos `whatsapp_business_messaging`
   y `whatsapp_business_management`.
2. **Cloudflare**: `npx wrangler login` y crear la cola: `npx wrangler queues create transcriptor-audios`.
3. **Secretos**: uno por uno:
   ```
   npx wrangler secret put WHATSAPP_TOKEN
   npx wrangler secret put WHATSAPP_PHONE_ID
   npx wrangler secret put META_APP_SECRET
   npx wrangler secret put WHATSAPP_VERIFY_TOKEN   # una palabra cualquiera, larga
   ```
4. **Publicar**: con push a `main`, GitHub Actions lo despliega solo. Antes hay que cargar los secretos
   `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en el repositorio. A mano: `npm run deploy`.
   La URL queda en `https://transcriptor-whatsapp.<subdominio>.workers.dev`.
5. **Conectar el webhook**: copiar `.dev.vars.example` a `.dev.vars`, completarlo (con la URL del paso 4
   en `WORKER_URL`) y ejecutar `npm run conectar`.
6. **Probar**: mandar un audio al número. Con `npm run logs` se ve en vivo lo que pasa.

Con el número de prueba de Meta, el teléfono que manda tiene que estar en la lista de números permitidos.

## Pruebas

- **Solo la transcripción**: `npm run probar` y en otra terminal
  `curl --data-binary @audio.ogg http://127.0.0.1:8788`.
- **De punta a punta, sin Meta**: `npm run probar:worker` y en otra terminal `npm run probar:punta -- audio.ogg`.
  Una Meta falsa local firma los avisos, sirve el audio y controla las respuestas. Ejercita el
  webhook, la firma, la cola, Whisper y el corte de textos largos.

Las dos usan Workers AI de verdad: hace falta `npx wrangler login` y se cobra lo mismo que en producción.

## Límites

- Si Meta reenvía un mismo aviso, el audio se transcribe dos veces. No se evita porque haría falta guardar los ids.
- El plan gratis de Cloudflare incluye 10.000 operaciones de cola por día (unos 3.300 audios).
