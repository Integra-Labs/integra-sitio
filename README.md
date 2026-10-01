# integra-sitio

Sitio público de **Integra Núcleo** — [integranucleo.com](https://integranucleo.com).

Integra Núcleo es un sistema de gestión para talleres automotrices en Costa Rica.

## Por qué es un repo aparte

El producto vive en otro proyecto. Mantener el sitio separado evita dos cosas:
que un visitante anónimo descargue el bundle y registre el service worker de la
aplicación, y que un despliegue de marketing pueda afectar al producto.

## Estado

**En producción, 19 rutas.** Home, funciones, los tres tipos de taller, cuatro
artículos, dos plantillas imprimibles, precios, ARIA, contacto y los legales.

## Cómo trabajarlo

HTML estático, sin build y sin dependencias de runtime. **No alcanza con abrir
el archivo**: `cleanUrls` resuelve `/x` a `x.html` y abrir el archivo suelto no
reproduce el enrutamiento ni deja correr los candados. Siempre con un servidor:

```
npx serve -l 4173 .
```

**Antes de tocar nada, leer [DESIGN.md](./DESIGN.md)** — el porqué del sistema:
el presupuesto de peso y cuánto ya está gastado, por qué hay un solo acento y
qué formas el sitio ya descartó.

## Reglas

- **Estático y anónimo.** El sitio nunca lee sesión de usuario ni muestra datos
  personalizados. La autenticación vive del lado de la aplicación.
- **Solo afirmaciones verificables.** Nada de cifras, testimonios ni logos que
  no se puedan sostener, y ningún dato estructurado (`aggregateRating`, precios)
  que no corresponda con lo publicado en la página.
- **Presupuesto de peso:** **204 800 B por página**, contando el HTML y todo lo
  que cuelga de nuestro dominio. Hoy el 47 % se va en la hoja y las dos fuentes,
  antes de una sola palabra — ver DESIGN.md §1.
- **Cero bytes de JavaScript.** Ninguna página carga un `<script>`. No es un
  objetivo: es el estado actual, y lo que lo rompa hay que discutirlo.
- **El contenido existe sin JavaScript.** Ningún texto ni número puede depender
  de una animación o de un script para mostrarse: tiene que venir en el HTML.
- **Accesibilidad:** un `<h1>` real por página, foco visible, objetivo de toque
  de al menos 44 px y contraste mínimo AA verificado por cálculo.

## Calidad

Cada push y cada PR corren `.github/workflows/calidad.yml`, con **seis** gates
duros:

- `scripts/verificar.sh` — un `<h1>` con texto **en el HTML crudo**, título y
  descripción presentes, el presupuesto de peso, ningún `aggregateRating`, y que
  las etiquetas de bloque cierren. Cada ruta tiene que existir como `.html` en
  disco: `cleanUrls` de Vercel resuelve `/x` a `x.html` y nada más, mientras que
  los servidores de prueba son más permisivos y tapan el error.
- `scripts/sin-desborde.mjs` — ninguna de las 19 rutas se corre de lado a 320,
  390, 1024 ni 1440 px.
- `scripts/h2-mismo-tamano.mjs` — los `h2` de sección miden igual entre sí.
- `scripts/hojas-en-una-pagina.mjs` — las plantillas imprimibles caben en una A4.
- **axe** — cero violaciones de accesibilidad.
- **Lighthouse** — mínimo 90 en rendimiento, accesibilidad, buenas prácticas y SEO.

El primero se comprueba sobre el HTML sin ejecutar scripts a propósito: si un
título o un número lo pinta JavaScript, el gate tiene que verlo vacío.

Para correrlos en local:

```
npx serve -l 4173 .
./scripts/verificar.sh            http://localhost:4173
node scripts/sin-desborde.mjs     http://localhost:4173
node scripts/h2-mismo-tamano.mjs  http://localhost:4173
node scripts/hojas-en-una-pagina.mjs http://localhost:4173
```

## Dominios

| Host | Rol |
|---|---|
| `integranucleo.com` | este sitio |
| `www.integranucleo.com` | redirección 308 al ápice |
| `integranucleo.app` | la aplicación — proyecto distinto |
