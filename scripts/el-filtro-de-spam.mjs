// El filtro de avisos no puede callarse un lead de verdad.
//
// Se prueba con los casos que de verdad llegaron el 2026-10-18 —cuatro
// agencias de diseño web a los dos minutos de que los avisos empezaran a
// salir— y con leads costarricenses verosímiles, incluidos los que se PARECEN
// a spam: el mensaje larguísimo, el que repite nombre y taller, el que trae un
// enlace a su sitio actual.
//
// La asimetría importa y por eso los casos están partidos: un spam notificado
// cuesta leerlo; un lead callado cuesta un cliente. Si algún día hay que
// aflojar el filtro, que sea porque este archivo lo pidió.
import { evaluarLead, UMBRAL } from '../api/_spam.js'

// ── Lo que NO debe despertar a nadie ────────────────────────────────────────
const SPAM = [
  { que: 'la agencia que llegó el 10-18 (textual)',
    lead: { nombre: 'Nathanael Web', taller: 'Nathanael Web', telefono: '2102102101',
      mensaje: 'Hi integranucleo.com, Are you considering any changes or improvements to your website in the near future? A well-designed website can help present your business professionally, improve the visitor experience, and make it easier for potential customers to connect with you. Our services include: Website Design & Development Website Redesign & Updates E-Commerce Website Development Mobile App Development SEO Services Digital Marketing Online Branding & Brand Promotion Social Media Marketing Website Speed & Performance Improvements UI/UX Design We focus on creating user-friendly, mobile-responsive websites with clean designs, good loading speeds, and SEO-friendly structures. Best regards, Nathanael' } },
  { que: 'oferta corta de SEO',
    lead: { nombre: 'Maverick mkt', taller: 'Maverick mkt', telefono: '1234567890',
      mensaje: 'Hello, we can rank your website higher with our SEO services and quality backlinks. Interested?' } },
  { que: 'link building sin nombre repetido',
    lead: { nombre: 'Helene Masterson', taller: 'Growth Co', telefono: '5551234567',
      mensaje: 'Dear team, we offer guest post and link building outreach to drive traffic to your site. Visit https://example.com for our pricing.' } },
]

// ── Lo que SÍ debe avisar, aunque se parezca ────────────────────────────────
const LEGITIMOS = [
  { que: 'el caso normal, dos renglones',
    lead: { nombre: 'Marvin Alvarado', taller: 'Taller Alvarado', telefono: '8888-8888',
      mensaje: 'Buenas, quisiera una demostración para mi taller en Cartago.' } },
  { que: 'sin mensaje — solo nombre y teléfono',
    lead: { nombre: 'Jessica Rojas', taller: 'Autos JR', telefono: '70707070', mensaje: '' } },
  { que: 'nombre IGUAL al taller: mecánico que trabaja solo',
    lead: { nombre: 'Luis Barrantes', taller: 'Luis Barrantes', telefono: '61234567',
      mensaje: 'Quiero ver cómo funciona para llevar el control de mis órdenes.' } },
  { que: 'mensaje larguísimo de un dueño que cuenta todo',
    lead: { nombre: 'Rafael Mora', taller: 'Servicentro Mora', telefono: '2222-3333',
      mensaje: 'Buenas tardes. Tenemos un taller en Alajuela con cuatro mecánicos y manejamos todo en cuadernos y un Excel que ya no da abasto. El problema más grande que tenemos es que al final del día nunca sabemos bien qué se cobró y qué quedó pendiente, y las comisiones de los muchachos se calculan a mano, lo que siempre genera discusiones. Queremos algo que nos ayude a llevar la orden desde que entra el carro hasta que se cobra, y que el cliente pueda ver qué se le va a hacer antes de autorizarlo. También nos interesa el tema de la inspección con fotos, porque muchas veces el cliente no entiende por qué le cobramos lo que le cobramos. ¿Podrían mostrarnos cómo funciona con nuestros propios precios?' } },
  { que: 'trae enlace a su sitio actual y dos teléfonos',
    lead: { nombre: 'Carolina Vega', taller: 'Frenos Vega', telefono: '2244-5566 / 8899-0011',
      mensaje: 'Hola, nuestro sitio es https://frenosvega.cr y queremos una demo.' } },
]

let fallas = 0
console.log('  ── no deben despertar a nadie ──')
for (const { que, lead } of SPAM) {
  const r = evaluarLead(lead)
  if (r.sospechoso) console.log(`  ✓ ${que} — ${r.puntaje} pts [${r.senales.join(', ')}]`)
  else { console.log(`  ✗ ${que} — SE HABRÍA AVISADO (${r.puntaje} pts, umbral ${UMBRAL})`); fallas++ }
}
console.log('  ── deben avisar siempre ──')
for (const { que, lead } of LEGITIMOS) {
  const r = evaluarLead(lead)
  if (!r.sospechoso) console.log(`  ✓ ${que} — ${r.puntaje} pts`)
  else { console.log(`  ✗ ${que} — SE HABRÍA CALLADO (${r.puntaje} pts [${r.senales.join(', ')}])`); fallas++ }
}

if (fallas) { console.log(`\nFALLA · ${fallas} caso(s) mal clasificado(s)`); process.exit(1) }
console.log(`\nOK · ${SPAM.length} spam callados y ${LEGITIMOS.length} leads avisados`)
