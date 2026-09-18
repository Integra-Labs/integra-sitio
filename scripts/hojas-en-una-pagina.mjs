// Las plantillas imprimibles tienen que caber en UNA hoja A4.
//
// Las dos salían en dos páginas y nadie se enteró: es lo único del sitio cuyo
// defecto solo se ve en el papel, no en la pantalla. Para algo que un taller
// imprime por pilas, la segunda página es media resma tirada — y peor, la
// firma del cliente podía caer sola en ella.
//
// Se cuenta sobre el PDF real que produce el navegador, no sobre aritmética de
// milímetros: la primera versión de esta comprobación calculaba el área útil a
// mano, daba «cabe» y el PDF seguía trayendo dos páginas.
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:4173'
const HOJAS = ['/plantillas/orden-de-trabajo', '/plantillas/inspeccion-12-puntos']

const nav = await chromium.launch()
const p = await (await nav.newContext()).newPage()
let fallas = 0

for (const ruta of HOJAS) {
  await p.goto(BASE + ruta, { waitUntil: 'networkidle' })
  const pdf = await p.pdf({ format: 'A4', printBackground: true })
  // `/MediaBox` aparece una vez por página. Calibrado contra PDFs de 1, 2 y 3
  // páginas: coincide con `/Count` y con `/Type /Page`.
  const paginas = (pdf.toString('latin1').match(/\/MediaBox/g) || []).length
  if (paginas === 1) {
    console.log(`  ✓ ${ruta} — una página`)
  } else {
    console.log(`  ✗ ${ruta} — ${paginas} páginas, tiene que ser 1`)
    fallas++
  }
}

await nav.close()
if (fallas) {
  console.log(`\nFALLA · ${fallas} plantilla(s) no caben en una A4`)
  process.exit(1)
}
console.log(`OK · las ${HOJAS.length} plantillas caben en una A4`)
