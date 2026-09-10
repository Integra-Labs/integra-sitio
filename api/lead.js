// api/lead.js — recibe el formulario de contacto y guarda el lead.
//
// Sin JavaScript en el navegador: el formulario es un POST de HTML plano y la
// respuesta es una redirección 303. Todo el sitio se lee y se usa con los
// scripts apagados, y el formulario no iba a ser la excepción.
//
// Las credenciales llegan por variable de entorno inyectada por Vercel al
// conectar la base. No están en el repositorio ni viajan al navegador.

import { neon } from '@neondatabase/serverless'
import { asegurarEsquema } from './_esquema.js'

const LIMITES = { nombre: 120, telefono: 40, taller: 160, correo: 160, mensaje: 2000 }

/** Recorta, normaliza espacios y aplica el tope de la columna. */
function limpiar(valor, tope) {
  if (typeof valor !== 'string') return null
  const v = valor.replace(/\s+/g, ' ').trim()
  return v ? v.slice(0, tope) : null
}

// Adónde puede mandar el formulario después de guardar. Es una LISTA BLANCA y
// no un valor libre: un `destino` que se acepte tal cual convierte este
// endpoint en un redirector abierto — cualquiera publica un enlace a nuestro
// dominio que termina en el suyo.
const DESTINOS = new Set(['/gracias', '/plantillas/listas'])

function redirigir(res, destino) {
  res.statusCode = 303
  res.setHeader('Location', destino)
  res.end()
}

/** Escapa para interpolar en HTML. Los valores vienen del POST de quien
 *  envía el formulario y se le devuelven en la página: sin esto, un `<script>`
 *  en el campo del nombre se ejecutaría en su propio navegador. */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

/**
 * Página de error CON EL FORMULARIO YA LLENO.
 *
 * Antes esto devolvía 515 bytes sin encabezado ni pie y, sobre todo, tiraba a
 * la basura lo que la persona había escrito. La validación del navegador
 * atrapa el caso común, así que esta página se alcanza justo cuando algo
 * nuestro falló —la base dormida, por ejemplo— y ahí perder el mensaje es
 * exactamente lo contrario de lo que corresponde.
 *
 * Los valores NO viajan por la URL: se re-imprimen en el cuerpo de la
 * respuesta. Un dato personal en un query string queda en el historial, en los
 * registros del servidor y en el Referer.
 *
 * Duplica el marcado de `contacto.html`. Es deliberado y acotado a cinco
 * campos: la alternativa era un paso de build, y el sitio no tiene ninguno.
 * Si cambian los campos, cambian los dos lados.
 */
function error(res, codigo, mensaje, datos = {}) {
  const v = k => esc(datos[k])
  res.statusCode = codigo
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(`<!doctype html><html lang="es-CR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>No se pudo enviar — Integra Núcleo</title><meta name="robots" content="noindex">
<link rel="preload" href="/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css"></head><body>
<header><div class="env"><div class="barra">
<a class="marca" href="/"><b>Integra Núcleo</b><span>Costa Rica</span></a>
<nav aria-label="Principal"><a href="/funciones">Funciones</a><details class="desplegable" name="menu"><summary>Tipos de taller</summary><div class="desplegable-lista"><a href="/para">Ver los tres</a><a href="/para/taller-general">Taller general</a><a href="/para/centro-de-servicio">Centro de servicio</a><a href="/para/vehiculos-electricos">Eléctricos e híbridos</a></div></details><details class="desplegable" name="menu"><summary>Recursos</summary><div class="desplegable-lista"><a href="/recursos">Todos los recursos</a><a href="/plantillas">Plantillas para imprimir</a><a href="/aria">Cómo funciona nuestra IA</a></div></details><a href="/precios">Precios</a><a href="/contacto" aria-current="page">Contacto</a><a class="entrar" href="https://integranucleo.app">Entrar</a></nav>
</div></div></header>
<main><div class="env texto">
<h1>No se pudo enviar</h1>
<p class="sub">${esc(mensaje)}</p>
<p class="nota">No perdimos nada de lo que escribió: está acá abajo, tal como lo dejó.</p>
<form class="form" method="POST" action="/api/lead">
  <div class="campo"><label for="nombre">Su nombre</label>
    <input id="nombre" name="nombre" type="text" required autocomplete="name" maxlength="120" value="${v('nombre')}"></div>
  <div class="campo"><label for="telefono">Teléfono <span class="ayuda">— teléfono o correo, hace falta uno</span></label>
    <input id="telefono" name="telefono" type="tel" autocomplete="tel" maxlength="40" value="${v('telefono')}"></div>
  <div class="campo"><label for="taller">Nombre del taller <span class="ayuda">— opcional</span></label>
    <input id="taller" name="taller" type="text" autocomplete="organization" maxlength="160" value="${v('taller')}"></div>
  <div class="campo"><label for="correo">Correo <span class="ayuda">— opcional</span></label>
    <input id="correo" name="correo" type="email" autocomplete="email" maxlength="160" value="${v('correo')}"></div>
  <div class="campo"><label for="mensaje">¿En qué le ayudamos? <span class="ayuda">— opcional</span></label>
    <textarea id="mensaje" name="mensaje" maxlength="2000">${v('mensaje')}</textarea></div>
  <div class="trampa" aria-hidden="true"><label for="sitio_web">No llene este campo</label>
    <input id="sitio_web" name="sitio_web" type="text" tabindex="-1" autocomplete="off"></div>
  <input type="hidden" name="destino" value="${v('destino')}">
  <div class="acciones"><button class="btn btn-1" type="submit">Enviar de nuevo</button></div>
</form>
</div></main>
<footer><div class="env">
<p>Integra Núcleo · Integra Labs</p>
<p><a href="/privacidad">Privacidad</a> · <a href="/terminos">Términos</a> · <a href="/contacto">Contacto</a> · <a href="https://integranucleo.app">Entrar al sistema</a></p>
</div></footer></body></html>`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 405, 'Este formulario solo acepta envíos.')

  const cuerpo = req.body ?? {}

  // Campo trampa: está oculto por CSS, así que una persona nunca lo llena.
  // Si viene con algo, es un bot. Se responde como si todo hubiera salido
  // bien —no se le avisa al bot que fue detectado— y no se guarda nada.
  const pedido  = limpiar(cuerpo.destino, 60)
  const destino = DESTINOS.has(pedido) ? pedido : '/gracias'

  if (limpiar(cuerpo.sitio_web, 100)) return redirigir(res, destino)

  const nombre   = limpiar(cuerpo.nombre,   LIMITES.nombre)
  const telefono = limpiar(cuerpo.telefono, LIMITES.telefono)
  const correo   = limpiar(cuerpo.correo,   LIMITES.correo)
  if (!nombre || (!telefono && !correo)) {
    return error(res, 400, 'Hace falta su nombre y una forma de contactarlo: teléfono o correo.', { ...cuerpo, destino })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    await asegurarEsquema(sql)
    await sql`
      insert into leads (nombre, telefono, taller, correo, mensaje, origen, user_agent)
      values (
        ${nombre},
        ${telefono},
        ${limpiar(cuerpo.taller,  LIMITES.taller)},
        ${correo},
        ${limpiar(cuerpo.mensaje, LIMITES.mensaje)},
        ${limpiar(req.headers.referer, 300)},
        ${limpiar(req.headers['user-agent'], 300)}
      )`
    return redirigir(res, destino)
  } catch (e) {
    // Nunca se pierde en silencio: queda en los registros de la función con el
    // dato suficiente para recuperar el contacto a mano si hiciera falta.
    console.error('lead: falló la inserción', { nombre, telefono, error: String(e) })
    return error(res, 500, 'Algo falló de nuestro lado. Intente de nuevo en un momento.', { ...cuerpo, destino })
  }
}
