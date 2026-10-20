# Document to Markdown Converter

> **v2 (React + Vite, ready for Vercel):** see [`web/README.md`](web/README.md). · **v2 (React + Vite, lista para Vercel):** consulta [`web/README.md`](web/README.md). · **v2 (React + Vite, pronta per Vercel):** vedi [`web/README.md`](web/README.md).
>
> The files below (`tool.html`, `src/`) are the original static version. · Los archivos siguientes son la versión estática original. · I file seguenti sono la versione statica originale.

## English

A static browser app that converts documents and pasted rich text to Markdown.

### Project structure

- `tool.html`: main converter page.
- `src/css/styles.css`: interface styles.
- `src/js/app.js`: conversion, IndexedDB, and download logic.
- `PROMPT.md`: English prompt for recreating or extending the app.

### How to use

Open `tool.html` in a modern browser. Upload or drag and drop TXT, PPTX, XLSX, XLS, CSV, TSV, or PDF files, or type and format content in the editor. The interface is available in English, Spanish, and Italian. If images are extracted, the app downloads a ZIP containing the Markdown file and image assets; otherwise it downloads a `.md` file.

Office, PDF, and OCR support load libraries from CDNs and therefore require an internet connection. Documents are processed locally in the browser.

### Privacy and legal notice

Documents and entered text are processed in the browser. This app does not send uploaded files or converted content to its own server. A pending Markdown conversion and extracted images are temporarily stored in IndexedDB on the device until download is started or the user selects **Clear**. If the page is closed first, data may remain in the browser profile and can be removed through the browser's site-data settings. A downloaded copy is outside the app's control.

The app loads document-reading and OCR libraries from CDN providers. Those providers may receive technical connection data, such as the IP address, when serving the libraries; the app's library requests do not include the document contents. Check the CDN providers' privacy notices.

This notice describes this local version and is not a blanket statement that the GDPR does or does not apply. An organisation that hosts or distributes the app must identify its controller and contact details and provide the transparency information required for its actual use, including purposes, legal basis, retention, recipients, and data-subject rights. Users should review conversion results and assess their obligations before entering personal data. Nothing here excludes rights or liability that cannot be limited under applicable law. See [Article 13 GDPR on EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj).

---

# Conversor de documentos a Markdown

## Español

Aplicación estática que convierte documentos y texto con formato a Markdown desde el navegador.

### Estructura del proyecto

- `tool.html`: página principal del conversor.
- `src/css/styles.css`: estilos de la interfaz.
- `src/js/app.js`: lógica de conversión, IndexedDB y descargas.
- `PROMPT.md`: prompt en inglés para recrear o ampliar la aplicación.

### Uso

Abre `tool.html` en un navegador moderno. Carga o arrastra archivos TXT, PPTX, XLSX, XLS, CSV, TSV o PDF, o escribe y da formato al contenido en el editor. La interfaz está disponible en español, italiano e inglés. Si se extraen imágenes, la app descarga un ZIP con el Markdown y los recursos; de lo contrario, descarga un archivo `.md`.

La lectura de Office, PDF y OCR carga bibliotecas desde CDN y requiere conexión a Internet. Los documentos se procesan localmente en el navegador.

### Aviso de privacidad y legal

Los documentos y el texto introducido se procesan en el navegador. Esta aplicación no envía los archivos cargados ni el contenido convertido a un servidor propio. Una conversión pendiente y las imágenes extraídas se guardan temporalmente en IndexedDB en el dispositivo hasta que se inicia la descarga o se pulsa **Limpiar**. Si se cierra la página antes, los datos pueden permanecer en el perfil del navegador y pueden borrarse desde los ajustes de datos del sitio. La copia descargada queda fuera del control de la aplicación.

La aplicación carga bibliotecas de lectura de documentos y OCR desde proveedores CDN. Estos pueden recibir datos técnicos de conexión, como la dirección IP, al servir las bibliotecas; las solicitudes de la app no incluyen el contenido de los documentos. Consulta los avisos de privacidad de los proveedores CDN.

Este aviso describe esta versión local y no afirma de forma general que el RGPD sea aplicable o inaplicable. Toda entidad que aloje o distribuya la app debe identificar al responsable y sus datos de contacto, y facilitar la información de transparencia que corresponda al uso real, incluidos fines, base jurídica, conservación, destinatarios y derechos de las personas. Antes de introducir datos personales, revisa el resultado y valora las obligaciones aplicables. Nada de este texto excluye derechos o responsabilidades que no puedan limitarse conforme a la ley aplicable. Consulta el [artículo 13 del RGPD en EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj).

---

# Convertitore di documenti in Markdown

## Italiano

Applicazione statica che converte documenti e testo formattato in Markdown direttamente nel browser.

### Struttura del progetto

- `tool.html`: pagina principale del convertitore.
- `src/css/styles.css`: stili dell’interfaccia.
- `src/js/app.js`: logica di conversione, IndexedDB e download.
- `PROMPT.md`: prompt in inglese per ricreare o ampliare l’applicazione.

### Utilizzo

Apri `tool.html` in un browser moderno. Carica o trascina file TXT, PPTX, XLSX, XLS, CSV, TSV o PDF, oppure scrivi e formatta il contenuto nell’editor. L’interfaccia è disponibile in italiano, spagnolo e inglese. Se vengono estratte immagini, l’app scarica uno ZIP con il file Markdown e le risorse; altrimenti scarica un file `.md`.

La lettura dei file Office, dei PDF e l’OCR caricano librerie da CDN e richiedono una connessione Internet. I documenti vengono elaborati localmente nel browser.

### Informativa sulla privacy e legale

I documenti e il testo inserito vengono elaborati nel browser. Questa applicazione non invia i file caricati né il contenuto convertito a un proprio server. Una conversione in sospeso e le immagini estratte vengono salvate temporaneamente in IndexedDB sul dispositivo fino all’avvio del download o alla selezione di **Cancella**. Se la pagina viene chiusa prima, i dati possono rimanere nel profilo del browser e possono essere eliminati dalle impostazioni dei dati del sito. La copia scaricata è fuori dal controllo dell’applicazione.

L’app carica librerie per la lettura dei documenti e l’OCR da fornitori CDN. Questi possono ricevere dati tecnici di connessione, come l’indirizzo IP, quando forniscono le librerie; le richieste dell’app non includono il contenuto dei documenti. Consulta le informative privacy dei fornitori CDN.

Questa informativa descrive questa versione locale e non afferma in generale che il GDPR si applichi o non si applichi. Ogni organizzazione che ospita o distribuisce l’app deve identificare il titolare e i relativi contatti e fornire le informazioni di trasparenza richieste in base all’uso effettivo, incluse finalità, base giuridica, conservazione, destinatari e diritti degli interessati. Prima di inserire dati personali, controlla il risultato e valuta gli obblighi applicabili. Nulla di quanto qui indicato esclude diritti o responsabilità che non possono essere limitati ai sensi della legge applicabile. Consulta l’[articolo 13 del GDPR su EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj).
