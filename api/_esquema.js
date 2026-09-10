// api/_esquema.js — la ÚNICA definición del esquema de leads.
//
// Vive como módulo y no como archivo .sql suelto a propósito: un .sql que hay
// que aplicar a mano desde una consola es un .sql que termina diciendo algo
// distinto de lo que hay en la base. Acá lo aplica el propio código, es
// idempotente, y no existe una segunda copia con la que pueda divergir.
//
// La base es la del proyecto del sitio, NO la del producto: el sitio público
// nunca escribe en producción (PLAN_SITIO_WEB §7.2).

export const ESQUEMA = [
  `create table if not exists leads (
     id          bigint generated always as identity primary key,
     creado_en   timestamptz not null default now(),
     nombre      text        not null,
     telefono    text        not null,
     taller      text,
     correo      text,
     mensaje     text,
     origen      text,
     user_agent  text
   )`,
  `create index if not exists leads_creado_en_idx on leads (creado_en desc)`,
  // El formulario de descarga de plantillas pide nombre y correo, no teléfono:
  // exigir un número para bajar una hoja imprimible ahuyenta justo al taller
  // que todavía no quiere hablar con nadie. El handler exige que venga UNO de
  // los dos, así que un lead nunca queda sin forma de contacto.
  `alter table leads alter column telefono drop not null`,
]

/** Deja la base lista. Idempotente: se puede llamar siempre sin efecto extra. */
export async function asegurarEsquema(sql) {
  for (const sentencia of ESQUEMA) await sql(sentencia)
}
