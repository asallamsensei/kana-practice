/* Adapter for the transcribed fichas JSON. Does not load or change the source JSON.
 * repaso.html loads the audited file through Repaso.load(path, RepasoFichas.adapt).
 * All notes remain in source order and all source text is preserved literally.
 */
(function (root) {
  'use strict';
  function adapt(raw) {
    if (!raw || !Array.isArray(raw.fichas)) throw Error('Faltan las fichas del repaso.');
    const items = [], references = [], ids = new Set();
    raw.fichas.forEach((ficha, fichaIndex) => {
      if (!ficha || typeof ficha.anime !== 'string' || typeof ficha.encabezado !== 'string' || !Array.isArray(ficha.tablas) || !Array.isArray(ficha.notas) || ficha.notas.some(note => typeof note !== 'string')) throw Error('Una ficha está incompleta.');
      const fichaId = String(ficha.numero ?? fichaIndex + 1);
      if (ids.has(fichaId)) throw Error('Hay dos fichas con el mismo número.');
      ids.add(fichaId);
      const group = 'Ficha ' + fichaId + ' · ' + ficha.anime;
      references.push({group, title:group, header:ficha.encabezado, paragraphs:[...ficha.notas]});
      ficha.tablas.forEach((tabla, tablaIndex) => {
        if (!tabla || !Array.isArray(tabla.columnas)) throw Error('Una tabla está incompleta.');
        tabla.columnas.forEach((columna, columnaIndex) => {
          if (!columna || ['japones','romaji','espanol'].some(key => typeof columna[key] !== 'string') || !Array.isArray(columna.furigana) || columna.furigana.some(reading => !reading || typeof reading.texto_base !== 'string' || typeof reading.lectura !== 'string')) throw Error('Una columna está incompleta.');
          const detail = ['Rōmaji: ' + columna.romaji];
          if (columna.furigana.length) detail.push('Furigana:\n' + columna.furigana.map(reading => reading.texto_base + '（' + reading.lectura + '）').join('\n'));
          items.push({
            id:'ficha:' + fichaId + ':tabla:' + (tablaIndex + 1) + ':columna:' + (columnaIndex + 1),
            front:columna.japones,
            back:columna.espanol,
            group,
            detail:detail.join('\n'),
            // Device speech is optional. No recording path or voice is invented.
            speechText:columna.japones,
            lang:'ja-JP'
          });
        });
      });
    });
    return {title:'Repaso a tu ritmo', description:items.length + ' entradas de ' + raw.fichas.length + ' fichas · japonés, traducción y notas originales.', sideNames:['Japonés','Español'], languages:['ja','es'], items, references};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {adapt};
  root.RepasoFichas = {adapt};
})(typeof window !== 'undefined' ? window : globalThis);
