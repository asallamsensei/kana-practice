/* Puente entre el archivo editorial y el lector. No contiene páginas del libro. */
(function (root) {
  'use strict';
  const PATH = 'data/proverbios/';
  const vacias = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
  const pad = n => String(n).padStart(2, '0');
  const validar = (ok, detalle) => { if (!ok) throw new Error(detalle); };
  const esc = value => String(value).replace(/[&<>]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[c]));
  const atributo = value => esc(value).replace(/["']/g, c => c === '"' ? '&quot;' : '&#x27;');

  // El banco es un archivo editorial de confianza: atributos y fragmentos
  // legados pertenecen al propio libro, no a mensajes ni entradas del lector.
  function contenido(nodos, ficha, fichas, numeros, pagina) {
    validar(Array.isArray(nodos), 'Contenido de página no válido.');
    return nodos.map(n => {
      if (typeof n === 'string') return esc(n);
      validar(n && typeof n === 'object', 'Nodo no válido.');
      if ('entidad_original' in n) {
        validar(/^&(?:\w+|#\d+|#[xX][a-f0-9]+);?$/i.test(n.entidad_original), 'Entidad no válida.');
        return n.entidad_original;
      }
      if ('html_legado' in n) return n.html_legado;
      if ('numero_de_pagina' in n) {
        validar(numeros.has(n.numero_de_pagina), 'Referencia a página inexistente.');
        return numeros.get(n.numero_de_pagina);
      }
      if ('folio' in n) return `${pad(pagina)} / ${numeros.size}`;
      if ('campo_de_unidad' in n) {
        const campo = n.campo_de_unidad;
        validar(ficha && /^(jp|kana|romaji|title|habits\.[01])$/.test(campo), 'Referencia a ficha no válida.');
        return esc(campo.startsWith('habits.') ? ficha.habits[Number(campo.slice(-1))] : ficha[campo]);
      }
      const tag = n.etiqueta;
      validar(typeof tag === 'string' && /^[a-z][a-z0-9:-]*$/i.test(tag), 'Etiqueta no válida.');
      const attrs = n.atributos_html || '';
      const abre = '<' + tag + attrs + '>';
      if (vacias.has(tag.toLowerCase()) || attrs.endsWith('/')) return abre;
      const contexto = 'unidad_de_contexto' in n ? fichas.get(n.unidad_de_contexto) : ficha;
      return abre + contenido(n.contenido || [], contexto, fichas, numeros, pagina) +
        (n.cierre_original ?? '</' + tag + '>');
    }).join('');
  }

  function componer(banco) {
    validar(banco?.version_esquema === 1, 'Versión de libro incompatible.');
    ampliar(banco);
    const g = banco.grupos, fichas = new Map(), paginas = new Map(), registro = (grupo, ficha) => {
      for (const p of grupo) {
        validar(/^[A-Za-z][A-Za-z0-9_-]*$/.test(p.id) && !paginas.has(p.id), 'Página inválida o duplicada.');
        validar(!ficha || p.unidad === ficha.id, 'La página no coincide con su ficha.');
        paginas.set(p.id, {p, ficha});
      }
    };
    registro(g.inicio);
    g.unidades.forEach((u, i) => {
      const f = u.ficha;
      validar(f.id === i+1 && ['jp','kana','speech','romaji','title'].every(k => typeof f[k] === 'string' && f[k].trim()) &&
        /^data\/proverbios\/[A-Za-z0-9_-]+\.mp3$/.test(f.audio) &&
        Array.isArray(f.habits) && f.habits.length === 2 && f.habits.every(h => typeof h === 'string' && h.trim()),
        'Ficha inválida en la unidad ' + (i+1) + '.');
      validar(u.paginas.map(p => p.tipo).join(',') === 'life,vocabulary,practice', 'La unidad requiere las tres etapas.');
      fichas.set(f.id, f); registro(u.paginas, f);
    });
    registro(g.habitos); registro(g.referencias);
    const numeros = new Map(banco.orden_paginas.map((id, i) => [id, i+1]));
    validar(numeros.size === paginas.size && banco.orden_paginas.length === paginas.size, 'Orden de páginas no válido.');
    const html = banco.orden_paginas.map(id => {
      validar(paginas.has(id), 'Página no encontrada: ' + id);
      const {p, ficha} = paginas.get(id), i = numeros.get(id);
      return (p.previo_html || '') + `<section
     class="sheet ${atributo(p.clase)}" id="${atributo(id)}" data-page="${i}" data-unit="${atributo(p.unidad)}" data-units="${atributo(p.unidades)}" data-kind="${atributo(p.tipo)}" style="${atributo(p.estilo)}" aria-label="${atributo(p.etiqueta_accesible.replace('{pagina}', i))}">` +
        contenido(p.contenido, ficha, fichas, numeros, i) + '</section>';
    }).join('') + (banco.despues_de_paginas_html || '');
    const menu = banco.menu.map(g => `<section
     class="menu-group" data-menu-group><h3>${esc(g.encabezado)}</h3>` + g.entradas.map(e => {
      const {unidad, pagina} = e, f = fichas.get(unidad);
      validar(f && paginas.get(pagina)?.ficha === f, 'Destino del menú no válido.');
      return `<button
     class="menu-link" data-nav="${atributo(pagina)}" data-search="${atributo(`${unidad} ${f.title} ${f.jp} ${f.romaji}`)}"><span class="menu-n">${pad(unidad)}</span><span>${esc(f.title)}<span class="jp" lang="ja">${esc(f.jp)}</span></span><span class="check" data-seen="${unidad}" aria-label="Consultado"></span></button>`;
    }).join('') + '</section>').join('');
    return {html, menu, fichas: [...fichas.values()], total: paginas.size};
  }

  // Las unidades 21–99 se añaden con el mismo esquema; su navegación y
  // sus tarjetas de hábitos se completan a partir de los modelos existentes.
  function* recorrer(nodos) {
    for (const n of nodos) if (n && typeof n === 'object') {
      yield n;
      yield* recorrer(n.contenido || []);
    }
  }
  function conClase(nodos, clase) {
    const patron = new RegExp('\\bclass="[^"]*(?<![a-z0-9-])' + clase + '(?![a-z0-9-])[^"]*"');
    return [...recorrer(nodos)].find(n => patron.test(n.atributos_html || ''));
  }
  function texto(nodos) {
    return nodos.map(n => typeof n === 'string' ? n : texto(n.contenido || [])).join('');
  }
  function traduccion(u) {
    if (typeof u.traduccion_habitos === 'string') return u.traduccion_habitos;
    const trad = conClase(u.paginas[0].contenido, 'translations');
    const nat = (trad?.contenido || []).find(n => n?.contenido && texto(n.contenido).trimStart().startsWith('NATURAL'));
    const p = nat && [...recorrer(nat.contenido)].find(n => n.etiqueta === 'p');
    return p ? texto(p.contenido).trim() : '';
  }
  const el = (etiqueta, contenido, clase, otros = {}) =>
    ({etiqueta, contenido, ...(clase ? {atributos_html: ` class="${clase}"`} : {}), ...otros});
  function indice(nuevas, n) {
    const enlaces = nuevas.map(u => {
      const uid = u.ficha.id, destino = u.paginas[0].id;
      return el('a', [
        el('span', [pad(uid)], 'toc-no'),
        el('span', [
          el('strong', [{campo_de_unidad:'title'}]),
          el('span', [{campo_de_unidad:'jp'}], null, {atributos_html:' class="toc-jp" lang="ja"'})
        ], 'toc-text'),
        el('span', [{numero_de_pagina:destino}], 'toc-page')
      ], null, {unidad_de_contexto:uid, atributos_html:` class="toc-item" href="#${atributo(destino)}"`});
    });
    return {id:'indice-extra-'+n, tipo:'contents', clase:'contents', unidad:0, unidades:'0', estilo:'--accent:#a81421',
      etiqueta_accesible:'Página {pagina}: Índice de unidades añadidas', previo_html:'\n', contenido:[
        el('header',[el('span',['Índice'],'eyebrow'), el('span',['Unidades añadidas'],'stage')],'page-head'),
        el('div',[el('h2',['Tu recorrido · Unidades añadidas']), el('div',enlaces,'toc-group')],'page-content'),
        el('footer',[el('span',['Asallam Sensei · Desapendéjate']), el('span',[{folio:true}],'page-num')],'folio')
      ]};
  }
  const clone = obj => JSON.parse(JSON.stringify(obj));
  function ampliar(b) {
    const g = b.grupos, unidades = g.unidades, orden = b.orden_paginas;
    validar(unidades.length > 0 && unidades.length <= 99, 'Cantidad de unidades inválida.');
    if (unidades.length <= 20) return;
    const nuevas = unidades.slice(20), insertar = (ref, ...ids) => {
      const i = orden.indexOf(ref);
      validar(i !== -1, 'No se encontró la página de anclaje.');
      orden.splice(i, 0, ...ids);
    };
    for (const u of nuevas) for (const p of u.paginas) if (!orden.includes(p.id)) insertar(g.habitos[0].id, p.id);
    for (let i = 0; i < nuevas.length; i+=10) {
      const p = indice(nuevas.slice(i, i+10), i/10+1);
      g.inicio.push(p); insertar(unidades[0].paginas[0].id, p.id);
    }
    const modelo = g.habitos.at(-1), modeloTarjeta = conClase(modelo.contenido,'habit-card');
    const cubiertas = new Set(g.habitos.flatMap(h => h.unidades.split(',').map(Number)));
    for (let i = 0; i < nuevas.length; i+=4) {
      const bloque = nuevas.slice(i,i+4), lista = bloque.map(u => u.ficha.id), primero = lista[0], ultimo = lista.at(-1);
      if (lista.every(n => cubiertas.has(n))) continue;
      validar(!lista.some(n => cubiertas.has(n)), 'El grupo de hábitos debe estar cubierto entero.');
      const titulo = primero === ultimo ? 'Hábitos · Proverbio '+pad(primero) : 'Hábitos · Proverbios '+pad(primero)+'–'+pad(ultimo);
      const pagina = Object.assign(clone(modelo), {id:'habitos'+pad(primero),unidad:primero,unidades:lista.join(','),
        etiqueta_accesible:'Página {pagina}: '+titulo, previo_html:'\n'});
      conClase(pagina.contenido,'eyebrow').contenido = [titulo];
      conClase(pagina.contenido,'habit-trackers').contenido = bloque.map(u => {
        const t = clone(modeloTarjeta), anterior=t.unidad_de_contexto, n=u.ficha.id;
        for (const parte of recorrer([t])) {
          if (parte.unidad_de_contexto === anterior) parte.unidad_de_contexto=n;
          if (!parte.atributos_html) continue;
          const a = parte.atributos_html;
          parte.atributos_html=a
            .replace(new RegExp('((?:respuesta|repaso)-)'+pad(anterior)+'(?=")','g'),(_,x)=>x+pad(n))
            .replace(new RegExp('((?:audio-note-|data-audio="))'+anterior+'(?=")','g'),(_,x)=>x+n)
            .replace(new RegExp('([-"])'+anterior+'(?=-[AB]")','g'),(_,x)=>x+n)
            .replace(new RegExp('(proverbio )'+anterior+'(?=")','gi'),(_,x)=>x+n);
          if (/class="(?:unit-number|proverb-no)"/.test(a) && JSON.stringify(parte.contenido) === JSON.stringify([pad(anterior)])) parte.contenido=[pad(n)];
        }
        conClase([t],'habit-spanish').contenido=[traduccion(u)];
        return t;
      });
      g.habitos.push(pagina); insertar(g.referencias[0].id,pagina.id);
    }
    const enMenu = new Set(b.menu.flatMap(g => g.entradas.map(e=>e.unidad)));
    const pendientes = nuevas.filter(u=>!enMenu.has(u.ficha.id)).map(u=>({unidad:u.ficha.id,pagina:u.paginas[0].id}));
    if (pendientes.length) b.menu.push({encabezado:'Unidades añadidas',entradas:pendientes});
  }

  function ejecutar(nombre) {
    return new Promise((resolve,reject)=>{
      const s = document.createElement('script');
      s.src = PATH + nombre;
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar ' + nombre + '.'));
      document.head.append(s);
    });
  }
  async function iniciar() {
    const status=document.getElementById('book-status');
    const clave=document.getElementById('student-password');
    const formulario=document.getElementById('student-access-form');
    try {
      validar(root.location.protocol !== 'file:', 'Abre el libro desde el sitio web o un servidor local, no como archivo.');
      const controlador = new AbortController();
      const temporizador = setTimeout(()=>controlador.abort(),12000);
      let ficha;
      try {
        const r=await fetch(PATH+'libro.json',{cache:'no-cache',signal:controlador.signal});
        validar(r.ok,'No se encontró el contenido del libro.');
        ficha=componer(await r.json());
      } finally { clearTimeout(temporizador); }
      document.getElementById('book').innerHTML=ficha.html;
      document.querySelector('#menu-dialog .no-results').insertAdjacentHTML('beforebegin',ficha.menu);
      document.getElementById('page-label').textContent='1 / '+ficha.total;
      root.ProverbiosFichas=ficha.fichas;
      validar(root.BookPdf, 'No se pudo iniciar el módulo PDF.');
      await ejecutar('lector.js');
      validar(document.body.classList.contains('enhanced'), 'No se pudo iniciar el lector.');
      await ejecutar('hoja-habitos.js');
      await ejecutar('acceso.js');
      clave.disabled=false;
      formulario.querySelector('button[type="submit"]').disabled=false;
      status.hidden=true;
      if (document.body.classList.contains('access-locked')) clave.focus();
    } catch (e) {
      status.textContent=e?.message?.startsWith('Abre el libro') ? e.message :
        'No se pudo cargar el libro. Recarga la página o verifica que data/proverbios/libro.json esté disponible.';
      clave.disabled=true;
      formulario.querySelector('button[type="submit"]').disabled=true;
      console.error('[Proverbios]', e);
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports={componer};
  else iniciar();
})(typeof window === 'undefined' ? globalThis : window);
