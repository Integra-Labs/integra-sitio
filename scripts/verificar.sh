#!/usr/bin/env bash
# Comprobaciones deterministas del sitio, sobre los archivos servidos.
#
# Son las que no necesitan un navegador y que por eso pueden correr rápido y
# fallar con un mensaje claro. Lo que sí necesita navegador —axe y Lighthouse—
# vive en el workflow, no acá.
#
# Uso:  scripts/verificar.sh http://localhost:4173
set -uo pipefail

BASE="${1:?falta la URL base}"
PAGINAS=(/ /funciones /para /para/taller-general /para/centro-de-servicio /para/vehiculos-electricos /recursos /plantillas /plantillas/orden-de-trabajo /plantillas/inspeccion-12-puntos /precios /aria /contacto /privacidad /terminos)

# Presupuesto de peso, en bytes: HTML de la página más todo lo que cuelga de
# ella y sirve nuestro propio dominio. El techo del plan es 500 KB; el sitio
# hoy pesa ~11 KB, así que 200 KB deja margen de sobra y sigue mordiendo mucho
# antes de que alguien meta una foto sin optimizar.
TECHO=204800

fallas=0
fallo() { echo "  ✗ $1"; fallas=$((fallas+1)); }
ok()    { echo "  ✓ $1"; }

# ── Cada ruta tiene su archivo .html ──────────────────────────────────────
#
# Existe porque el 2026-09-10 /plantillas dio 404 EN PRODUCCIÓN mientras pasaba
# en verde acá y en CI. La página vivía en `plantillas/index.html`, y ante un
# `.html` y un directorio con el mismo nombre cada servidor decide distinto:
# `serve` y SimpleHTTPRequestHandler sirven el índice del directorio, y Vercel
# con `cleanUrls` resuelve `/x` a `x.html` y nada más. O sea: los dos
# servidores de prueba tapaban el error justamente porque son más permisivos
# que el real.
#
# Esto no consulta al servidor: mira el disco. Una ruta cuyo `.html` no existe
# está viva solo por la permisividad de quien la sirva.
echo "── Archivos en disco"
raiz="$(cd "$(dirname "$0")/.." && pwd)"
for ruta in "${PAGINAS[@]}"; do
  if [ "$ruta" = "/" ]; then archivo="$raiz/index.html"; else archivo="$raiz${ruta}.html"; fi
  if [ -f "$archivo" ]; then ok "${ruta} → ${archivo#$raiz/}"
  else fallo "${ruta} no tiene archivo propio (${archivo#$raiz/}). Si vive en un index.html de directorio, Vercel le va a dar 404."
  fi
done

for ruta in "${PAGINAS[@]}"; do
  url="${BASE}${ruta}"
  echo "── ${ruta}"

  codigo=$(curl -s -o /tmp/pagina.html -w '%{http_code}' "$url")
  if [ "$codigo" != "200" ]; then fallo "responde $codigo, no 200"; continue; fi
  ok "responde 200"

  # ── Un solo <h1>, y con texto ────────────────────────────────────────────
  # `page-has-heading-one` de axe es "best-practice" y no falla el build, así
  # que se comprueba acá. Y se cuenta sobre el HTML CRUDO a propósito: si el
  # título lo pinta JavaScript, este chequeo tiene que verlo vacío.
  n_h1=$(grep -o '<h1[ >]' /tmp/pagina.html | wc -l | tr -d ' ')
  if [ "$n_h1" != "1" ]; then fallo "tiene $n_h1 elementos <h1>, debe tener exactamente 1"
  else
    texto=$(sed -n 's/.*<h1[^>]*>\([^<]*\)<\/h1>.*/\1/p' /tmp/pagina.html | tr -d ' \n')
    if [ -z "$texto" ]; then fallo "el <h1> está vacío en el HTML crudo"
    else ok "un <h1> con texto, presente sin JavaScript"; fi
  fi

  # ── Título y descripción ─────────────────────────────────────────────────
  grep -q '<title>[^<]\+</title>' /tmp/pagina.html \
    && ok "tiene <title>" || fallo "sin <title>"
  grep -q 'name="description" content="[^"]\+"' /tmp/pagina.html \
    && ok "tiene meta description" || fallo "sin meta description"

  # ── Presupuesto de peso ──────────────────────────────────────────────────
  total=$(wc -c < /tmp/pagina.html)
  for recurso in $(grep -o 'href="/[^"]*\.\(css\|woff2\)"' /tmp/pagina.html | sed 's/href="//;s/"//'); do
    total=$((total + $(curl -s "${BASE}${recurso}" | wc -c)))
  done
  # Las imágenes también pesan. Sin esto, el gate deja pasar una foto sin
  # optimizar y sigue diciendo que todo está bien.
  for imagen in $(grep -o 'src="/[^"]*\.\(webp\|png\|jpg\|jpeg\|avif\|svg\)"' /tmp/pagina.html | sed 's/src="//;s/"//'); do
    total=$((total + $(curl -s "${BASE}${imagen}" | wc -c)))
  done
  if [ "$total" -gt "$TECHO" ]; then
    fallo "pesa ${total} B y el techo es ${TECHO} B"
  else
    ok "pesa ${total} B (techo ${TECHO} B)"
  fi

  # ── Nada de datos estructurados inventados ───────────────────────────────
  # La regla del plan §7.4, nacida de medirle a la competencia un
  # aggregateRating de 4.8 sobre reseñas que no existen en ninguna parte.
  if grep -q 'aggregateRating' /tmp/pagina.html; then
    fallo "declara aggregateRating — prohibido mientras no haya reseñas reales"
  else
    ok "sin aggregateRating"

  # ── Sin restos del generador ────────────────────────────────────────────
  #
  # Existe porque el 2026-09-10 /funciones salió a producción con la
  # representación literal de una tupla de Python dentro del HTML: comillas,
  # comas y secuencias `\n` visibles como texto en la página. Al armarla
  # separé los bloques con comas en vez de concatenarlos.
  #
  # Ni este candado ni la revisión de diseño lo vieron: el <h1> estaba, el
  # título estaba, el peso daba, y axe no se queja de un texto feo. Todos
  # miraban propiedades de la página y ninguno si el HTML era el que se quiso
  # escribir. Lo encontró una persona abriéndola.
  if grep -q '\\n' /tmp/pagina.html; then
    fallo "hay secuencias \\n literales en el HTML — resto del generador"
  else
    ok "sin restos del generador"
  fi
  fi
done

echo
if [ "$fallas" -gt 0 ]; then echo "FALLA · $fallas comprobación(es)"; exit 1; fi
echo "OK · todas las comprobaciones pasaron"
