# Texto a Markdown · v2 (React + Vite)

Conversor de documentos y texto con formato a Markdown que funciona en el navegador. Es la versión React de `../tool.html`, preparada para publicarse en Vercel.

Formatos: TXT, MD, CSV, TSV, XLSX, XLS, PPTX y PDF (con OCR opcional), además de un editor de texto enriquecido que acepta contenido pegado desde Word, Google Docs o páginas web. Si hay imágenes, se descarga un ZIP con el `.md` y la carpeta `assets/images/`.

## Requisitos

- Node.js **22.12 o superior** (recomendado 24 LTS, ver `.nvmrc`). Vite 8, Vitest 5 y PDF.js 6 no funcionan con Node 20.

## Scripts

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # tests unitarios (Vitest + jsdom)
npm run build     # build de producción en dist/
npm run preview   # sirve dist/ con las mismas cabeceras de seguridad que Vercel
```

`predev` y `prebuild` copian los datos de PDF.js (CMaps, fuentes estándar, wasm) a `public/pdfjs/` para servirlos desde el propio dominio. Esa carpeta se genera y no se versiona.

## Estructura

```
src/
  App.jsx                 estado de la app: conversión, almacenamiento, descarga
  components/             cabecera, pestañas, zona de carga, editor, resultado, aviso legal
  converters/             un módulo por formato, cargado bajo demanda
    html-to-markdown.js   editor y contenido pegado → Markdown
    pdf.js, pdf-layout.js PDF.js + reconstrucción de párrafos, títulos y listas
    pptx.js, workbook.js, delimited.js, text.js, ocr.js
  i18n/                   textos en español, italiano e inglés
  lib/                    IndexedDB (conversión pendiente) y descargas
  __tests__/              tests de los conversores
```

## Publicar en Vercel

**Opción A: desde GitHub**

1. Sube el repositorio a GitHub.
2. En Vercel: *Add New → Project*, importa el repositorio.
3. En *Root Directory* elige `web`. Vercel detecta Vite; `vercel.json` ya define el build y la carpeta `dist`.
4. *Deploy*. Cada push a la rama principal vuelve a publicar.

**Opción B: desde la terminal**

```bash
cd web
npx vercel        # primera vez: inicia sesión y enlaza el proyecto (despliegue de prueba)
npx vercel --prod # publica en producción
```

## Seguridad y privacidad

- Los documentos se procesan en el navegador; la app no los envía a ningún servidor.
- `vercel.json` aplica una Content-Security-Policy estricta y otras cabeceras de seguridad. La única excepción externa es `cdn.jsdelivr.net`, que el OCR (tesseract.js) usa para descargar su motor y los datos de idioma solo cuando se activa. Si se alojan esos archivos en el propio dominio, puede quitarse jsDelivr de la CSP.
- SheetJS (`xlsx`) se instala desde `cdn.sheetjs.com` porque las versiones de npm (≤ 0.18.5) tienen vulnerabilidades conocidas y ya no se actualizan allí.
- Quien publique la app debe completar en el aviso legal la identidad y el contacto del responsable (art. 13 RGPD).
