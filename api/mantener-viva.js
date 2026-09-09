// api/mantener-viva.js — mantiene despierta la base y asegura su esquema.
//
// Dos razones para que exista:
//
// 1. Un Postgres serverless en capa gratuita se suspende por inactividad, y un
//    formulario de bajo tráfico lo garantiza: pasan días sin un lead, la base
//    se duerme, y el primero que llega se encuentra una base fría. Un cron
//    diario (vercel.json) la toca para que eso no pase.
//
// 2. Aplica el esquema de forma idempotente. Así la tabla nace del código
//    desplegado y no de que alguien se acuerde de correr un .sql a mano.
//
// NO devuelve el conteo de leads: es un endpoint público y cuántos clientes
// potenciales tiene el negocio no es información pública.

import { neon } from '@neondatabase/serverless'
import { asegurarEsquema } from './_esquema.js'

export default async function handler(_req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL)
    await asegurarEsquema(sql)
    await sql`select 1`
    res.status(200).json({ ok: true })
  } catch (e) {
    console.error('mantener-viva: falló', String(e))
    res.status(500).json({ ok: false })
  }
}
