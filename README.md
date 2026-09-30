# Silvano · Tomás Jofré — landing page

Sitio estático de una página. Sin build step, sin dependencias instalables.
HTML + CSS + JS vanilla, con GSAP/ScrollTrigger y Lenis desde CDN.

**Orden de la página:** hero → menú → reseñas → historia → contador →
galería → cómo llegar → CTA final.

```
index.html      estructura + SEO + schema.org
styles.css      tokens en :root y estilos por sección
main.js         smooth scroll, pins, reveals, slider, galería, lightbox
vercel.json     headers y cache para el deploy estático
.vercelignore   deja afuera las capturas originales de Instagram
assets/img/     imágenes
assets/video/   video del hero (pendiente)
*.png, *.webp   capturas originales de Instagram, material de trabajo
                (ojo: entrada.png es la picada; entrada_restaurante.webp
                 es la fachada del local)
```

---

## 1. Paleta

Muestreada pixel a pixel del logo y del Instagram, no elegida a ojo.
Todo está definido en `:root` en [styles.css](styles.css).

| Token | Hex | De dónde sale |
|---|---|---|
| `--c-red` | `#E93223` | el rombo del logo. Titulares y números grandes |
| `--c-red-cta` | `#D62A1B` | botones (blanco encima: 4,99:1) |
| `--c-red-text` | `#BE1F0E` | texto chico en rojo sobre fondo claro (4,96:1) |
| `--c-red-dark` | `#A81D11` | hover / pressed |
| `--c-sky` | `#9ECBD9` | el surtidor del logo. Detalles **solo sobre oscuro** |
| `--c-espresso` | `#251713` | la barra oscura de su menú de Instagram |
| `--c-wood` | `#6B5649` | la madera de las mesas en sus fotos |
| `--c-bone` | `#F7F3EE` | fondo claro |
| `--c-bone-deep` | `#ECE5DC` | fondo alterno |
| `--c-graphite` | `#3D3330` | texto corrido (11,1:1) |

Dos advertencias si tocás la paleta:

- **El celeste no se puede usar sobre fondo claro.** `#9ECBD9` sobre `#F7F3EE`
  da 1,6:1. Está reservado para las secciones oscuras (historia, CTA, footer),
  donde llega a 9,9:1.
- **El rojo del logo no pasa AA como texto chico.** `#E93223` sobre hueso da
  3,84:1: sirve para títulos grandes y para el rombo, no para un párrafo. Por
  eso existen `--c-red-cta` y `--c-red-text`.

---

## 2. Assets

### Ya resueltos, recortados de las capturas de Instagram

| Archivo | Origen | Qué es |
|---|---|---|
| `logo-silvano.png` (256²) | `logo.png` | recorte circular con alpha, sin el botón de corazón de Instagram |
| `favicon-64.png`, `apple-touch-icon.png` | `logo.png` | lo mismo, en chico |
| `hero-poster.jpg` (1920×1054) | `menu.png` | raviolones crudos sobre la mesada |
| `menu-01-entrada.jpg` | `entrada.png` | salame, jamón crudo, queso y pan |
| `menu-02-pastas.jpg` | `ravioles_estofado_pollo.png` | raviolones con estofado |
| `menu-03-postre.jpg` | `zabaglione.png` | zabaglione en copa |
| `galeria-pastas-01.jpg` | `ravioles.png` | raviolones con oliva y queso |
| `galeria-pastas-02.jpg` | `tallarines.png` | tallarines con manteca y queso |
| `galeria-pastas-03.jpg` | `menu.png` | raviolones crudos (foto ancha) |
| `galeria-pastas-04.jpg` | `ravioles_estofado_pollo.png` | el estofado, recorte cuadrado |
| `cta-bg.jpg`, `og-image.jpg` | `ravioles_estofado_pollo.png` | fondo del CTA y preview de WhatsApp |
| `historia-1934.jpg` | `entrada_restaurante.webp` | la fachada: hito 1934 de la timeline |
| `galeria-historia-01.jpg` | `entrada_restaurante.webp` | el surtidor, recorte vertical |
| `galeria-historia-02.jpg` | `entrada_restaurante.webp` | la fachada con el cartel, recorte ancho |
| `galeria-jardin-01.jpg` | `100años.webp` | el cartel de los 100 años en el patio (recortado para dejar afuera a la persona del borde) |
| `menu-04-bebida.jpg` | `Bebidas.jfif` | gaseosa, agua y el vaso con limón sobre la mesa |
| `historia-1905.jpg` | `entrada_restaurante.webp` | los árboles y el cielo, como textura del campo |
| `historia-1924.jpg` | `100años.webp` | la pared de ladrillo del propio local |
| `historia-1963.jpg` | `100años.webp` | la puerta y el salón que se ve adentro |
| `historia-hoy.jpg` | `menu.png` | los raviolones recién cerrados |

Todos se recortaron sacando la interfaz de Instagram (barra de estado, botón
Seguir, el texto de la story y el marco rojo).

### Los cuatro fondos de la timeline son texturas, no fotos de archivo

Cuatro hitos (1905, 1924, 1963 y hoy) no tienen foto de época. En vez de dejar
bloques de color, se usan recortes de **fotos actuales del propio local**: la
pared de ladrillo, la puerta, los árboles, la pasta. Van detrás de un velo al
94 % de opacidad, así que se leen como atmósfera y no como documento histórico.
Tienen `alt=""` porque son decorativas: ningún texto afirma que sean de época.

Cuando aparezcan fotos reales de archivo, se pisan con el mismo nombre.

**Dónde buscarlas** (para 1905, 1924 y 1963):

- **La familia.** Gerardo es la cuarta generación y el restaurante ya tiene
  fotos de familia colgadas en la pared. Es la fuente más probable y más rápida.
- **Archivo Histórico Municipal de Mercedes** y el museo local.
- **Archivo General de la Nación**, Departamento de Documentos Fotográficos.
- **Archivo histórico de YPF**, para el surtidor de 1934.
- El **Facebook del restaurante** y los grupos de historia y turismo de
  Tomás Jofré, donde suele circular material viejo del pueblo.
- Diarios de Mercedes, que a veces publicaron notas sobre el lugar.

Un escaneo de una foto vieja, aun con marcas y desgaste, va a quedar mejor que
cualquier reemplazo: la sección es sobre el paso del tiempo.

### Todavía en placeholder (bloque de color)

| Archivo | Medidas | Qué hace falta |
|---|---|---|
| `galeria-salon-01.jpg` | 1200×1200 | el salón por dentro |

Soltá el archivo con el mismo nombre en `assets/img/` y pisa al placeholder,
sin tocar código. Exportar a ~80 % de calidad, apuntando a menos de 300 KB.

### Video del hero (falta)

El HTML ya lo busca acá. **Tiene que ir dentro de `assets/video/`, no en la
raíz del proyecto:**

| Archivo | Formato | Medidas | Peso |
|---|---|---|---|
| `assets/video/video-silvano.mp4` | H.264, yuv420p | 1920×1080 | < 3 MB |
| `assets/video/video-silvano.webm` | VP9 (opcional) | 1920×1080 | < 2 MB |

Con el `.mp4` solo alcanza: el navegador ignora el `<source>` que no existe.
El `.webm` es opcional y pesa bastante menos, si llegás a generarlo.

Loop de 8–12 s, sin audio. Mientras no esté, el hero muestra `hero-poster.jpg`
y el zoom-out con scroll funciona igual.

```bash
ffmpeg -i tu-video.mov -t 10 -an -vf "scale=1920:-2" -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart assets/video/video-silvano.mp4
ffmpeg -i tu-video.mov -t 10 -an -vf "scale=1920:-2" -c:v libvpx-vp9 -crf 34 -b:v 0 assets/video/video-silvano.webm
```

---

## 3. Datos a confirmar

Marcados en el código con `data-placeholder` (borde punteado rojo) o con
comentarios `A CONFIRMAR` / `FALTA FOTO REAL`.

**Del menú.** El texto se tomó del menú que publicaron en Instagram el
1/3/2024, que difiere del brief original:

| | Brief original | Instagram (lo que quedó) |
|---|---|---|
| Pastas | raviolones de verdura y **pollo** | raviolones de verdura y **carne** |
| Postre | flan, dulce de zapallo, higos en almíbar, almendrado | helados, frutas en almíbar y flan casero |
| Bebidas | agua, gaseosas y vino | gaseosas, vino de la casa, **soda** y agua |
| Vegetariano | raviolones de ricota y nuez | no figura |

La opción vegetariana se dejó en la página igual, marcada con un comentario.
Una de las reseñas de Google la respalda: menciona "predisposición para realizar
platos veganos" y unos "capeletis de ricota de almendras", así que parece que se
hacen a pedido aunque no figuren en el menú impreso.

**Precio:** $40.000 – $50.000 por persona, según lo indicado. Conviene revisarlo
cada tanto: una reseña de hace 5 meses marcaba $30.000 – $40.000.

**Reseñas:** son cuatro reseñas reales de Google. Se publica solo el nombre de
pila, sin apellido. El texto está abreviado y con la puntuación ordenada, sin
cambiar lo que dicen. No se indica la fuente en la tarjeta; si querés que diga
"en Google", es una línea por testimonio.

**El resto:**

- Medios de pago (efectivo / débito / transferencia)
- URL real de la página de Facebook
- Dominio final: cambiar `https://silvano.com.ar/` en el `canonical`, en Open
  Graph y en el bloque `schema.org`
- Coordenadas exactas en el `schema.org` (`geo`) y verificar que el pin del
  mapa caiga en la puerta del restaurante

---

## 4. Correr local

No hay build. Hace falta servirlo por HTTP (abrir el archivo con `file://`
rompe el video y el mapa embebido):

```bash
# Python
python -m http.server 3000

# o Node
npx serve .

# o Vercel CLI, que además aplica vercel.json
npx vercel dev
```

Después: http://localhost:3000

---

## 5. Deploy en Vercel desde GitHub

**En línea:** https://silvano-lilac.vercel.app

> **Identidad de los commits.** Este repositorio se despliega en Vercel bajo la
> cuenta `pedromarzano1`. El plan Hobby solo despliega commits cuyo autor tenga
> acceso al proyecto, y no admite colaboradores. Por eso el repo tiene fijada
> su propia identidad de git:
>
> ```
> git config --local user.email "111799005+pedromarzano1@users.noreply.github.com"
> ```
>
> Sin eso, los commits quedan atribuidos a otra cuenta de GitHub y Vercel
> bloquea el deploy con "the commit author doesn't have permission to create
> deployments for this project".



1. **Repo**

   ```bash
   git init
   git add .
   git commit -m "Landing Silvano"
   git branch -M main
   git remote add origin https://github.com/<usuario>/silvano.git
   git push -u origin main
   ```

2. **Importar en Vercel**
   - vercel.com → *Add New…* → *Project* → *Import Git Repository*
   - Framework Preset: **Other**
   - Build Command: vacío · Output Directory: vacío (raíz) · Install: vacío
   - *Deploy*

   Cada push a `main` redeploya solo. Las ramas generan preview URLs.

3. **Dominio propio**
   - Project → *Settings* → *Domains* → *Add* → `silvano.com.ar`
   - En el DNS del registrante (NIC.ar o donde esté el dominio):
     - apex `silvano.com.ar` → **A** `76.76.21.21`
     - `www.silvano.com.ar` → **CNAME** `cname.vercel-dns.com`
   - El certificado SSL lo emite Vercel solo, unos minutos después de que
     propague el DNS.
   - Una vez con dominio: actualizar `canonical`, `og:url` y `schema.org`.

---

## 6. Notas técnicas

- **Reduced motion**: con `prefers-reduced-motion: reduce` no se instancia
  Lenis, no hay pins ni parallax, el video no se reproduce y la timeline de
  historia y el menú se muestran como listas estáticas.
- **Mobile**: el scroll horizontal del menú es un carrusel nativo con
  `scroll-snap` y swipe; en desktop pasa a pin + traslación con GSAP, vía
  `gsap.matchMedia()`.
- **Performance**: imágenes con `loading="lazy"` y `width`/`height` para evitar
  CLS, video con `preload="none"` que arranca recién cuando el hero está
  visible, animaciones solo con `transform`/`opacity`, textura de grano como
  SVG inline. El set de imágenes pesa 2,7 MB en total.
- **Accesibilidad**: skip link, landmarks, `alt` en todas las imágenes, foco
  visible, lightbox con foco atrapado y cierre con `Escape`, carrusel navegable
  con flechas. Contrastes verificados contra WCAG AA (ver tabla de paleta).
