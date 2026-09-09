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
PAGINAS=(/ /precios /contacto /privacidad /terminos)

# Presupuesto de peso, en bytes: HTML de la página más todo lo que cuelga de
# ella y sirve nuestro propio dominio. El techo del plan es 500 KB; el sitio
# hoy pesa ~11 KB, así que 200 KB deja margen de sobra y sigue mordiendo mucho
# antes de que alguien meta una foto sin optimizar.
TECHO=204800

fallas=0
fallo() { echo "  ✗ $1"; fallas=$((fallas+1)); }
ok()    { echo "  ✓ $1"; }

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
  for recurso in $(grep -o 'href="/[^"]*\.css"' /tmp/pagina.html | sed 's/href="//;s/"//'); do
    total=$((total + $(curl -s "${BASE}${recurso}" | wc -c)))
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
  fi
done

echo
if [ "$fallas" -gt 0 ]; then echo "FALLA · $fallas comprobación(es)"; exit 1; fi
echo "OK · todas las comprobaciones pasaron"
