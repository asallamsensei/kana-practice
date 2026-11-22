/* Lector del libro. El audio se configura por unidad en libro.json.
   Sin servicios externos ni envío de respuestas a un servidor. */
(function () {
  'use strict';
  const BOOK_ID = 'asallam-proverbios-v1';
  // Lectura del código · Configuración y almacenamiento.
  const STORE = 'asallam.proverbios.v1';
  const monthPattern = /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/;
  const DATA = globalThis.ProverbiosFichas;
  const total = DATA.length;
  const ids = DATA.map(ficha => ficha.id).join('|');
  const ids02 = DATA.map(ficha => String(ficha.id).padStart(2, '0')).join('|');
  const trackerPattern = new RegExp('^(' + ids + ')-[AB]$');
  const notePattern = new RegExp('^(respuesta|repaso)-(' + ids02 + ')$|^(habit|trigger)-(' + ids + ')-[AB]$|^review-(' + ids + ')-[AB]@(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$');
  const normalize = s => String(s).normalize('NFKC').replace(/[\s。、，,.!?！？・「」『』]/g, '');
  const localMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const habitPageId = unit => 'habitos' + String(4 * Math.floor((Number(unit) - 1) / 4) + 1).padStart(2, '0');
  const habitIdPattern = new RegExp('^habitos(' + ids02 + ')$');
  const resolvePageId = id => habitIdPattern.test(id) ? habitPageId(Number(id.slice(7))) : id;
  function monthLayout(month) {
    if (!monthPattern.test(month)) throw new Error('Mes no válido.');
    const [y, m] = month.split('-').map(Number);
    const length = new Date(y, m, 0).getDate();
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => i >= offset && i < offset + length ? i - offset + 1 : null);
  }
  // Lectura del código · Estado inicial y validación.
  function freshState() {
    return { book: BOOK_ID, version: 1, habitLayout: 'single', readingDefaults: 2, notes: {}, months: {}, marks: {}, seen: [], last: 'portada', preferences: { furigana: true, romaji: true, extra: true } };
  }
  function validateState(raw) {
    if (!raw || raw.book !== BOOK_ID || raw.version !== 1 || typeof raw.notes !== 'object' || !raw.notes || Array.isArray(raw.notes)) throw new Error('Esta copia no pertenece a este libro.');
    const out = freshState();
    for (const [key, value] of Object.entries(raw.notes)) {
      if (!notePattern.test(key) || typeof value !== 'string' || value.length > 600) throw new Error('La copia contiene respuestas no válidas.');
      out.notes[key] = value;
    }
    if (raw.months != null && (typeof raw.months !== 'object' || Array.isArray(raw.months))) throw new Error('Meses no válidos.');
    for (const [key, value] of Object.entries(raw.months || {})) {
      if (!trackerPattern.test(key) || typeof value !== 'string' || !monthPattern.test(value)) throw new Error('La copia contiene un mes no válido.');
      out.months[key] = value;
    }
    if (raw.marks != null && (typeof raw.marks !== 'object' || Array.isArray(raw.marks))) throw new Error('Calendarios no válidos.');
    for (const [key, value] of Object.entries(raw.marks || {})) {
      const [tracker, month, extra] = key.split('@');
      if (extra !== undefined || !trackerPattern.test(tracker) || !monthPattern.test(month || '') || !Array.isArray(value) || value.length > 31) throw new Error('La copia contiene un calendario no válido.');
      const max = Math.max(...monthLayout(month).filter(Boolean));
      if (value.some(d => !Number.isInteger(d) || d < 1 || d > max)) throw new Error('La copia contiene un día no válido.');
      out.marks[key] = [...new Set(value)].sort((a, b) => a - b);
    }
    if (Array.isArray(raw.seen)) out.seen = [...new Set(raw.seen.filter(n => Number.isInteger(n) && n >= 1 && n <= total))];
    if (typeof raw.last === 'string' && /^[a-z0-9-]{1,30}$/.test(raw.last)) out.last = raw.last;
    // Se conserva el archivo anterior completo. Si solo se usó el segundo
    // calendario, su hábito pasa al único calendario visible del proverbio.
    for (let unit = 1; unit <= total; unit++) {
      const a = `${unit}-A`, b = `${unit}-B`;
      const used = key => Boolean(out.notes[`habit-${key}`]?.trim()) || Object.entries(out.marks).some(([k, days]) => k.startsWith(`${key}@`) && days.length);
      if (raw.habitLayout !== 'single' && !used(a) && used(b)) {
        if (out.notes[`habit-${b}`] !== undefined) out.notes[`habit-${a}`] = out.notes[`habit-${b}`];
        if (out.months[b]) out.months[a] = out.months[b];
        for (const [key, days] of Object.entries(out.marks)) {
          if (key.startsWith(`${b}@`)) out.marks[`${a}@${key.split('@')[1]}`] = [...days];
        }
      }
    }
    return out;
  }
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { normalize, localMonth, monthLayout, freshState, validateState, habitPageId, resolvePageId };
    return;
  }
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const pages = $$('.sheet');
  const byId = new Map(pages.map((p, i) => [p.id, i]));
  const menu = $('#menu-dialog');
  let state = freshState(), current = 0, toastTimer, storageOK = true, saveTimer;
  let playingAudio = null, audioToken = 0, speech = null;
  let pdfBusy = false;
  try { const saved = localStorage.getItem(STORE); if (saved) state = validateState(JSON.parse(saved)); }
  catch (_) { storageOK = false; }

  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message;
    toastTimer = setTimeout(() => { $('#toast').textContent = ''; }, 6500);
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); storageOK = true; }
    catch (_) {
      storageOK = false;
      toast('El navegador no permite guardar los cambios. Mantén esta página abierta para conservarlos durante la sesión.');
    }
  }
  function delayedSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }
  // Lectura del código · Preferencias de lectura.
  function applyPreferences() {
    state.preferences = { furigana: true, romaji: true, extra: true };
    document.body.classList.remove('hide-furigana', 'hide-romaji');
    document.body.classList.add('show-extra');
  }
  function stopAudio() {
    audioToken++;
    if (playingAudio) { playingAudio.pause(); playingAudio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speech = null;
    $$('[data-audio]').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.lastChild.textContent = ' Escuchar'; });
  }
  function activeUnit() { return Number(pages[current].dataset.unit) || 1; }
  // Lectura del código · Selección y navegación de páginas.
  function showPage(id, updateHash = true, scroll = true) {
    id = resolvePageId(id);
    const next = byId.has(id) ? byId.get(id) : 0;
    if (next !== current) stopAudio();
    pages.forEach((p, i) => p.classList.toggle('is-active', i === next));
    current = next; state.last = pages[current].id;
    const unit = Number(pages[current].dataset.unit);
    if (unit && !state.seen.includes(unit) && pages[current].dataset.kind === 'life') state.seen.push(unit);
    $$('[data-seen]').forEach(s => { s.textContent = state.seen.includes(Number(s.dataset.seen)) ? '✓' : ''; });
    $('#page-label').textContent = `${current + 1} / ${pages.length}`;
    const kinds = {cover:'Portada',guide:'Cómo usar el libro',contents:'Índice',life:'Comprende',vocabulary:'Descubre el japonés',practice:'Practica', 'habit-page':'Cuaderno de hábitos',references:'Fuentes y notas'};
    const units = pages[current].dataset.units.split(',');
    const range = pages[current].dataset.kind === 'habit-page' ? `${units[0].padStart(2, '0')}–${units[units.length - 1].padStart(2, '0')}` : String(unit).padStart(2, '0');
    $('#page-context').textContent = (unit ? `${range} · ` : '') + kinds[pages[current].dataset.kind];
    $('#progress').style.width = `${(current + 1) / pages.length * 100}%`;
    $('#prev').disabled = current === 0; $('#next').disabled = current === pages.length - 1;
    if (updateHash) {
      try { history.replaceState(null, '', '#' + pages[current].id); } catch (_) { /* file:// can restrict history */ }
    }
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    delayedSave();
  }
  // Lectura del código · Notas del lector e impresión.
  function setNote(key, value) {
    state.notes[key] = value;
    $$('[data-note]').forEach(el => { if (el.dataset.note === key) el.value = value; });
    $$('[data-print-note]').forEach(el => { if (el.dataset.printNote === key) el.textContent = value; });
    delayedSave();
  }
  function syncPrintNotes() {
    $$('[data-print-note]').forEach(el => { el.textContent = state.notes[el.dataset.printNote] || ''; });
  }
  function monthLabel(month) {
    const [y, m] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  }
  // Lectura del código · Calendarios y registro personal.
  function renderCalendar(key, blank = false) {
    const card = $(`[data-tracker="${key}"]`);
    const input = card.querySelector('[data-month]');
    const month = state.months[key] || localMonth();
    input.value = month;
    card.querySelector('[data-print-month]').textContent = blank ? 'Mes: __________________' : monthLabel(month);
    const grid = card.querySelector('[data-calendar]');
    grid.replaceChildren();
    const selected = state.marks[`${key}@${month}`] || [];
    const now = new Date();
    const layout = blank ? Array(42).fill(null) : monthLayout(month);
    layout.forEach(day => {
      if (!day) {
        const span = document.createElement('span'); span.className = 'blank-day'; span.setAttribute('aria-hidden', 'true'); grid.append(span); return;
      }
      const b = document.createElement('button'); b.type = 'button'; b.textContent = String(day); b.dataset.day = String(day);
      b.setAttribute('aria-label', `${day} de ${monthLabel(month)}: ${selected.includes(day) ? 'practicado' : 'sin marcar'}`);
      b.setAttribute('aria-pressed', String(selected.includes(day)));
      if (month === localMonth(now) && day === now.getDate()) b.className = 'today';
      grid.append(b);
    });
  }
  function populate() {
    $$('[data-note]').forEach(el => { el.value = state.notes[el.dataset.note] || ''; });
    $$('[data-tracker]').forEach(el => renderCalendar(el.dataset.tracker));
    syncPrintNotes(); applyPreferences();
  }

  // Lectura del código · Voz y reproducción en japonés.
  async function japaneseVoice() {
    const ss = window.speechSynthesis;
    let voices = ss.getVoices();
    if (!voices.length) {
      await new Promise(resolve => {
        let timer;
        const done = () => { clearTimeout(timer); ss.removeEventListener('voiceschanged', done); resolve(); };
        ss.addEventListener('voiceschanged', done); timer = setTimeout(done, 1200);
      });
      voices = ss.getVoices();
    }
    return voices.find(v => /^ja(?:-|_|$)/i.test(v.lang));
  }
  async function playProverb(id, button) {
    const wasPlaying = button.getAttribute('aria-pressed') === 'true'; stopAudio();
    if (wasPlaying) return;
    const token = audioToken, p = DATA[id - 1];
    const note = $(`#audio-note-${id}`);
    button.setAttribute('aria-pressed', 'true'); button.lastChild.textContent = ' Detener';
    note.textContent = 'Preparando audio…';
    let fellBack = false, timeout;
    const finish = () => {
      if (token !== audioToken) return;
      button.setAttribute('aria-pressed', 'false'); button.lastChild.textContent = ' Escuchar';
    };
    const fallback = async () => {
      if (fellBack || token !== audioToken) return;
      fellBack = true; clearTimeout(timeout);
      if (playingAudio) { playingAudio.pause(); playingAudio = null; }
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
        note.textContent = 'Sin MP3 disponible. Este navegador no tiene lectura sintética.'; finish(); return;
      }
      const voice = await japaneseVoice();
      if (token !== audioToken) return;
      if (!voice) { note.textContent = 'Activa una voz japonesa en tu dispositivo para escuchar la síntesis.'; toast('No hay una voz japonesa disponible. Puedes añadirla en los ajustes de voz del dispositivo.'); finish(); return; }
      speech = new SpeechSynthesisUtterance(p.speech); speech.lang = 'ja-JP'; speech.voice = voice;
      speech.onend = finish;
      speech.onerror = e => { if (e.error !== 'canceled' && e.error !== 'interrupted' && token === audioToken) note.textContent = 'No se pudo iniciar la voz. Pulsa Escuchar para reintentar.'; finish(); };
      note.textContent = 'Voz sintética japonesa'; window.speechSynthesis.speak(speech);
    };
    const audio = new Audio(p.audio); playingAudio = audio;
    audio.addEventListener('error', fallback, { once: true });
    audio.addEventListener('playing', () => {
      if (token !== audioToken || fellBack) { audio.pause(); return; }
      clearTimeout(timeout); note.textContent = 'Grabación MP3';
    }, { once: true });
    audio.addEventListener('ended', finish, { once: true });
    timeout = setTimeout(fallback, 5000);
    try { await audio.play(); } catch (_) { await fallback(); }
  }

  // Lectura del código · Acciones de impresión y descarga.
  async function downloadPdf() {
    if (pdfBusy) return;
    pdfBusy = true;
    const button = $('#open-print');
    button.disabled = true; button.setAttribute('aria-busy', 'true');
    button.textContent = 'Buscando PDF…';
    stopAudio(); clearTimeout(saveTimer); save();
    try {
      let blob = await window.BookPdf.fetchPdf();
      let missingLogo = false;
      if (!blob) {
        button.textContent = 'Preparando PDF…';
        await new Promise(resolve => setTimeout(resolve, 0));
        const generated = await window.BookPdf.buildFallback();
        blob = generated.blob; missingLogo = generated.missingLogo;
      }
      window.BookPdf.download(blob);
      toast(missingLogo
        ? 'PDF descargado. No se pudo añadir el logo: comprueba data/proverbios/logo.png.'
        : 'PDF preparado. Encontrarás el archivo en tus descargas.');
    } catch (_) {
      toast('No se pudo descargar el PDF. Vuelve a intentarlo.');
    } finally {
      pdfBusy = false; button.disabled = false;
      button.removeAttribute('aria-busy'); button.textContent = 'Descargar PDF';
    }
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('button,a'); if (!target) return;
    if (target.dataset.close !== undefined) { target.closest('dialog').close(); return; }
    if (target.dataset.nav) { menu.close(); showPage(target.dataset.nav); return; }
    if (target.matches('a[href^="#"]') && target.getAttribute('href') !== '#book') {
      const id = target.getAttribute('href').slice(1); if (byId.has(id)) { event.preventDefault(); showPage(id); } return;
    }
    if (target.dataset.audio) { playProverb(Number(target.dataset.audio), target); return; }
    if (target.dataset.day) {
      const key = target.closest('[data-tracker]').dataset.tracker, month = state.months[key] || localMonth();
      const markKey = `${key}@${month}`, selected = new Set(state.marks[markKey] || []), day = Number(target.dataset.day);
      if (selected.has(day)) selected.delete(day); else selected.add(day);
      state.marks[markKey] = [...selected].sort((a, b) => a - b); renderCalendar(key); delayedSave();
      const replacement = $(`[data-calendar="${key}"] [data-day="${day}"]`); if (replacement) replacement.focus({ preventScroll: true });
      return;
    }
  });
  document.addEventListener('input', event => {
    const el = event.target;
    if (el.dataset.note) { state.notes[el.dataset.note] = el.value; delayedSave(); }
  });
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.dataset.month) {
      if (!monthPattern.test(el.value)) { renderCalendar(el.dataset.month); return; }
      state.months[el.dataset.month] = el.value; renderCalendar(el.dataset.month); delayedSave();
    }
  });
  $('#prev').addEventListener('click', () => { if (current > 0) showPage(pages[current - 1].id); });
  $('#next').addEventListener('click', () => { if (current < pages.length - 1) showPage(pages[current + 1].id); });
  $('#open-menu').addEventListener('click', () => { menu.showModal(); $('#menu-search').focus(); });
  $('#open-habits').addEventListener('click', () => showPage(habitPageId(activeUnit())));
  $('#open-print').addEventListener('click', downloadPdf);
  $('#menu-search').addEventListener('input', e => {
    const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = fold(e.target.value.trim()); let matches = 0;
    $$('[data-search]').forEach(b => { b.hidden = !fold(b.dataset.search).includes(query); if (!b.hidden) matches++; });
    $$('[data-menu-group]').forEach(g => { g.hidden = ![...g.querySelectorAll('[data-search]')].some(b => !b.hidden); });
    $('.no-results').hidden = matches > 0;
  });
  document.addEventListener('keydown', e => {
    if (menu.open || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select,button,a,summary,[contenteditable]')) return;
    if (e.key === 'ArrowRight' && current < pages.length - 1) { e.preventDefault(); showPage(pages[current + 1].id); }
    if (e.key === 'ArrowLeft' && current > 0) { e.preventDefault(); showPage(pages[current - 1].id); }
  });
  window.addEventListener('hashchange', () => { const id = resolvePageId(location.hash.slice(1)); if (byId.has(id)) showPage(id, false); });
  window.addEventListener('beforeprint', syncPrintNotes);
  window.addEventListener('pagehide', () => { save(); stopAudio(); });
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  populate();
  const requested = resolvePageId(location.hash.slice(1));
  showPage(byId.has(requested) ? requested : state.last, false, false);
  document.body.classList.add('enhanced');
  if (!storageOK) toast('No se pudieron recuperar los datos guardados en este navegador.');
})();
