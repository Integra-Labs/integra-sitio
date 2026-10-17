// Ninguna página debe correrse de lado en un teléfono.
//
// Dos veces en el mismo sitio: una tabla de 544 px dentro de una caja de 358
// empujaba /precios 136 px, y otra de 446 px empujaba /plantillas/inspeccion-12-puntos
// 93 px a 390 y 163 a 320. Las dos pasaron todos los candados: el <h1> estaba,
// el peso daba, axe no ve un desborde horizontal y Lighthouse tampoco lo falla.
//
// El ancho angosto (320) es el que caza lo que 390 deja pasar.
//
// Y los anchos de escritorio están acá porque el candado nació mirando solo
// teléfono, y el héroe a dos columnas se corrió 88 px a 1280 sin que este
// archivo se enterara: usaba `min(74rem, calc(100vw - ...))` y `100vw` cuenta
// la barra de desplazamiento. Un candado que solo mide teléfono no defiende el
// escritorio.
//
// Y la tercera vez fue el MENÚ: el panel del teléfono se anclaba al <nav> de
// 85 px en vez de a la barra de 358, así que «Tipos de taller» salía en tres
// renglones y «Funciones» se cortaba contra el borde. Pasó los seis candados
// porque todos miden la página CERRADA, y un <details> tiene un segundo estado
// renderizado que nadie visitaba. Por eso acá se abre el menú y cada submenú.
//
// 640 px está en la lista porque es el límite exacto de la media query que
// causó aquello: un candado ciego a sus propios puntos de quiebre es cómo se
// coló. Entre 391 y 640 el menú estaba roto y nadie miraba ahí.
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:4173'
const ANCHOS = [320, 390, 640, 1024, 1440]
const RUTAS = ['/', '/funciones', '/para', '/para/taller-general', '/para/centro-de-servicio', '/para/llantera',
  '/para/vehiculos-electricos', '/recursos', '/recursos/recepcion-sin-reclamos',
  '/recursos/cobrar-la-inspeccion', '/recursos/que-preguntar-antes-de-comprar',
  '/recursos/cuadrar-la-caja', '/plantillas', '/plantillas/orden-de-trabajo',
  '/plantillas/inspeccion-12-puntos', '/precios', '/aria', '/contacto', '/privacidad', '/terminos']

// El panel del menú es `position:absolute`: si se sale, `scrollWidth` puede
// crecer —o no, si un ancestro recorta—. Por eso se miran las dos cosas, y no
// solo el documento como en el estado cerrado.
const medirPanel = () => {
  const e = document.documentElement
  const W = e.clientWidth
  const fuera = [...document.querySelectorAll('.menu-panel a, .menu-panel summary')]
    .map(x => ({ x, r: x.getBoundingClientRect() }))
    .find(({ r }) => r.width > 0 && (r.right > W + 1 || r.left < -1))
  if (fuera) return `«${fuera.x.textContent.trim().slice(0, 24)}» se sale ${Math.round(fuera.r.right - W)}px del borde`
  if (e.scrollWidth > W + 1) return `el documento se corre ${e.scrollWidth - W}px`
  return null
}

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

    // Segundo estado: el menú abierto. Donde el botón no se ve, el nav es la
    // fila plana de escritorio y no hay nada que abrir.
    const boton = await p.$('.menu > summary')
    if (boton && await boton.isVisible()) {
      await boton.click()
      let mal = await p.evaluate(medirPanel)
      // Los submenús son excluyentes entre sí (`name` en <details>), así que
      // abrir uno cierra el otro: hay que visitarlos de a uno.
      const cuantos = await p.$$eval('.menu-panel .desplegable > summary', s => s.length)
      for (let i = 0; i < cuantos && !mal; i++) {
        const subs = await p.$$('.menu-panel .desplegable > summary')
        await subs[i].click()
        mal = await p.evaluate(medirPanel)
      }
      if (mal) {
        console.log(`  ✗ ${ancho}px ${ruta} — con el menú ABIERTO: ${mal}`)
        fallas++
      }
    }
  }
  await p.close()
}
await nav.close()
if (fallas) {
  console.log(`\nFALLA · ${fallas} página(s) se desplazan horizontalmente`)
  process.exit(1)
}
console.log(`OK · ninguna de las ${RUTAS.length} rutas se corre de lado, cerrada ni con el menú abierto (${ANCHOS.join(' y ')} px)`)
