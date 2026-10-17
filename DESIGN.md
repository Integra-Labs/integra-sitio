# Sistema de diseño — `integranucleo.com`

Esto es **el porqué**. El **cómo** vive en `styles.css`, que es la única fuente
de verdad de valores: si este documento y la hoja no coinciden, manda la hoja y
este archivo está desactualizado. No se copian valores acá salvo los que son
decisiones de producto y no de implementación.

Relacionado: [ADR-041 del producto](https://github.com/Integra-Labs/integra-core-pwa/blob/main/docs/ADR-041-un-solo-sistema-de-diseno.md)
rige la **aplicación**. Este sitio es otra superficie, con otro público y otras
restricciones; no comparten hoja ni tienen por qué verse iguales.

---

## 1 · Las tres restricciones que mandan sobre el gusto

**Cero bytes de JavaScript.** Ninguna página carga un `<script>`. Es la ventaja
más medida del sitio y la más fácil de perder: cualquier librería, analítica o
animación que pida JS compite contra esto. Consecuencia práctica: no hay estado
de carga, ni carruseles, ni acordeones que no sean `<details>`.

**204 800 B por página**, contando el HTML y todo lo que cuelga de nuestro
dominio. Lo verifica `scripts/verificar.sh` en las 19 rutas.

**El contenido existe sin JavaScript.** Ningún texto ni número puede depender de
un script para mostrarse. El candado lee el HTML crudo justamente por eso.

### Cuánto del techo ya está gastado

Medido sobre producción el 2026-10-01, lo que viaja comprimido en **toda**
página antes de una sola palabra:

| | |
|---|---|
| `styles.css` | 17 360 B |
| `inter-latin-var.woff2` | 48 432 B |
| `instrument-sans-latin-var.woff2` | 29 904 B |
| **fijo por página** | **95 696 B — el 47 % del techo** |

Dos fuentes son **78 336 B**, o sea el 38 % del presupuesto. Esa es la decisión
más cara del sistema y está tomada a conciencia: se alojan acá y no en Google
Fonts para no pagar dos conexiones a un tercero. **Agregar una tercera fuente
es una decisión de presupuesto, no de tipografía.**

Qué queda, medido el 2026-10-01: el home va al **94 %** (**11 871 B libres**) y
`/funciones` al 90 %. Las páginas de `/para/*` y los artículos rondan el 51 % y
tienen ~100 000 B. **Una captura nueva va a esas páginas, no al home.**

Y un dato útil para no asustarse: **`og:image` no cuenta.** El candado suma los
`href=` de CSS y fuentes y los `src=` de imágenes; la imagen de Open Graph vive
en el `content=` de un `<meta>`, no la carga el navegador y no la mide nadie. La
de 40 KB que se comparte por WhatsApp es gratis para el presupuesto.

---

## 2 · Color

Un solo acento: **`--acento`**, azul. Todo lo demás es papel, tinta, un gris de
texto secundario y una línea. Los valores están en `:root`, arriba de todo en
`styles.css`.

**El acento ya hace seis trabajos** — enlaces, fondo del botón primario, la
insignia «MÁS ELEGIDO», la hora de los pasos del recorrido, el `+` del FAQ, el
antetítulo y las cifras de `/aria`. Está en 20 reglas.

> **Regla:** antes de pintar algo nuevo con el acento, preguntarse qué deja de
> significar. Un color con siete trabajos no señala ninguno. En octubre de 2026
> se descartó por esto pintar la mitad de cada título de sección — el contraste
> pasaba de sobra (7,03:1), el problema era la dilución.

No hay modo oscuro: cero reglas de `prefers-color-scheme`, cero de `data-theme`
(medido el 2026-10-16).

### Las dos licencias de color, y por qué existen

Hasta el 2026-10-16 esta sección decía también que no había «gradientes de marca,
ni color semántico de estado: el sitio no tiene estados que comunicar». Las dos
afirmaciones llevaban semanas vencidas y el documento no se enteró. Se corrigen
acá en vez de arrancar el color, porque en los dos casos el color llegó por una
razón que sigue en pie — pero cada una queda **acotada**, que es lo que las
separa de una licencia abierta.

**1 · El campo de gradientes (`main::before`) es marca, y es deliberado.**
Cuatro radiales —el acento, `#22A8CE` y `#7C5CD6`— enmascarados hacia abajo,
iguales en las 22 páginas. Cuesta **cero bytes**: ni una petición, ni un archivo.
Existe para que la primera pantalla no se lea como folleto, y es la única
licencia de color fuera del acento que el sitio se permite en su **propio cromo**.
Se achica y se aclara en teléfono, donde el texto va encima, y no se imprime.

**2 · Dentro de `.maqueta` el color reproduce estado del producto.**
Las maquetas no son decoración: son reproducciones en HTML de pantallas que **sí**
tienen estados —una inspección con hallazgos rojos y ámbar, una proforma con
renglones aceptados y pospuestos—. Pintarlas en gris mentiría sobre el producto.

| clase | color | qué reproduce |
|---|---|---|
| `.punto--rojo` | `#DC2626` | hallazgo de seguridad |
| `.punto--ambar` | `#D97706` | hallazgo que puede esperar |
| `.maqueta-caja--ambar` | `#FFFBEB` / `#FDE68A` | bloque de atención |
| `.maqueta-elegido--si` | `#ECFDF5` / `#047857` | renglón aceptado |
| `.maqueta-elegido--luego` | `#FFFBEB` / `#B45309` | renglón pospuesto |
| `.maqueta-pie .no` | `#FCA5A5` / `#B91C1C` | rechazo |
| `.chip-estado` | `#EEF2FF` / `#3730A3` | estado de la orden |

Viven en cuatro páginas: `index`, `funciones`, `para/taller-general` y
`para/vehiculos-electricos`.

> **Regla:** el color de estado **no sale de `.maqueta`**. En el cromo del sitio
> —botones, enlaces, insignias, avisos— sigue habiendo un solo acento. Si algo
> fuera de una maqueta necesita rojo o verde para decirse, el problema es el
> texto, no el color.

Contraste medido el 2026-10-16: **19 elementos, ninguno bajo 4,5:1**; el más bajo,
6,55:1. El color de estado nunca fue un problema de accesibilidad — era un
problema de que este documento decía que no existía.

---

## 3 · Tipografía

**Dos familias y no más** (ver §1): *Instrument Sans* para `h1`, `h2`, `h3` y el
antetítulo; *Inter* para todo el cuerpo.

La escala vive en `styles.css` con `clamp()` — se fluidifica entre teléfono y
escritorio en vez de saltar por `@media`. Los títulos llevan `letter-spacing`
negativo; el cuerpo no.

**Un candado vigila que los `h2` del mismo nivel midan igual**
(`scripts/h2-mismo-tamano.mjs`, a 1440 px). Existe porque una migración los
había dejado de tres tamaños distintos en la misma página sin que nadie lo
notara.

Nada en versales salvo el antetítulo y las etiquetas cortas. En español, con
palabras largas y alguien leyendo en un taller, las versales cuestan
legibilidad.

---

## 4 · Composición

Ancho de lectura **60rem** (`.env`), un solo paso de espaciado (`--paso`,
también con `clamp`). Dos niveles de sombra, los dos muy suaves.

**Fondo plano, a propósito.** Las guías de landing modernas piden gradientes o
imagen de fondo; acá pierden contra el techo de peso y contra el hecho de que el
fondo compite con las capturas de producto, que son la prueba.

### Lo que NO se usa, y por qué

**La rejilla de tres tarjetas en el home.** Ya hay dos secciones con esa forma
(`index.html`, las dos `.tres`) y una revisión de diseño la rechazó por
repetición; está anotado en `styles.css` donde vive el patrón que la reemplazó.
Es además el patrón más reconocible de página generada por IA. Cuando hizo falta
nombrar los tres tipos de taller en el home, se resolvió con **un renglón**.

**Íconos en círculo de color, emoji como viñeta, bordes de color a la izquierda
de las tarjetas, blobs decorativos.** Misma razón: son la firma de una plantilla.

---

## 5 · Accesibilidad — lo que ya es candado

No son aspiraciones: fallan el CI.

- **Un `<h1>` por ruta**, con texto, visible en el HTML crudo.
- **Cero violaciones de axe** y **≥ 90 de Lighthouse** en las cuatro categorías.
- **Ningún desborde horizontal** en las 19 rutas a 320, 390, 1024 y 1440 px.
- **Objetivo de toque de 44 px** y foco visible en todo lo enfocable.
- **Contraste AA**, verificado por cálculo además de por axe.

---

## 6 · Cómo se decide algo nuevo

1. ¿Cabe en el presupuesto de la página que lo va a llevar? (ver §1)
2. ¿Necesita JavaScript? Entonces no va.
3. ¿Le da al acento un trabajo más? (ver §2)
4. ¿Es una de las formas que el sitio ya descartó? (ver §4)
5. ¿Se puede verificar lo que afirma? El sitio no publica cifra, testimonio ni
   logo que no se sostenga.

Si pasa las cinco, se construye y se mira en pantalla a 390 y a 1440 antes de
abrir el PR.
