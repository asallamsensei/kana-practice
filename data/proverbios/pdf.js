/* Descarga directa y respaldo vectorial. No se captura ni rasteriza ninguna página. */
(function (root) {
  'use strict';
  const FILE = 'Proverbios_Asallam_Sensei.pdf';
  const PATH = 'data/proverbios/' + FILE;
  let fallbackCache = null;

  function decodeBase64(value) {
    const binary = atob(value.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // Lectura del código · Lectura de la plantilla y del logotipo.
  async function fetchPdf(url = PATH) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
      if (!response.ok) return null;
      const blob = await response.blob();
      // Algunos alojamientos devuelven su página 404 con estado 200.
      if (!(await blob.slice(0, 1024).text()).includes('%PDF-')) return null;
      return new Blob([blob], { type: 'application/pdf' });
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function readLogo() {
    const logo = document.querySelector('.cover img[src="data/proverbios/logo.png"]');
    if (logo?.complete && logo.naturalWidth) {
      // Solo se ajusta el PNG del logo. El resto del libro conserva sus vectores.
      try {
        const scale = Math.min(1, 800 / Math.max(logo.naturalWidth, logo.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(logo.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(logo.naturalHeight * scale));
        canvas.getContext('2d').drawImage(logo, 0, 0, canvas.width, canvas.height);
        const bytes = decodeBase64(canvas.toDataURL('image/png').split(',')[1]);
        canvas.width = canvas.height = 1;
        return bytes;
      } catch (_) { /* Prueba la ruta del mismo sitio si el navegador restringe el lienzo. */ }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch('data/proverbios/logo.png', { signal: controller.signal });
      if (!response.ok) return null;
      const bytes = new Uint8Array(await response.arrayBuffer());
      return bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 ? bytes : null;
    } catch (_) { return null; }
    finally { clearTimeout(timer); }
  }

  // Lectura del código · Carga diferida de la biblioteca PDF.
  let editorPromise;
  function loadEditor() {
    if (root.PDFLib) return Promise.resolve(root.PDFLib);
    if (!editorPromise) {
      editorPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'data/proverbios/vendor/pdf-lib.min.js';
        script.onload = () => root.PDFLib ? resolve(root.PDFLib) : reject(new Error('PDFLib no disponible.'));
        script.onerror = () => { script.remove(); reject(new Error('No se pudo cargar la biblioteca PDF.')); };
        document.head.append(script);
      }).catch(error => { editorPromise = null; throw error; });
    }
    return editorPromise;
  }

  // Lectura del código · Edición vectorial.
  async function buildVectorPdf(bytes, logoBytes, library) {
    if (!logoBytes) return new Blob([bytes], { type: 'application/pdf' });
    const pdf = await library.PDFDocument.load(bytes);
    const logo = await pdf.embedPng(logoBytes);
    const scale = Math.min(165 / logo.width, 165 / logo.height);
    const width = logo.width * scale, height = logo.height * scale;
    pdf.getPage(0).drawImage(logo, { x: (612 - width) / 2, y: 247 + (165 - height) / 2, width, height });
    return new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' });
  }

  async function buildFallback() {
    if (fallbackCache) return fallbackCache;
    const source = await fetchPdf('data/proverbios/Proverbios_respaldo.pdf');
    if (!source) throw new Error('No se encontró el PDF de respaldo.');
    const bytes = new Uint8Array(await source.arrayBuffer());
    const logoBytes = await readLogo();
    if (!logoBytes) return { blob: await buildVectorPdf(bytes, null), missingLogo: true };
    try {
      const blob = await buildVectorPdf(bytes, logoBytes, await loadEditor());
      fallbackCache = { blob, missingLogo: false };
      return fallbackCache;
    } catch (_) {
      return { blob: await buildVectorPdf(bytes, null), missingLogo: true };
    }
  }

  // Lectura del código · Descarga en el navegador.
  function download(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = FILE;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  const api = { fetchPdf, loadEditor, buildFallback, buildVectorPdf, decodeBase64, download, FILE, PATH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BookPdf = api;
})(typeof window === 'undefined' ? globalThis : window);
