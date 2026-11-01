/* Global error selection is read-only; every response keeps its source identity and purpose. */
(function(root){'use strict';
const keyOf=(item,purpose)=>JSON.stringify([item.app,item.id,purpose]);
const order=(a,b)=>b.wrong-a.wrong||(a.key<b.key?-1:a.key>b.key?1:0);
const good=s=>typeof s==='string'&&s.trim().length>0;
function sound(item,core){return core.normalize(item.soundKey||item.romaji||item.reading||item.jp).replace(/[\s'’]/g,'').replace(/[ōô]/g,'ou').replace(/[ūû]/g,'uu');}
function overlaps(a,b,core){const keys=new Set((a.semanticKeys||[]).map(core.normalize));return (b.semanticKeys||[]).some(v=>keys.has(core.normalize(v)));}
function descriptors(item,purpose){return item.descriptors?.[purpose]||[];}
const poolCache=new WeakMap();
function pools(all){if(poolCache.has(all))return poolCache.get(all);const questions=new Map(),matches=new Map();for(const other of all){for(const [p,ds] of Object.entries(other.descriptors||{})){const k=JSON.stringify([other.app,other.family,p]);if(!questions.has(k))questions.set(k,[]);for(const x of ds)questions.get(k).push({other,x});}if(other.matchPurpose){const k=JSON.stringify([other.app,other.family,other.matchPurpose]);if(!matches.has(k))matches.set(k,[]);matches.get(k).push(other);}}const value={questions,matches};poolCache.set(all,value);return value;}
function choicesFor(item,purpose,d,all,core){
 const accepted=new Set((d.accepted?.length?d.accepted:[d.answer]).map(core.normalize));accepted.add(core.normalize(d.answer));
 const values=[d.answer],seen=new Set(accepted);
 const add=v=>{const n=core.normalize(v);if(good(v)&&!seen.has(n)&&!values.some(a=>accepts({...d,accepted:[a]},v,core))){seen.add(n);values.push(v);}};
 if(Array.isArray(d.choices)){for(const v of d.choices)add(v);}
 else {
  const pool=pools(all).questions.get(JSON.stringify([item.app,item.family,purpose]))||[];
  for(const {other,x} of core.shuffle(pool)){
   if(other.id===item.id||overlaps(item,other,core))continue;
   if(d.auditory&&sound(item,core)===sound(other,core))continue;
   if(d.pool&&x.pool!==d.pool)continue;
   if(!d.auditory&&core.normalize(x.prompt)===core.normalize(d.prompt))continue;
   if((x.accepted||[x.answer]).some(v=>accepts({...d,accepted:[d.answer,...(d.accepted||[])]},v,core)))continue;
   add(x.answer);if(values.length===4)break;
  }
 }
 return core.shuffle(values.slice(0,4));
}
function adapted(item,purpose,all,core,activity){
 const ds=descriptors(item,purpose).filter(d=>d.activities?.includes(activity)&&good(d.prompt)&&good(d.answer));
 for(const d of core.shuffle(ds)){
  const accepted=[...new Set([d.answer,...(d.accepted||[])].filter(good))];
  const choices=activity==='quiz'?choicesFor(item,purpose,d,all,core):[];
  if(activity==='quiz'&&choices.length<2)continue;
  return {...d,item,purpose,accepted,choices,activity,hint:d.hint||(activity==='write'?'Escribe la respuesta.':'Elige la respuesta correcta.')};
 }
 return null;
}
function matchOptions(item,all,core){
 const prompt=core.normalize(item.matchPrompt||item.jp),answer=core.normalize(item.matchAnswer||core.answerFor(item));
 const seen=new Set([answer]);const out=[item];
 for(const other of core.shuffle(pools(all).matches.get(JSON.stringify([item.app,item.family,item.matchPurpose]))||[])){
  if(other.app!==item.app||other.family!==item.family||other.id===item.id||other.matchPurpose!==item.matchPurpose||overlaps(item,other,core))continue;
  const p=core.normalize(other.matchPrompt||other.jp),a=core.normalize(other.matchAnswer||core.answerFor(other));
  if(!p||!a||p===prompt||seen.has(a))continue;seen.add(a);out.push(other);if(out.length===3)break;
 }
 return out;
}
function question(candidate,all,core,activity='quiz'){
 if(!candidate)return null;
 const mode=activity==='mixed'?(candidate.activities.includes('quiz')?'quiz':candidate.activities.includes('write')?'write':'match'):activity;
 if(!['quiz','write'].includes(mode)||!candidate.activities.includes(mode))return null;
 const q=adapted(candidate.item,candidate.purpose,all,core,mode);return q?{...q,reviewKey:candidate.key}:null;
}
function collect(items,snapshots,core){
 const eligible=new Map();for(const item of items){const id=JSON.stringify([item.app,item.id]);if(!eligible.has(id))eligible.set(id,[]);eligible.get(id).push(item);}
 const candidates=[],seen=new Set(),unavailable=[];let unsupported=0,outside=0;
 for(const [app,snapshot] of Object.entries(snapshots)){
  if(!snapshot||!snapshot.items||typeof snapshot.items!=='object')throw Error('Historial de errores no disponible.');
  for(const [id,entry] of Object.entries(snapshot.items)){
   if(!entry||!entry.purposes||typeof entry.purposes!=='object')throw Error('Historial de errores no válido.');
   for(const [purpose,row] of Object.entries(entry.purposes)){
    if(!row||!['correct','wrong','skipped'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0))throw Error('Contadores de errores no válidos.');if(!row.wrong)continue;
    const options=eligible.get(JSON.stringify([app,id]));
    if(!options){outside++;unavailable.push({app,id,purpose,reason:'Contenido no disponible en los catálogos cargados'});continue;}
    const key=keyOf({app,id},purpose);if(seen.has(key))continue;seen.add(key);let candidate=null;
    for(const item of options){const activities=[];for(const mode of ['quiz','write'])if(adapted(item,purpose,items,core,mode))activities.push(mode);
     if(item.matchPurpose===purpose&&matchOptions(item,items,core).length>=2)activities.push('match');
     if(activities.length){candidate={key,item,purpose,wrong:row.wrong,correct:row.correct,skipped:row.skipped,activities};break;}}
    if(candidate)candidates.push(candidate);else{unsupported++;unavailable.push({app,id,purpose,reason:'Este motivo no tiene un ejercicio compatible disponible'});}
   }
  }
 }
 candidates.sort(order);return {candidates,unsupported,outside,unavailable};
}
function filter(candidates,activity){return ['explore','mixed'].includes(activity)?candidates.slice():candidates.filter(c=>c.activities.includes(activity));}
function select(candidates,activity,length){const groups=new Map();for(const c of filter(candidates,activity).sort(order)){if(!groups.has(c.item.app))groups.set(c.item.app,[]);groups.get(c.item.app).push(c);}const out=[];while(out.length<length&&[...groups.values()].some(x=>x.length))for(const rows of groups.values()){if(rows.length&&out.length<length)out.push(rows.shift());}return out;}
function groups(candidates,core){const map=new Map();for(const c of filter(candidates,'match')){const k=JSON.stringify([c.item.app,c.item.family,c.purpose]);if(!map.has(k))map.set(k,[]);map.get(k).push(c);}return [...map.values()];}
function accepts(q,value,core){if(q.normalizer&&root.AsallamErrorCatalog?.accepts)return root.AsallamErrorCatalog.accepts(q,value);return q.accepted.some(a=>core.normalize(a)===core.normalize(value));}
const api={accepts,keyOf,order,collect,question,filter,groups,select,matchOptions,choicesFor};root.AsallamErrorReview=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
