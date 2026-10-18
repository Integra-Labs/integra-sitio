// api/_spam.js — decide si un lead MERECE UN AVISO. Nunca si se guarda.
//
// ── La regla que manda ──────────────────────────────────────────────────────
//
// El lead se guarda SIEMPRE, pase lo que pase acá. Esto solo decide si suena
// el correo. La asimetría es deliberada: un falso positivo cuesta un aviso
// tardío —el lead sigue en la tabla, con `motivo_sin_aviso` diciendo por qué—
// y un falso negativo cuesta leer un spam. Perder un cliente no es una de las
// dos opciones, y por eso el filtro no puede descartar nada.
//
// ── Por qué existe ──────────────────────────────────────────────────────────
//
// El 2026-10-18, a los dos minutos de que los avisos empezaran a salir,
// entraron CUATRO envíos de agencias de diseño web en inglés. El campo trampa
// `sitio_web` no los para: no son bots ingenuos llenando todo el formulario,
// son operadores que llenan solo los campos visibles.
//
// ── Puntaje, no regla única ─────────────────────────────────────────────────
//
// Ninguna señal suprime sola. El umbral exige una señal FUERTE (3) más una
// segunda cualquiera. Así, un dueño que escribe un mensaje larguísimo, o que
// pone el mismo texto en nombre y taller porque trabaja solo, igual recibe su
// aviso: esas señales valen 2 y 1, y juntas no llegan a 4.
export const UMBRAL = 4

// Marcadores de español. Basta UNO para que el mensaje deje de parecer inglés.
// Incluye los signos y las tildes porque un «sí», un «cuánto» o un «¿» no
// aparecen jamás en una plantilla de venta en inglés.
const ESPANOL = /[áéíóúñ¿¡]|\b(que|qué|para|taller|hola|buenas|gracias|necesito|quisiera|quiero|precio|cuánto|cuanto|cómo|como|mecánico|carro|vehículo|llantas|repuesto|demostración|demo|información|informacion|favor|saludos|estoy|tengo|somos|nuestro)\b/i

// Marcadores de inglés de plantilla comercial.
const INGLES = /\b(the|your|you|we|our|would|website|business|services|improve|team|hi|hello|dear|regards|interested|offer|company)\b/i

// Vocabulario de venta de servicios web. Es lo que vende el spam que llegó, y
// no lo que pide un taller: ningún dueño escribe «backlinks» pidiendo una demo.
const VENTA_WEB = /\b(seo|backlinks?|web ?design|website (design|development|redesign|speed)|digital marketing|e-?commerce (website|development)|mobile app development|ui\/ux|social media marketing|online branding|rank (your|higher)|traffic to your|guest post|link building|outreach)\b/i

const soloDigitos = s => (s || '').replace(/\D/g, '').replace(/^506/, '')

/**
 * @returns {{sospechoso: boolean, puntaje: number, senales: string[]}}
 * `senales` se guarda tal cual en la base: cuando alguien pregunte «¿por qué
 * no me avisaron de este?», la respuesta está en la fila y no hay que deducirla.
 */
export function evaluarLead({ nombre = '', taller = '', mensaje = '', telefono = '' } = {}) {
  const senales = []
  let puntaje = 0
  const suma = (n, etiqueta) => { puntaje += n; senales.push(etiqueta) }

  const texto = String(mensaje || '')

  // ── Señales fuertes (3) ───────────────────────────────────────────────────
  // Un mensaje con marcadores de inglés y NINGUNO de español. El sitio le
  // habla a dueños de taller costarricenses; el idioma es la señal más honesta
  // que hay, y la única que por sí sola casi alcanza.
  if (texto.length >= 40 && INGLES.test(texto) && !ESPANOL.test(texto)) suma(3, 'mensaje-en-ingles')

  if (VENTA_WEB.test(texto)) suma(3, 'vende-servicios-web')

  // ── Señales de apoyo ──────────────────────────────────────────────────────
  // Las cuatro del 10-18 traían el mismo texto en nombre y taller. Vale 2 y no
  // más: un mecánico que trabaja solo puede poner su nombre en los dos campos.
  const n = String(nombre || '').trim().toLowerCase()
  const t = String(taller || '').trim().toLowerCase()
  if (n && t && n === t) suma(2, 'nombre-igual-al-taller')

  // Un taller pide una demo en dos renglones. Mil caracteres es una plantilla.
  if (texto.length > 600) suma(1, 'mensaje-larguisimo')

  // En Costa Rica el número tiene OCHO dígitos. Esto vale 1 porque alguien
  // puede dejar dos números, o el de la sucursal y el celular.
  const d = soloDigitos(telefono)
  if (d && d.length !== 8) suma(1, 'telefono-no-costarricense')

  if (/https?:\/\/|www\./i.test(texto)) suma(1, 'enlace-en-el-mensaje')

  return { sospechoso: puntaje >= UMBRAL, puntaje, senales }
}
