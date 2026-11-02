/* Shared read-only Turista catalogs: preserve source IDs, deduplicate selected practice only. */
(function(root){'use strict';
const text=v=>typeof v==='string'?v.trim():'', unique=xs=>[...new Set(xs.filter(Boolean))];
const jpKey=v=>text(v).normalize('NFKC').replace(/\s+/g,' ').trim();
const esKey=v=>text(v).normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[¿?¡!.,;:]/g,' ').replace(/\s+/g,' ').trim();
const bad=k=>['__proto__','prototype','constructor'].includes(k);
const aliases={'Japan reeru pasu':'japan reeru pasu','eigo ga hanasemasu ka?':'eigo ga hanasemasu ka'};
function legacyAudio(romaji){return romaji?'data/audios/turista/'+encodeURIComponent(aliases[romaji]||romaji)+'.mp3':null;}
function normalizeData(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('La lista de viaje no tiene el formato esperado.');
 const items=[],blocks=[];
 for(const [block,rows]of Object.entries(data)){
  if(!Array.isArray(rows)||bad(block))continue;const before=items.length;
  for(const r of rows){if(!r||typeof r!=='object')continue;const jp=text(r.japones),es=text(r.espanol),romaji=text(r.romaji),reading=text(r.lecturas_kanji||r.lectura_kanji||r.lectura_kanjis);if(!jp||!es)continue;
   items.push({id:JSON.stringify([block,jp,es]),block,blockLabel:block,group:'fundamentos',source:'fundamentos',jp,es,natural:'',romaji,reading:romaji||reading,isKanji:/kanji/i.test(block),audioType:'mp3',audio:legacyAudio(romaji)});
  }if(items.length>before)blocks.push(block);
 }if(!items.length)throw Error('La lista no contiene palabras.');return {items,rows:items,blocks};
}
function normalizeEasy(data){
 if(!data||data.schema_version!==1||data.id!=='easy_japanese'||!Array.isArray(data.lecciones))throw Error('La colección Conversación no tiene el formato esperado.');
 const items=[],blocks=[],seenBlocks=new Set(),idJp=new Map();
 for(const lesson of data.lecciones){
  if(!lesson||!/^leccion_\d+$/.test(text(lesson.id))||!Array.isArray(lesson.vocabulario))throw Error('Lección de Conversación inválida.');
  const block='easy_japanese:'+lesson.id;if(seenBlocks.has(block))throw Error('Lección de Conversación duplicada.');seenBlocks.add(block);
  const label=text(lesson.titulo)||'Lección '+lesson.numero,before=items.length;
  for(const r of lesson.vocabulario){
   if(!r||!/^ej_[a-zA-Z0-9_-]+$/.test(text(r.id)))throw Error('Identificador de Conversación inválido.');
   const jp=text(r.japones),es=text(r.espanol_literal),romaji=text(r.romaji),natural=text(r.espanol_natural),id='easy_japanese:'+r.id;
   if(!jp||!es||!romaji)throw Error('Entrada de Conversación incompleta.');
   if(idJp.has(id)&&idJp.get(id)!==jpKey(jp))throw Error('Identificador de Conversación ambiguo.');idJp.set(id,jpKey(jp));
   items.push({id,block,blockLabel:label,group:'conversacion',source:'easy_japanese',jp,es,natural,romaji,reading:romaji,readingKana:text(r.lectura_kana),isKanji:false,audioType:'tts',audio:null,lesson:lesson.numero,sourceUrl:text(r.fuente)});
  }if(items.length>before)blocks.push({id:block,label,group:'conversacion',defaultEnabled:lesson.activada_por_defecto!==false});
 }
 if(!items.length)throw Error('Conversación no contiene palabras.');return {items,rows:items,blocks};
}
function buildCatalog(legacy,easy){
 const a=normalizeData(legacy),b=normalizeEasy(easy),rows=a.items.concat(b.items),blocks=a.blocks.map(id=>({id,label:id,group:'fundamentos',defaultEnabled:true})).concat(b.blocks),allIds=unique(rows.map(r=>r.id));
 return {rows,items:rows,blocks,groups:[{id:'fundamentos',label:'Fundamentos',blocks:a.blocks.slice()},{id:'conversacion',label:'Conversación',blocks:b.blocks.map(b=>b.id)}],allIds,allIDs:allIds,ids:allIds};
}
function meanings(item){return unique([item.es,item.natural,...(item.acceptedMeanings||[]),...(item.acceptedEs||[])]);}
function semanticKeys(item){return new Set(meanings(item).map(esKey).filter(Boolean));}
function conflicts(a,b){if(jpKey(a.jp)===jpKey(b.jp))return true;const x=semanticKeys(a),y=semanticKeys(b);return [...x].some(k=>y.has(k));}
function selectedPool(rows,selected,options={}){
 const blocks=new Set(selected||[]),allowed=options.allowedIds?new Set(options.allowedIds):null,groups=new Map();
 for(const r of rows){if(!blocks.has(r.block)||(allowed&&!allowed.has(r.id)))continue;const key=jpKey(r.jp);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const out=[];
 for(const variants of groups.values()){
  // Source priority is deterministic, but never selects a variant from a disabled block.
  const primary=variants.find(r=>r.group==='fundamentos')||variants[0],acceptedMeanings=unique(variants.flatMap(r=>[r.es,r.natural])),acceptedJp=unique(variants.map(r=>r.jp));
  out.push({...primary,variants:variants.slice(),sourceIds:unique(variants.map(r=>r.id)),blocks:unique(variants.map(r=>r.block)),labels:unique(variants.map(r=>r.blockLabel||r.block)),acceptedMeanings,acceptedEs:acceptedMeanings,acceptedJp,readings:unique(variants.map(r=>r.reading)),romajiVariants:unique(variants.map(r=>r.romaji)),naturalVariants:unique(variants.map(r=>r.natural))});
 }return out;
}
function aggregateById(rows){
 const byId=new Map();for(const row of rows){if(!byId.has(row.id))byId.set(row.id,[]);byId.get(row.id).push(row);}
 return [...byId.values()].map(variants=>{const primary=variants[0],acceptedMeanings=unique(variants.flatMap(r=>[r.es,r.natural]));return {...primary,variants:variants.slice(),sourceIds:[primary.id],blocks:unique(variants.map(r=>r.block)),labels:unique(variants.map(r=>r.blockLabel||r.block)),acceptedMeanings,acceptedEs:acceptedMeanings,acceptedJp:unique(variants.map(r=>r.jp)),readings:unique(variants.map(r=>r.reading)),romajiVariants:unique(variants.map(r=>r.romaji)),naturalVariants:unique(variants.map(r=>r.natural))};});
}
function choicesConflict(a,b,mode){return conflicts(a,b);}
function validAnswers(item,field,pool=[]){
 if(field==='es')return meanings(item);
 if(field==='jp'){const keys=semanticKeys(item);return unique([item.jp,...(item.acceptedJp||[]),...pool.filter(x=>[...semanticKeys(x)].some(k=>keys.has(k))).flatMap(x=>[x.jp,...(x.acceptedJp||[])])]);}
 return unique([item[field]]);
}
function distractors(item,pool,field){const valid=new Set(validAnswers(item,field,pool).map(field==='jp'?jpKey:esKey));return pool.filter(x=>!conflicts(item,x)&&!valid.has((field==='jp'?jpKey:esKey)(x[field])));}
const api={normalizeData,normalizeLegacy:normalizeData,normalizeEasy,buildCatalog,selectedPool,selectPool:selectedPool,jpKey,esKey,meanings,semanticKeys,conflicts,choicesConflict,aggregateById,validAnswers,distractors,legacyAudio};
root.AsallamTuristaCatalog=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
