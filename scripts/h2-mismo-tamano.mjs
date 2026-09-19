// Los títulos de sección de una misma página tienen que medir lo mismo.
//
// Cuatro veces en dos días una regla con `>` dejó de aplicar en cuanto se metió
// un contenedor: `.prueba` en el héroe, los botones de /recursos, el titular al
// anidarlo en `.hero-texto`, y el h2 de «Cobre la inspección» al pasarlo al
// bloque de dos columnas. Las tres primeras se cazaron mirando; la cuarta se
// publicó y la encontró una revisión de diseño. El síntoma siempre es el
// mismo: un elemento que pierde su estilo y se queda con el del navegador.
//
// Acá se mide el SÍNTOMA, no la regla: si dos títulos de sección de la misma
// página no miden igual, algo dejó de alcanzarlos.
//
// Se excluye `.cierre`, cuyo título es deliberadamente menor (32 px), y se
// mide a 1440 px: debajo de 60rem el `clamp()` los lleva a todos a su piso y
// un desajuste quedaría escondido.
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:4173'
const RUTAS = ['/', '/funciones', '/para', '/para/taller-general', '/para/centro-de-servicio',
  '/para/vehiculos-electricos', '/recursos', '/recursos/recepcion-sin-reclamos',
  '/recursos/cobrar-la-inspeccion', '/recursos/que-preguntar-antes-de-comprar',
  '/recursos/cuadrar-la-caja', '/plantillas', '/plantillas/orden-de-trabajo',
  '/plantillas/inspeccion-12-puntos', '/precios', '/aria', '/contacto', '/privacidad', '/terminos']

const nav = await chromium.launch()
const p = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
let fallas = 0, sinSecciones = []

for (const ruta of RUTAS) {
  await p.goto(BASE + ruta, { waitUntil: 'networkidle' })
  const grupos = await p.evaluate(() => {
    const tam = {}
    for (const h of document.querySelectorAll('main .seccion:not(.cierre) h2')) {
      const px = Math.round(parseFloat(getComputedStyle(h).fontSize))
      ;(tam[px] = tam[px] || []).push(h.innerText.trim().slice(0, 40))
    }
    return tam
  })
  const tamaños = Object.keys(grupos)
  if (tamaños.length === 0) { sinSecciones.push(ruta); continue }
  if (tamaños.length === 1) {
    console.log(`  ✓ ${ruta} — ${grupos[tamaños[0]].length} títulos, todos a ${tamaños[0]}px`)
  } else {
    console.log(`  ✗ ${ruta} — títulos de sección con tamaños distintos:`)
    for (const t of tamaños.sort((a, b) => b - a)) {
      console.log(`      ${t}px · ${grupos[t].join(' · ')}`)
    }
    fallas++
  }
}
await nav.close()

// No se silencia lo que no se midió: decir cuántas rutas quedaron fuera.
if (sinSecciones.length) {
  console.log(`\n  (sin h2 dentro de .seccion, nada que comparar: ${sinSecciones.join(', ')})`)
}
if (fallas) {
  console.log(`\nFALLA · ${fallas} página(s) con títulos de sección desparejos`)
  process.exit(1)
}
console.log(`\nOK · ${RUTAS.length - sinSecciones.length} rutas con títulos de sección parejos`)
