/* Error selection is read-only. A review keeps the exact original item and purpose. */
(function(root){'use strict';
const keyOf=(item,purpose)=>JSON.stringify([item.app,item.id,purpose]);
const order=(a,b)=>b.wrong-a.wrong||(a.key<b.key?-1:a.key>b.key?1:0);
function soundKeys(item,core){
 const reading=core.normalize(item.reading||item.jp).replace(/\s+/g,'');
 const roman=core.normalize(item.romaji||'').replace(/[\s'’]/g,'').replace(/ō/g,'oo').replace(/ē/g,'ee').replace(/ou|oo/g,'ō').replace(/ei|ee/g,'ē');
 return {reading,roman};
}
function sameSound(a,b,core){const x=soundKeys(a,core),y=soundKeys(b,core);return !!((x.reading&&x.reading===y.reading)||(x.roman&&x.roman===y.roman));}
function adapted(item,purpose,all,core,activity){
 const normal=core.makeQuestion(item,all,activity);
 if(normal&&normal.purpose===purpose)return normal;
 if(item.app==='kana'&&purpose==='Audio → romaji'&&activity==='write'){
  const w=core.writing(item);if(!w)return null;
  return {item,...w,purpose,auditory:true,prompt:'Escucha el kana',hint:'Escucha el audio completo y escribe la lectura en romaji.',choices:[]};
 }
 if(item.app==='jlpt'&&purpose==='Audio → significado'&&activity==='quiz'&&item.reading){
  const pool=all.filter(x=>x.key===item.key||!sameSound(item,x,core));
  const choices=core.optionsFor(item,pool);
  if(choices.length<2)return null;
  return {item,purpose,auditory:true,prompt:'Escucha la palabra',hint:'Escucha el audio completo y elige su significado.',answer:core.answerFor(item),accepted:[core.answerFor(item)],choices};
 }
 return null;
}
function question(candidate,all,core,activity='quiz'){
 if(!candidate||!['quiz','write'].includes(activity)||!candidate.activities.includes(activity))return null;
 const q=adapted(candidate.item,candidate.purpose,all,core,activity);
 return q&&q.purpose===candidate.purpose?{...q,reviewKey:candidate.key}:null;
}
function collect(items,snapshots,core){
 const eligible=new Map();
 for(const item of items){const id=JSON.stringify([item.app,item.id]);if(!eligible.has(id))eligible.set(id,[]);eligible.get(id).push(item);}
 const candidates=[],seen=new Set();let unsupported=0,outside=0;
 for(const [app,snapshot] of Object.entries(snapshots)){
  if(!snapshot||!snapshot.items||typeof snapshot.items!=='object')throw Error('Historial de errores no disponible.');
  for(const [id,entry] of Object.entries(snapshot.items)){
   if(!entry||!entry.purposes||typeof entry.purposes!=='object')throw Error('Historial de errores no válido.');
   for(const [purpose,row] of Object.entries(entry.purposes)){
    if(!row||!['correct','wrong','skipped'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0))throw Error('Contadores de errores no válidos.');
    if(!row.wrong)continue;
    const options=eligible.get(JSON.stringify([app,id]));
    if(!options){outside++;continue;}
    const key=keyOf({app,id},purpose);if(seen.has(key))continue;seen.add(key);
    let candidate=null;
    for(const item of options){
     const activities=[];
     for(const mode of ['quiz','write']){const q=adapted(item,purpose,items,core,mode);if(q&&q.purpose===purpose)activities.push(mode);}
     if(item.matchPurpose===purpose&&item.family!=='sentence')activities.push('match');
     if(activities.length){candidate={key,item,purpose,wrong:row.wrong,correct:row.correct,skipped:row.skipped,activities};break;}
    }
    if(candidate)candidates.push(candidate);else unsupported++;
   }
  }
 }
 candidates.sort(order);
 return {candidates,unsupported,outside};
}
function filter(candidates,activity){return activity==='explore'?candidates.slice():candidates.filter(c=>c.activities.includes(activity));}
function groups(candidates,core){
 const map=new Map();
 for(const c of filter(candidates,'match')){const k=JSON.stringify([c.item.app,c.item.family,c.purpose]);if(!map.has(k))map.set(k,[]);map.get(k).push(c);}
 const out=[];
 for(const rows of map.values()){
  const prompts=new Set(),answers=new Set(),unique=[];
  for(const c of rows.slice().sort(order)){const p=core.normalize(c.item.jp),a=core.normalize(core.answerFor(c.item));if(!p||!a||prompts.has(p)||answers.has(a))continue;prompts.add(p);answers.add(a);unique.push(c);}
  if(unique.length>=2)out.push(unique);
 }
 return out.sort((a,b)=>order(a[0],b[0]));
}
const api={keyOf,order,collect,question,filter,groups};root.AsallamErrorReview=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
