// api/wa.js — la puerta de WhatsApp. Redirige a wa.me con el número de ventas.
//
// Por qué un redirector y no un `href="https://wa.me/506…"` escrito en el HTML:
// el número quedaría copiado en ocho páginas estáticas y cambiarlo sería un
// commit y un despliegue. Acá vive en UNA variable de entorno, se cambia desde
// Vercel sin tocar el repositorio, y el sitio puede publicar el botón antes de
// que el número exista.
//
// Y sobre todo: si la variable NO está puesta, esto NO deja al taller en una
// pantalla rota ni lo manda a un chat que nadie lee. Lo manda al formulario,
// que sí funciona. Un botón que promete atención y no la entrega es peor que
// no tener el botón — es exactamente la falla que este trabajo vino a cerrar.
//
// OJO con el número: NO sirve el de la Cloud API. Un número registrado en la
// Cloud API no se puede usar en la app de WhatsApp Business, y nuestro webhook
// ignora a propósito los mensajes entrantes
// (`app/api/whatsapp/webhook/route.ts`). Escribirle a ese número es escribirle
// a nadie. Acá va un número que una persona mira.
//
// Variables de entorno:
//   WHATSAPP_VENTAS  — solo dígitos, con código de país. Ej: 50688888888
//   WHATSAPP_SALUDO  — opcional, el texto con el que abre el chat

const SALUDO_POR_DEFECTO = 'Hola, quiero ver Integra Núcleo para mi taller.'

export default function handler(req, res) {
  const numero = (process.env.WHATSAPP_VENTAS || '').replace(/\D/g, '')

  if (!numero) {
    res.setHeader('Location', '/contacto')
    res.statusCode = 302   // temporal: el día que haya número, deja de aplicar
    return res.end()
  }

  const saludo = process.env.WHATSAPP_SALUDO || SALUDO_POR_DEFECTO
  res.setHeader('Location', `https://wa.me/${numero}?text=${encodeURIComponent(saludo)}`)
  // Nunca 301 ni cacheable: el número puede cambiar y un 301 se queda pegado
  // en el navegador del taller para siempre.
  res.setHeader('Cache-Control', 'no-store')
  res.statusCode = 302
  res.end()
}
