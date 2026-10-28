// Política de privacidad pública (la URL que pide Meta para publicar la app).
// Dice lo mismo que PRIVACIDAD.md; si cambia uno, cambiar el otro.
export const PRIVACIDAD = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TransCripta: privacidad</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.6 system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.6rem; } h2 { font-size: 1.2rem; margin-top: 2rem; }
  table { border-collapse: collapse; width: 100%; font-size: .95rem; }
  th, td { border: 1px solid #8884; padding: .4rem; text-align: left; vertical-align: top; }
</style>
</head>
<body>
<h1>TransCripta: política de privacidad</h1>
<p>TransCripta es un número de WhatsApp que pasa a texto los audios que le mandan o reenvían,
y responde con el texto en el mismo chat. Esta página dice qué datos usa y qué guarda.</p>

<h2>Qué datos usa</h2>
<ul>
  <li>El audio que le mandás, para transcribirlo.</li>
  <li>Tu número de WhatsApp y el id del mensaje, para responderte en el mismo chat.</li>
</ul>
<p>No se usan para ningún otro fin: ni publicidad, ni perfiles, ni entrenar modelos. No se venden ni se comparten.</p>

<h2>Qué guarda: nada</h2>
<ul>
  <li>No hay base de datos, archivos ni caché. El audio y su texto existen solo en la memoria del
    proceso que los transcribe y se descartan al terminar, normalmente en segundos.</li>
  <li>Para transcribir audios largos, cada audio pasa por una cola con tres ids (tu número, el id del
    mensaje y el id del audio en WhatsApp), sin el audio ni el texto. La entrada se borra al procesarse;
    si algo falla se reintenta dos veces y se descarta. Nunca dura más de 24 horas.</li>
  <li>Los registros técnicos no llevan números, ids, nombres ni texto: solo tipo de archivo, tamaño,
    tiempos y códigos de error. No se guardan registros persistentes.</li>
</ul>
<p>El código es abierto (licencia AGPL-3.0) y cualquiera puede comprobar lo que hace. La dirección raíz
de este servicio dice de qué repositorio y de qué versión sale lo que está corriendo.</p>

<h2>Terceros que intervienen</h2>
<table>
  <tr><th>Quién</th><th>Qué</th><th>Cuánto tiempo</th></tr>
  <tr><td>Meta (WhatsApp)</td><td>Los mensajes y el audio, como cualquier mensaje de WhatsApp</td><td>Según los términos de WhatsApp; el audio se puede descargar hasta 7 días</td></tr>
  <tr><td>Cloudflare Workers AI</td><td>El audio y el texto mientras dura la transcripción; no los usa para entrenar</td><td>No los retiene</td></tr>
  <tr><td>Cloudflare Queues</td><td>Los tres ids de cada audio</td><td>Hasta que se procesa; como máximo 24 horas</td></tr>
</table>

<h2 id="borrado">Borrado de datos</h2>
<p>No hay datos tuyos guardados que borrar: el servicio no guarda audios, textos ni números. Para dejar de
usarlo, alcanza con no mandarle más audios o bloquear el número en WhatsApp. Los mensajes del chat
quedan en tu WhatsApp y los podés borrar desde ahí. Si igual querés hacer una consulta o un pedido de
borrado, escribí a <a href="mailto:cesar.saccone@gmail.com">cesar.saccone@gmail.com</a> y te respondemos
en 30 días como máximo.</p>

<h2>Contacto</h2>
<p>César Saccone, <a href="mailto:cesar.saccone@gmail.com">cesar.saccone@gmail.com</a>.</p>

<h2 lang="en">Summary in English</h2>
<p lang="en">TransCripta transcribes WhatsApp voice messages and replies with the text in the same chat.
It stores nothing: no database, files or cache. Audio and text exist only in memory while being processed.
A queue holds only three ids per audio (sender number, message id, media id), deleted once processed and
never kept more than 24 hours. Logs contain no personal data. Data is not used for any other purpose,
not sold and not shared. Data deletion: there is no stored data to delete; to stop using the service,
stop sending audios or block the number. Contact: cesar.saccone@gmail.com.</p>
</body>
</html>`;
