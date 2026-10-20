# English prompt to recreate the app

Build a polished, responsive, browser-based document-to-Markdown converter using plain HTML, CSS, and JavaScript. Keep the project organized as `tool.html`, `src/css/styles.css`, and `src/js/app.js`. Do not use a server or framework.

## Core workflow

- Let users upload or drag and drop TXT, PPTX, XLSX, XLS, CSV, TSV, and PDF files.
- Also provide a rich-text editor where users can type or paste content and apply bold, italic, underline, lists, and font sizes.
- Convert all inputs into clean, standard Markdown. The generated Markdown must not contain presentation-only HTML such as `<span style="font-size: ...">`.
- Preserve bold and italic using `**bold**` and `*italic*`. Markdown has no native underline, so map underline to bold. Convert rich-text font sizes of 18 px and above into Markdown heading levels, with the largest size mapped to `#`, the next size to `##`, and so on. Treat smaller font sizes as regular paragraph text.
- Convert spreadsheet sheets into Markdown tables, PowerPoint slides into ordered Markdown sections, and PDF text into readable paragraphs. Offer optional OCR for scanned PDF pages, using the selected interface language.
- Extract available images from PPTX and XLSX archives. For PDFs, preserve pages containing raster images as image assets. When images are present, download a ZIP containing the `.md` file and an `assets/images/` folder; otherwise download a plain `.md` file.
- Show a preview before download. Store the pending Markdown and any image assets in IndexedDB. Clear the stored conversion after a successful download or when the user selects Clear. Reopen and retry once if an IndexedDB connection closes during processing.

## Languages and interface

- Localize every visible label, caption, status message, and accessibility label in Spanish, Italian, and English.
- Include a language selector and a clean, calm, accessible layout with responsive behavior, drag-and-drop feedback, clear processing/error states, and keyboard-friendly controls.
- Keep the uploaded documents on-device. Load browser libraries from CDN only where needed, and clearly communicate that network access is required for those format readers and OCR.

## Implementation constraints

- Use semantic HTML and plain JavaScript; no build step is required.
- Use IndexedDB for temporary conversion state. Treat transaction modes correctly (`readonly` for reads and `readwrite` for writes/deletes). Handle connection closure and transaction failures gracefully.
- Escape spreadsheet table delimiters and preserve paragraph/list structure. Avoid duplicate formatting wrappers and never silently remove repeated user text.
- Keep application logic in `src/js/app.js`, styles in `src/css/styles.css`, and the page shell and dependency script tags in `tool.html`.
