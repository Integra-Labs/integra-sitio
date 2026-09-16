// Ninguna página debe correrse de lado en un teléfono.
//
// Dos veces en el mismo sitio: una tabla de 544 px dentro de una caja de 358
// empujaba /precios 136 px, y otra de 446 px empujaba /plantillas/inspeccion-12-puntos
// 93 px a 390 y 163 a 320. Las dos pasaron todos los candados: el <h1> estaba,
// el peso daba, axe no ve un desborde horizontal y Lighthouse tampoco lo falla.
//
// El ancho angosto (320) es el que caza lo que 390 deja pasar.
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:4173'
const ANCHOS = [320, 390]
const RUTAS = ['/', '/funciones', '/para', '/para/taller-general', '/para/centro-de-servicio',
  '/para/vehiculos-electricos', '/recursos', '/recursos/recepcion-sin-reclamos',
  '/recursos/cobrar-la-inspeccion', '/recursos/que-preguntar-antes-de-comprar',
  '/recursos/cuadrar-la-caja', '/plantillas', '/plantillas/orden-de-trabajo',
  '/plantillas/inspeccion-12-puntos', '/precios', '/aria', '/contacto', '/privacidad', '/terminos']

const nav = await chromium.launch()
let fallas = 0
for (const ancho of ANCHOS) {
  const p = await (await nav.newContext({ viewport: { width: ancho, height: 844 } })).newPage()
  for (const ruta of RUTAS) {
    await p.goto(BASE + ruta, { waitUntil: 'networkidle' })
    const d = await p.evaluate(() => {
      const e = document.documentElement
      if (e.scrollWidth <= e.clientWidth + 1) return null
      const W = e.clientWidth
      const culpa = [...document.querySelectorAll('body *')].find(x => {
        const r = x.getBoundingClientRect()
        return r.width > 0 && r.right > W + 1
      })
      return {
        exceso: e.scrollWidth - e.clientWidth,
        culpable: culpa ? `${culpa.tagName}.${(culpa.className || '').toString().slice(0, 30)}` : '?'
      }
    })
    if (d) {
      console.log(`  ✗ ${ancho}px ${ruta} — se corre ${d.exceso}px de lado (${d.culpable})`)
      fallas++
    }
  }
  await p.close()
}
await nav.close()
if (fallas) {
  console.log(`\nFALLA · ${fallas} página(s) se desplazan horizontalmente`)
  process.exit(1)
}
console.log(`OK · ninguna de las ${RUTAS.length} rutas se corre de lado (${ANCHOS.join(' y ')} px)`)
