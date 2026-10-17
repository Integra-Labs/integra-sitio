// La navegación tiene que PINTARSE, en teléfono y en escritorio.
//
// El 2026-10-09 el menú se colapsó en un <details> para que no se comiera la
// primera pantalla del teléfono. En escritorio el plan era que `display:contents`
// borrara la caja del <details> y los enlaces quedaran como hijos del <nav>.
// La caja desaparecía; el contenido NO: un <details> cerrado esconde lo que
// lleva adentro sin importar su `display`. El menú de escritorio quedó
// invisible SIETE DÍAS en producción —nav a 0 px, cada enlace a 19— y lo
// encontró el dueño mirando la página, no el CI.
//
// Ninguno de los seis candados podía verlo: no hay desborde, los títulos miden
// bien, las plantillas caben, y axe no se queja de un enlace que está en el DOM
// pero no se pinta.
//
// Se mide por IMPACTO (`elementFromPoint`), no por caja. Durante el arreglo un
// `getBoundingClientRect()` devolvió 224x235 para un submenú CERRADO y casi se
// reporta un defecto que no existía: con `content-visibility:hidden` la caja
// sobrevive y el pintado no. La única pregunta que no miente es «si toco ahí,
// ¿qué agarro?».
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:4173'
const RUTAS = ['/', '/funciones', '/para', '/para/taller-general', '/para/centro-de-servicio',
  '/para/llantera', '/para/vehiculos-electricos', '/recursos', '/plantillas', '/precios',
  '/aria', '/contacto', '/privacidad', '/terminos']
// 1280 es el escritorio donde se rompió; 390 el teléfono; 900 el primer ancho
// por encima del corte de 56rem, que es donde cambia el modo.
const ANCHOS = [390, 900, 1280]
const MINIMO_ESCRITORIO = 5   // Funciones · Tipos de taller · Recursos · Precios · Contacto

const nav = await chromium.launch()
let fallas = 0

for (const ancho of ANCHOS) {
  const p = await (await nav.newContext({ viewport: { width: ancho, height: 900 } })).newPage()
  for (const ruta of RUTAS) {
    await p.goto(BASE + ruta, { waitUntil: 'networkidle' })
    const r = await p.evaluate(() => {
      // Pintado de verdad: el centro del elemento tiene que devolverlo a él
      // (o a un descendiente suyo).
      const pintado = e => {
        if (!e) return false
        const b = e.getBoundingClientRect()
        if (b.width < 8 || b.height < 8) return false
        const x = b.x + b.width / 2, y = b.y + b.height / 2
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false
        const bajo = document.elementFromPoint(x, y)
        return !!(bajo && (e === bajo || e.contains(bajo)))
      }
      const nv = document.querySelector('.barra nav')
      if (!nv) return { sinNav: true }
      const boton = document.querySelector('.menu > summary')
      return {
        boton: pintado(boton),
        enlaces: [...nv.querySelectorAll('a, summary')].filter(pintado).map(e => e.textContent.trim()),
      }
    })

    if (r.sinNav) { console.log(`  ✗ ${ancho}px ${ruta} — no hay <nav> en la barra`); fallas++; continue }

    // Dos modos válidos y ninguno más: o está el botón que abre el menú, o
    // están los enlaces a la vista. Lo que no puede pasar es ninguno de los dos.
    if (r.boton) {
      console.log(`  ✓ ${ancho}px ${ruta} — botón «Menú» pintado`)
    } else if (r.enlaces.length >= MINIMO_ESCRITORIO) {
      console.log(`  ✓ ${ancho}px ${ruta} — ${r.enlaces.length} enlaces pintados`)
    } else {
      console.log(`  ✗ ${ancho}px ${ruta} — NAVEGACIÓN INALCANZABLE: sin botón «Menú» y solo ${r.enlaces.length} enlace(s) pintado(s)${r.enlaces.length ? ` (${r.enlaces.join(' · ')})` : ''}`)
      fallas++
    }
  }
  await p.close()
}
await nav.close()

if (fallas) {
  console.log(`\nFALLA · ${fallas} página(s) sin navegación alcanzable`)
  process.exit(1)
}
console.log(`OK · las ${RUTAS.length} rutas tienen navegación alcanzable (${ANCHOS.join(' y ')} px)`)
