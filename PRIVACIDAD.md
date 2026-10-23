# Privacidad: qué se guarda y qué no

## Este código no guarda nada

- No hay base de datos, archivos ni caché. El audio y su texto existen solo en la memoria
  de la ejecución que los procesa y se descartan cuando termina.
- Cada audio pasa por una cola de Cloudflare para poder transcribir audios largos. En la cola
  van solo tres ids: el teléfono que lo mandó, el id del mensaje y el id del audio en Meta.
  No va el audio ni el texto. La entrada se borra cuando se procesa (normalmente en segundos). Si
  algo falla, se reintenta dos veces y después se descarta. Cloudflare no guarda nada más de 24 horas.
- Los logs no llevan teléfonos, ids, nombres ni texto transcripto. Solo registran el tipo de
  archivo, el tamaño, la duración del proceso y los códigos de error.
- Los logs persistentes de Cloudflare están apagados (`observability.enabled: false` en
  `wrangler.jsonc`). Lo que se imprime solo se ve en vivo con `npm run logs`.

Cualquiera puede comprobarlo leyendo `src/`, que son menos de 250 líneas.

## Cómo saber que corre este código

Cada versión se despliega desde este repositorio con GitHub Actions (`.github/workflows/desplegar.yml`),
y el registro de cada despliegue es público. El servicio dice de qué commit sale: una visita a su
URL devuelve `{ "codigo": "<repositorio>", "version": "<commit>" }`.

## Lo que guardan los terceros (fuera de nuestro control)

| Quién | Qué | Cuánto tiempo | Fuente |
|---|---|---|---|
| Cloudflare Workers AI | Audio y texto mientras dura la transcripción. No los usa para entrenar modelos | No los retiene. Guarda metadatos (tiempos, códigos de error) | [Data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/) |
| Cloudflare Queues | Los tres ids de cada audio | Hasta que se procesan; como máximo 24 h | [Queues](https://developers.cloudflare.com/queues/platform/pricing/) |
| Meta (WhatsApp Cloud API) | El audio recibido | Se puede descargar hasta 7 días con su id | [Media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media) |
| Meta (WhatsApp Cloud API) | Los mensajes que pasan por la API, incluida la respuesta con el texto | Según los términos de Meta | Términos de WhatsApp Business |

La garantía de "no retener nada" cubre a este servicio, no a Meta: WhatsApp es el canal y el
mensaje pasa por sus servidores igual que cualquier otro mensaje de WhatsApp.
