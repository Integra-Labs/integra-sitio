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
// 3. Rescata los leads de los que nadie se enteró. El aviso del formulario
//    puede fallar —el proveedor de correo caído cinco minutos alcanza— y un
//    aviso fallido deja el lead exactamente igual que antes de que existiera
//    este trabajo: guardado y mudo. `notificado_en is null` los enumera, y acá
//    se reintenta una vez al día. Sin esto la columna sería un dato que nadie
//    mira, que es la forma en que esta falla se instaló la primera vez.
//
// NO devuelve el conteo de leads: es un endpoint público y cuántos clientes
// potenciales tiene el negocio no es información pública.

import { neon } from '@neondatabase/serverless'
import { asegurarEsquema } from './_esquema.js'
import { avisar } from './lead.js'

/** Tope por corrida: si algo se rompió por días, no se manda un aluvión. */
const RESCATE_MAX = 20

export default async function handler(_req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL)
    await asegurarEsquema(sql)
    await sql`select 1`

    const pendientes = await sql`
      select id, nombre, telefono, taller, correo, mensaje, origen
      from leads
      where notificado_en is null
      order by creado_en asc
      limit ${RESCATE_MAX}`

    let rescatados = 0
    for (const lead of pendientes) {
      if (await avisar(lead)) {
        await sql`update leads set notificado_en = now() where id = ${lead.id}`
        rescatados++
      }
    }
    if (pendientes.length) {
      console.warn(`mantener-viva: ${pendientes.length} leads sin avisar, ${rescatados} rescatados`)
    }

    // El conteo NO va en la respuesta, por lo mismo de arriba.
    res.status(200).json({ ok: true })
  } catch (e) {
    console.error('mantener-viva: falló', String(e))
    res.status(500).json({ ok: false })
  }
}
