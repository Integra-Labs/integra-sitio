# integra-sitio

Sitio público de **Integra Núcleo** — [integranucleo.com](https://integranucleo.com).

Integra Núcleo es un sistema de gestión para talleres automotrices en Costa Rica.

## Por qué es un repo aparte

El producto vive en otro proyecto. Mantener el sitio separado evita dos cosas:
que un visitante anónimo descargue el bundle y registre el service worker de la
aplicación, y que un despliegue de marketing pueda afectar al producto.

## Estado

Página de espera de una sola pantalla. El sitio completo no está construido.

## Cómo trabajarlo

HTML estático, sin build y sin dependencias. Se edita `index.html` y se
despliega. Para verlo local basta con abrir el archivo en el navegador.

## Reglas

- **Estático y anónimo.** El sitio nunca lee sesión de usuario ni muestra datos
  personalizados. La autenticación vive del lado de la aplicación.
- **Solo afirmaciones verificables.** Nada de cifras, testimonios ni logos que
  no se puedan sostener, y ningún dato estructurado (`aggregateRating`, precios)
  que no corresponda con lo publicado en la página.
- **Presupuesto de peso:** menos de 500 KB por página y menos de 120 KB de JS.
- **El contenido existe sin JavaScript.** Ningún texto ni número puede depender
  de una animación o de un script para mostrarse: tiene que venir en el HTML.
- **Accesibilidad:** un `<h1>` real por página, foco visible, objetivo de toque
  de al menos 44 px y contraste mínimo AA verificado por cálculo.

## Calidad

Cada push y cada PR corren `.github/workflows/calidad.yml`, con tres gates duros:

- `scripts/verificar.sh` — un solo `<h1>` con texto **en el HTML crudo**, título
  y descripción presentes, presupuesto de peso, y ningún `aggregateRating`.
- **axe** — cero violaciones de accesibilidad.
- **Lighthouse** — mínimo 90 en rendimiento, accesibilidad, buenas prácticas y SEO.

El primero se comprueba sobre el HTML sin ejecutar scripts a propósito: si un
título o un número lo pinta JavaScript, el gate tiene que verlo vacío.

Para correrlos en local:

```
npx serve -l 4173 .
./scripts/verificar.sh http://localhost:4173
```

## Dominios

| Host | Rol |
|---|---|
| `integranucleo.com` | este sitio |
| `www.integranucleo.com` | redirección 308 al ápice |
| `integranucleo.app` | la aplicación — proyecto distinto |
