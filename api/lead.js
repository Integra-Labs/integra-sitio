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

function redirigir(res, destino) {
  res.statusCode = 303
  res.setHeader('Location', destino)
  res.end()
}

/** Página de error mínima, servida desde la función porque no hay build. */
function error(res, codigo, mensaje) {
  res.statusCode = codigo
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(`<!doctype html><html lang="es-CR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>No se pudo enviar — Integra Núcleo</title>
<link rel="stylesheet" href="/styles.css"></head><body>
<main><div class="env texto" style="padding-top:4rem">
<h1>No se pudo enviar</h1><p class="sub">${mensaje}</p>
<div class="acciones"><a class="btn btn-1" href="/contacto">Volver al formulario</a></div>
</div></main></body></html>`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return error(res, 405, 'Este formulario solo acepta envíos.')

  const cuerpo = req.body ?? {}

  // Campo trampa: está oculto por CSS, así que una persona nunca lo llena.
  // Si viene con algo, es un bot. Se responde como si todo hubiera salido
  // bien —no se le avisa al bot que fue detectado— y no se guarda nada.
  if (limpiar(cuerpo.sitio_web, 100)) return redirigir(res, '/gracias')

  const nombre   = limpiar(cuerpo.nombre,   LIMITES.nombre)
  const telefono = limpiar(cuerpo.telefono, LIMITES.telefono)
  if (!nombre || !telefono) {
    return error(res, 400, 'Hacen falta el nombre y el teléfono para poder contestarle.')
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
        ${limpiar(cuerpo.correo,  LIMITES.correo)},
        ${limpiar(cuerpo.mensaje, LIMITES.mensaje)},
        ${limpiar(req.headers.referer, 300)},
        ${limpiar(req.headers['user-agent'], 300)}
      )`
    return redirigir(res, '/gracias')
  } catch (e) {
    // Nunca se pierde en silencio: queda en los registros de la función con el
    // dato suficiente para recuperar el contacto a mano si hiciera falta.
    console.error('lead: falló la inserción', { nombre, telefono, error: String(e) })
    return error(res, 500, 'Algo falló de nuestro lado. Intente de nuevo en un momento.')
  }
}
