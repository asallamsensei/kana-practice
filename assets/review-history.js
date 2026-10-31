/* One local, per-item review ledger. Reading/Explorar never records practice. */
(function(root){'use strict';
const APPS=['kana','jlpt','kanji','oraciones','ingles','turista','anime','oraciones_ingles'];
const PREFIX='asallam_reviews_v1_',VERSION=1,MAX_ITEMS=50000;
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v), own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k), bad=k=>k==='prototype'||Object.prototype.hasOwnProperty.call(Object.prototype,k);
const count=v=>Number.isSafeInteger(v)&&v>=0, safeId=v=>typeof v==='string'&&v.length>0&&v.length<=3000&&!bad(v);
const blank=()=>({version:VERSION,items:{},catalogs:{}});
const clone=v=>JSON.parse(JSON.stringify(v));
function key(app){if(!APPS.includes(app))throw Error('Aplicativo no compatible.');return PREFIX+app;}
function counts(v,fields){if(!obj(v))throw Error('Contadores inválidos.');for(const k of fields)if(!count(v[k]))throw Error('Contador inválido.');}
function validate(app,v){key(app);if(!obj(v)||v.version!==VERSION||!obj(v.items)||!obj(v.catalogs)||Object.keys(v.items).length>MAX_ITEMS)throw Error('Historial de repasos incompatible.');
for(const k of Object.keys(v))if(!['version','items','catalogs'].includes(k))throw Error('Campo de historial desconocido.');
let magnitude=0;const add=n=>{magnitude+=n;if(!Number.isSafeInteger(magnitude))throw Error('Totales demasiado grandes.');};
for(const [id,item]of Object.entries(v.items)){if(!safeId(id)||!obj(item)||!obj(item.purposes)||Object.keys(item.purposes).length>50)throw Error('Elemento de historial inválido.');for(const k of Object.keys(item))if(!['purposes'].includes(k))throw Error('Detalle de historial desconocido.');for(const [purpose,row]of Object.entries(item.purposes)){if(!safeId(purpose)||purpose.length>120)throw Error('Motivo inválido.');counts(row,['correct','wrong','skipped']);add(row.correct);add(row.wrong);add(row.skipped);if(Object.keys(row).some(k=>!['correct','wrong','skipped'].includes(k)))throw Error('Contador desconocido.');}
}
if(Object.keys(v.catalogs).length>200)throw Error('Demasiados catálogos.');for(const [scope,ids]of Object.entries(v.catalogs)){if(!safeId(scope)||!Array.isArray(ids)||ids.length>MAX_ITEMS||ids.some(id=>!safeId(id))||new Set(ids).size!==ids.length)throw Error('Catálogo inválido.');}if(new Set(Object.values(v.catalogs).flat()).size>MAX_ITEMS)throw Error('Catálogo combinado demasiado grande.');return true;}
function read(app,s){const raw=(s||root.localStorage).getItem(key(app));if(raw===null)return blank();const v=JSON.parse(raw);validate(app,v);return v;}
function write(app,v,s){validate(app,v);(s||root.localStorage).setItem(key(app),JSON.stringify(v));try{root.dispatchEvent?.(new Event('asallam-reviews-change'));}catch{}return true;}
function warning(){try{if(!root.document||root.document.getElementById('review-save-warning'))return;const e=root.document.createElement('p');e.id='review-save-warning';e.setAttribute('role','alert');e.textContent='No se pudo guardar el historial de repasos. Conserva una copia de tu avance y revisa el almacenamiento del navegador.';e.style.cssText='padding:12px;border:1px solid currentColor;border-radius:10px;margin:12px;';root.document.body?.prepend(e);}catch{}}
function attempt(fn){try{return fn();}catch{warning();return false;}}
function registerCatalog(app,ids,scope='default'){return attempt(()=>{if(!safeId(scope)||!Array.isArray(ids)||ids.some(id=>!safeId(id)))throw Error('Catálogo inválido.');const all=[...new Set(ids)].sort();if(all.length>MAX_ITEMS)throw Error('Catálogo demasiado grande.');const v=read(app);if(JSON.stringify(v.catalogs[scope])===JSON.stringify(all))return true;v.catalogs[scope]=all;return write(app,v);});}
function record(app,id,purpose,outcome){return attempt(()=>{if(!safeId(id)||!safeId(purpose)||purpose.length>120||!['correct','wrong','skipped'].includes(outcome))throw Error('Repaso inválido.');const v=read(app),item=v.items[id]||(v.items[id]={purposes:{}}),row=item.purposes[purpose]||(item.purposes[purpose]={correct:0,wrong:0,skipped:0});if(row[outcome]>=Number.MAX_SAFE_INTEGER)throw Error('Contador demasiado grande.');row[outcome]++;return write(app,v);});}
function totals(item){const out={correct:0,wrong:0,skipped:0};for(const p of Object.values(item?.purposes||{}))for(const k of Object.keys(out))out[k]+=p[k];out.reviews=out.correct+out.wrong;out.practiced=out.reviews>0;return out;}
function summary(app,s){const v=read(app,s),ids=new Set(Object.values(v.catalogs).flat()),hasCatalog=Object.keys(v.catalogs).length>0,out={correct:0,wrong:0,skipped:0,reviews:0,seen:0,total:hasCatalog?ids.size:null,available:true};for(const [id,item]of Object.entries(v.items)){if(hasCatalog&&!ids.has(id))continue;const t=totals(item);for(const k of ['correct','wrong','skipped','reviews'])out[k]+=t[k];if(t.practiced)out.seen++;}out.percent=out.total?Math.floor(out.seen/out.total*10000)/100:null;return out;}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(app,id){try{const item=read(app).items[id],t=totals(item);let html='<span class="review-history" style="display:block;margin-top:8px;font-size:12px;line-height:1.5;white-space:normal"><span style="display:block;font-weight:700">Repasos registrados: '+t.reviews+'</span>';for(const [purpose,row]of Object.entries(item?.purposes||{}).sort(([a],[b])=>a.localeCompare(b,'es'))){html+='<span style="display:block">'+escape(purpose)+': '+row.correct+' aciertos · '+row.wrong+' errores'+(row.skipped?' · '+row.skipped+' sin responder':'')+'</span>';}
if(!t.reviews&&!t.skipped)html+='<span style="display:block">Sin respuestas registradas desde esta actualización.</span>';
return html+'</span>';}catch{return '<span class="review-history" style="display:block">Historial de repasos no disponible; los datos guardados no se han modificado.</span>';}}
function clear(app){return attempt(()=>{const v=read(app);v.items={};return write(app,v);});}
function clearItems(app,ids){return attempt(()=>{if(!Array.isArray(ids)||ids.some(id=>!safeId(id)))throw Error('Elementos inválidos.');const v=read(app);for(const id of ids)delete v.items[id];return write(app,v);});}
const api={APPS,PREFIX,key,validate,record,registerCatalog,render,summary,clear,clearItems,snapshot:(app,s)=>clone(read(app,s)),replace:(app,data)=>{validate(app,data);return write(app,clone(data));}};
root.AsallamReviews=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

