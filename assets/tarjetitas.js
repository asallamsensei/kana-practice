/* Palabra del día. A single Canvas renders the preview and the exact PNG. */
(function(root){
'use strict';
const TZ='America/Bogota';
const FORMATS={'1-1':[1080,1080],'3-4':[1080,1440],'9-16':[1080,1920],'4-5':[1080,1350]};
const BACKGROUND_FORMATS=['1-1','3-4','9-16'];
const THEMES=[
 {name:'Durazno y lavanda',base:'#fbefd9',top:'#f7e4d4',mid:'#f1e5fb',accent:'#8c4765',doodle:'#df8da6',ink:'#32283f',panel:'#fffaf0f1',soft:'#5e4263'},
 {name:'Laguna menta',base:'#fff2dd',top:'#e2f0dc',mid:'#d5ebf1',accent:'#28695c',doodle:'#86bba7',ink:'#263a38',panel:'#fffff1f3',soft:'#3c625d'},
 {name:'Tinta y miel',base:'#fdf0d6',top:'#f4dfab',mid:'#f3e2cb',accent:'#8c552b',doodle:'#d39e6f',ink:'#3f2e29',panel:'#fffbecf1',soft:'#684c3b'},
 {name:'Sakura',base:'#fcf0df',top:'#f8dbe2',mid:'#efdbea',accent:'#913f64',doodle:'#df93ac',ink:'#40273a',panel:'#fff8f0f1',soft:'#6b4157'},
 {name:'Cielo de papel',base:'#fbf0e1',top:'#e1e7f8',mid:'#e7ddfa',accent:'#50509a',doodle:'#a6a4d4',ink:'#302b4b',panel:'#fffaf0f1',soft:'#4f4673'},
 {name:'Lápiz terracota',base:'#fcf0e3',top:'#efdec8',mid:'#f9dcc8',accent:'#874c3e',doodle:'#d69a85',ink:'#422d34',panel:'#fff9eff1',soft:'#624352'}
];
const LABELS={word:'Palabra',phrase:'Frase',kanji:'Kanji'};
const KANJI_RE=/\p{Script=Han}/u;
const JP_FONT='"Noto Sans CJK JP", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif';
const LATIN_FONT='system-ui, sans-serif';
const DEFAULTS={
 word:[{id:'local-jikan',jp:'時間',romaji:'jikan',es:'tiempo, hora',kana:'じかん',extra:'Se usa para hablar de duración y horas específicas.'}],
 phrase:[{id:'local-gakkou',jp:'学校へ行きます。',romaji:'gakkou e ikimasu.',es:'Voy a la escuela.',segmentos:[{texto:'学校',lectura:'がっこう'},{texto:'へ',lectura:'へ'},{texto:'行きます',lectura:'いきます'},{texto:'。',lectura:''}]}],
 kanji:[{id:'local-hi',jp:'日',romaji:'',es:'día, sol'}]
};
const str=x=>typeof x==='string'?x.trim():'';
function dateKey(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const part=type=>parts.find(p=>p.type===type).value;
 return part('year')+'-'+part('month')+'-'+part('day');
}
function hash(text){
 let h=2166136261;for(const c of String(text)){h=Math.imul(h^c.codePointAt(0),16777619);}return h>>>0;
}
function rng(seed){
 let x=hash(seed);return ()=>{x=(x+0x6D2B79F5)|0;let t=Math.imul(x^(x>>>15),1|x);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
}
const pick=(a,r)=>a.length?a[Math.floor(r()*a.length)]:null;
const chooseDaily=(cards,day,kind)=>pick(cards,rng(day+'|'+kind+'|contenido-v1'));
const assetName=(value,types)=>typeof value==='string'&&new RegExp('^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\\.('+types+')$','i').test(value)&&!value.includes('..')?value:null;
function manifestLists(raw){
 const items=(value,types)=>Array.isArray(value)?[...new Set(value.map(x=>assetName(x,types)).filter(Boolean))].slice(0,100):[];
 const imageTypes='png|webp|jpe?g',backgroundsByFormat={};
 for(const key of BACKGROUND_FORMATS){
  const pool=items(raw?.backgroundsByFormat?.[key],imageTypes);
  if(pool.length)backgroundsByFormat[key]=pool;
 }
 return {backgrounds:items(raw?.backgrounds,imageTypes),backgroundsByFormat,characters:items(raw?.characters,'png'),portrait:assetName(raw?.portrait,imageTypes)};
}
function compose(day,itemId,revision,format,lists,palette,formatKey){
 const r=rng([day,itemId,revision,'diseño-v1'].join('|'));
 const rollTheme=Math.floor(r()*THEMES.length);
 const theme=Number.isInteger(palette)&&palette>=0&&palette<THEMES.length?palette:rollTheme;
 const dedicated=BACKGROUND_FORMATS.includes(formatKey)?lists.backgroundsByFormat?.[formatKey]:null;
 const backgroundPool=dedicated?.length?dedicated:lists.backgrounds;
 // Sample the background separately so changing format never changes the cast.
 const roll=backgroundPool.length?r():0;
 const background=pick(backgroundPool,()=>roll);
 const fallbackBackground=dedicated?.length?pick(lists.backgrounds,()=>roll):null;
 const castRandom=rng([day,itemId,revision,'elenco-v1'].join('|'));
 const castPool=[...new Set(lists.characters||[])],characters=[];
 for(let i=0;i<4&&castPool.length;i++)characters.push(castPool.splice(Math.floor(castRandom()*castPool.length),1)[0]);
 return {theme,seed:r(),background,fallbackBackground,characters,character:characters[0]||null};
}
const alphaCache=new WeakMap(),ART_TOP=.573,ART_BOTTOM=137,BODY_BOTTOM=.561;
function spriteCrop(image,ctx){
 if(alphaCache.has(image))return alphaCache.get(image);
 const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
 const original={x:0,y:0,w:width,h:height};
 try{
  // Downsample; a threshold ignores faint matte specks while generous padding
  // retains the pencil contours. Positions use the visible art, not blank PNGs.
  const ratio=Math.min(1,128/Math.max(width,height)),w=Math.max(1,Math.ceil(width*ratio)),h=Math.max(1,Math.ceil(height*ratio));
  const scratch=root.document?.createElement('canvas')||new ctx.canvas.constructor(w,h);
  scratch.width=w;scratch.height=h;
  const probe=scratch.getContext('2d');probe.drawImage(image,0,0,w,h);
  const pixels=probe.getImageData(0,0,w,h).data;
  let l=w,t=h,r=-1,b=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>=94){
   l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
  }
  if(r>=l&&b>=t){
   const pad=Math.max(2,Math.ceil(Math.max(r-l+1,b-t+1)*.04));
   const x=Math.max(0,(l-pad)*width/w),y=Math.max(0,(t-pad)*height/h);
   const crop={x,y,w:Math.min(width,(r+pad+1)*width/w)-x,h:Math.min(height,(b+pad+1)*height/h)-y};
   alphaCache.set(image,crop);return crop;
  }
 }catch(e){}
 alphaCache.set(image,original);return original;
}
function stageLayout(w,h,cast,seed,cropFor){
 const r=rng(seed),y=h*ART_TOP,floor=h-ART_BOTTOM,space=floor-y,margin=w*.06;
 if(!cast.length||space<=0)return [];
 const sizes=cast.slice(0,3).map((image,index)=>{
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  const crop=cropFor?.(image)||{x:0,y:0,w:width,h:height};
  const heightLimit=space*(cast.length===1?.94:index===0?.80:.86+r()*.045);
  const scale=Math.min(w*.36/crop.w,heightLimit/crop.h,w*.43/crop.h);
  return {image,crop,w:crop.w*scale,h:crop.h*scale};
 });
 const overlap=(a,b)=>Math.min(a.w,b.w)*(.40+r()*.065);
 const positions=()=>{
  const [rear,left,right]=sizes;
  rear.x=-rear.w/2;
  if(left)left.x=rear.x-left.w+overlap(rear,left);
  if(right)right.x=rear.x+rear.w-overlap(rear,right);
  return [Math.min(...sizes.map(b=>b.x)),Math.max(...sizes.map(b=>b.x+b.w))];
 };
 let [min,max]=positions();
 const ratio=Math.min(1,(w-margin*2)/(max-min),w*.79/(max-min));
 if(ratio<1){for(const b of sizes){b.x*=ratio;b.w*=ratio;b.h*=ratio;}min*=ratio;max*=ratio;}
 // Deliberate overlap, but leave each face visible above or beside its neighbors.
 const desired=w*(r()<.5?.34:.66);
 const shift=Math.min(w-margin-max,Math.max(margin-min,desired-(min+max)/2));
 const rearTop=y+.015*space;
 return sizes.map((b,i)=>{
  let top=rearTop;
  if(sizes.length===1)top=y+.17*(space-b.h);
  else if(i>0){
   const base=floor-b.h-(i===1?.035:.085)*space;
   // Short or panoramic artwork must still overlap the center sprite.
   const overlapY=Math.min(b.h,sizes[0].h)*.14;
   top=Math.max(rearTop+Math.min(.09*space,sizes[0].h*.28),Math.min(base,rearTop+sizes[0].h-overlapY));
   top=Math.min(top,floor-b.h);
  }
  return {...b,x:b.x+shift,y:top};
 });
}
function placeCast(w,h,cast,seed,cropFor){
 if(cast.length<3)return {top:null,bottom:stageLayout(w,h,cast,seed,cropFor)};
 const [image,...rest]=cast,r=rng(seed+'|peek');
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 const upper=h*.19-12,marginY=27,maxHeight=Math.min(225,upper-marginY);
 const crop=cropFor?.(image)||{x:0,y:0,w:iw,h:ih};
 const scale=Math.min(w*.22/crop.w,maxHeight/crop.h),width=crop.w*scale,height=crop.h*scale;
 const x=w*.945-width-r()*w*.035,y=marginY+r()*.58*(upper-marginY-height);
 return {top:{image,crop,x,y,w:width,h:height},bottom:stageLayout(w,h,rest,seed,cropFor)};
}
const cardLabel=(kind,item)=>(LABELS[kind]||LABELS.word)+' #'+(item.number||1);
// Only independently verified character readings are split within a kanji compound.
// Match the existing reading as well as the spelling, so imports can use other readings.
const rubyByCharacter=new Map(Object.entries({
 '火山':'か|ざん','旅行':'りょ|こう','写真':'しゃ|しん','先生':'せん|せい',
 '料理':'りょう|り','名前':'な|まえ','電話':'でん|わ','電車':'でん|しゃ',
 '手紙':'て|がみ','時間':'じ|かん','授業':'じゅ|ぎょう','荷物':'に|もつ',
 '映画':'えい|が','宿題':'しゅく|だい','公園':'こう|えん','祖父':'そ|ふ',
 '家族':'か|ぞく','毎日':'まい|にち','財布':'さい|ふ','毎朝':'まい|あさ',
 '漢字':'かん|じ','質問':'しつ|もん','自転車':'じ|てん|しゃ','言葉':'こと|ば',
 '図書館':'と|しょ|かん','電気':'でん|き','勉強':'べん|きょう','問題':'もん|だい',
 '来月':'らい|げつ','午後':'ご|ご','夕飯':'ゆう|はん','玄関':'げん|かん',
 '銀行':'ぎん|こう','半分':'はん|ぶん','学生':'がく|せい','野菜':'や|さい',
 '日曜日':'にち|よう|び','辞書':'じ|しょ','誕生日':'たん|じょう|び','元気':'げん|き',
 '会社':'かい|しゃ','地図':'ち|ず','音楽':'おん|がく','大学':'だい|がく',
 '入口':'いり|ぐち','祖母':'そ|ぼ','病院':'びょう|いん','医者':'い|しゃ',
 '砂糖':'さ|とう','食事':'しょく|じ','建物':'たて|もの','階段':'かい|だん',
 '毎月':'まい|つき','牛乳':'ぎゅう|にゅう','散歩':'さん|ぽ','意味':'い|み',
 '土曜日':'ど|よう|び','教室':'きょう|しつ','大切':'たい|せつ','冷蔵庫':'れい|ぞう|こ',
 '交番':'こう|ばん','天気':'てん|き','自分':'じ|ぶん','大変':'たい|へん',
 '説明':'せつ|めい','来週':'らい|しゅう','全部':'ぜん|ぶ','飛行機':'ひ|こう|き',
 '帽子':'ぼう|し','月曜日':'げつ|よう|び','気分':'き|ぶん','掃除':'そう|じ',
 '場所':'ば|しょ','郵便局':'ゆう|びん|きょく','封筒':'ふう|とう','作文':'さく|ぶん',
 '洗濯':'せん|たく','靴下':'くつ|した','映画館':'えい|が|かん','交差点':'こう|さ|てん',
 '金曜日':'きん|よう|び','先週':'せん|しゅう','本棚':'ほん|だな','便利':'べん|り',
 '新鮮':'しん|せん','十分':'じゅう|ぶん','生徒':'せい|と','丈夫':'じょう|ぶ',
 '練習':'れん|しゅう','試験':'し|けん','外国':'がい|こく','上着':'うわ|ぎ',
 '来年':'らい|ねん','番号':'ばん|ごう','夕方':'ゆう|がた','予定':'よ|てい',
 '日本語':'にほん|ご'
}));
const HAN_RUN=/^[\p{Script=Han}々]+$/u;
const KANA_RUN=/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;
const RUBY_RUNS=/[\p{Script=Han}々]+|[^\p{Script=Han}々]+/gu;
const toHiragana=text=>Array.from(str(text).normalize('NFKC')).map(ch=>ch>='ァ'&&ch<='ヶ'?String.fromCharCode(ch.charCodeAt(0)-96):ch).join('').replace(/\s/gu,'');
function rubyGroup(base,kana){
 const parts=rubyByCharacter.get(base)?.split('|'),chars=Array.from(base);
 if(!parts||parts.join('')!==kana)return [{base,ruby:kana}];
 if(base==='日本語')return [{base:'日本',ruby:parts[0]},{base:'語',ruby:parts[1]}];
 if(parts.length!==chars.length)return [{base,ruby:kana}];
 return chars.map((base,i)=>({base,ruby:parts[i]}));
}
function alignRubyRuns(runs,kana){
 const fixed=runs.map(run=>HAN_RUN.test(run)?null:toHiragana(run));
 if(fixed.some((x,i)=>x!==null&&!KANA_RUN.test(runs[i])))return null;
 const memo=new Map();
 function search(i,pos){
  if(i===runs.length)return pos===kana.length?[[]]:[];
  const key=i*(kana.length+1)+pos;
  if(memo.has(key))return memo.get(key);
  const anchor=fixed[i],paths=[];
  if(anchor!==null){
   if(kana.startsWith(anchor,pos))for(const path of search(i+1,pos+anchor.length))paths.push([null,...path]);
  }else if(i===runs.length-1){
   if(pos<kana.length)paths.push([kana.slice(pos)]);
  }else{
   const next=fixed[i+1];
   for(let end=kana.indexOf(next,pos+1);end!==-1&&paths.length<2;end=kana.indexOf(next,end+1)){
    for(const path of search(i+1,end)){
     paths.push([kana.slice(pos,end),...path]);if(paths.length===2)break;
    }
   }
  }
  memo.set(key,paths);return paths;
 }
 const paths=search(0,0);
 return paths.length===1?paths[0]:null;
}
function rubyTokens(base,reading){
 const plain=[{base}],kana=toHiragana(reading);
 if(!base||base.length>64||kana.length>128||!KANA_RUN.test(kana)||!KANJI_RE.test(base))return plain;
 // The source supplies the reading of the whole numeral/counter expression.
 if(/^\p{Nd}+(?:日|月|歳)$/u.test(base)||(base==='一ヶ月'&&kana==='いっかげつ'))return [{base,ruby:kana}];
 // This otherwise ambiguous anchor is verified against 黄色 and 声 in the same bank.
 if(base==='黄色い声'&&kana==='きいろいこえ')return [{base:'黄色',ruby:'きいろ'},{base:'い'},{base:'声',ruby:'こえ'}];
 if(HAN_RUN.test(base))return rubyGroup(base,kana);
 const runs=base.match(RUBY_RUNS),aligned=runs&&alignRubyRuns(runs,kana);
 return aligned?runs.flatMap((run,i)=>aligned[i]===null?[{base:run}]:rubyGroup(run,aligned[i])):plain;
}
function sentenceRuby(text,segments){
 // Match the exact original expression; only annotate verified source tokens.
 if(!Array.isArray(segments)||segments.some(t=>!t||typeof t.texto!=='string'||!t.texto)||segments.map(t=>t.texto).join('')!==text)return [{base:text}];
 return segments.flatMap(t=>rubyTokens(t.texto,t.lectura));
}
function makeCatalog(curated,vocab,phraseData,kanjiData){
 const kanjiMap=new Map();
 for(const row of Array.isArray(kanjiData)?kanjiData:[])if(str(row?.kanji)&&str(row?.significado))kanjiMap.set(row.kanji,row.significado);
 for(const row of Array.isArray(curated?.kanjis)?curated.kanjis:[])if(str(row?.jp)&&str(row?.es))kanjiMap.set(row.jp,row.es);
 const result={word:[],phrase:[],kanji:[]};
 function add(kind,raw){
  if(!str(raw.jp)||!str(raw.es)||kind!=='kanji'&&!str(raw.romaji))return;
  const jp=raw.jp.trim(),es=raw.es.trim(),romaji=str(raw.romaji);
  const id=str(raw.id)||kind+'-'+hash([jp,romaji,es].join('|')).toString(36);
  const ruby=kind==='word'?rubyTokens(jp,raw.kana):kind==='phrase'?sentenceRuby(jp,raw.segmentos):[{base:jp}];
  result[kind].push({id,jp,es,romaji,ruby,extra:str(raw.extra),example:str(raw.ejemplo),nivel:str(raw.nivel),tags:Array.isArray(raw.tags)?raw.tags.filter(x=>typeof x==='string'):[]});
 }
 for(const row of Array.isArray(curated?.palabras)?curated.palabras:[])if(row)add('word',row);
 for(const row of Array.isArray(vocab)?vocab:[])if(row)add('word',{jp:row.kanji||row.kana,kana:row.kana,romaji:row.romaji,es:row.significado,nivel:'N5'});
 for(const row of Array.isArray(phraseData?.oraciones)?phraseData.oraciones:[])if(row)add('phrase',{id:row.id,jp:row.japones,segmentos:row.segmentos,romaji:row.romaji,es:row.espanol,nivel:'N5'});
 for(const row of Array.isArray(kanjiData)?kanjiData:[])if(row)add('kanji',{jp:row.kanji,es:row.significado,nivel:'N5'});
 for(const kind of Object.keys(result)){
  const seen=new Set(),ids=new Set();
  result[kind]=result[kind].filter(item=>{
   const key=(item.jp+'|'+item.romaji).normalize('NFKC').toLowerCase();
   if(seen.has(key)||ids.has(item.id))return false;seen.add(key);ids.add(item.id);return true;
  });
  if(!result[kind].length)for(const item of DEFAULTS[kind])add(kind,item);
  result[kind]=result[kind].map((item,index)=>({...item,number:index+1}));
 }
 return {cards:result,kanjiMap};
}
function wrap(ctx,text,width,jp=false){
 const split=jp?s=>[...s]:s=>s.split(/\s+/);
 const sep=jp?'':' ',lines=[];
 for(const block of String(text||'').split(/\r?\n/)){
  let line='';
  for(const word of split(block.trim())){
   if(!word)continue;
   const candidate=line?line+sep+word:word;
   if(ctx.measureText(candidate).width>width&&line){lines.push(line);line='';}
   if(ctx.measureText(word).width>width){
    for(const ch of word){if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line='';}line+=ch;}
   }else line+=line?sep+word:word;
  }
  if(line)lines.push(line);
 }
 return lines;
}
function panelPath(ctx,x,y,w,h,r){
 const radius=Math.max(0,Math.min(r,w/2,h/2));
 ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}
function box(ctx,x,y,w,h,r,fill,stroke){
 panelPath(ctx,x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function photo(ctx,image,x,y,size){
 if(!image)return;
 const edge=Math.min(image.naturalWidth,image.naturalHeight);
 if(!edge)return;
 ctx.save();ctx.beginPath();ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);ctx.clip();
 ctx.drawImage(image,(image.naturalWidth-edge)/2,(image.naturalHeight-edge)/2,edge,edge,x,y,size,size);ctx.restore();
 ctx.beginPath();ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);ctx.strokeStyle='#fff9';ctx.lineWidth=4;ctx.stroke();
}
function cover(ctx,image,w,h){
 const z=Math.max(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*z,ih=image.naturalHeight*z;
 ctx.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);
}
function write(ctx,text,x,y,size,weight,color,font=LATIN_FONT,align='left'){
 ctx.font=Math.round(weight/100)*100+' '+size+'px '+font;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(text,x,y);
}
function whatsAppIcon(ctx,x,y,size){
 ctx.save();ctx.translate(x,y-size/2);ctx.scale(size/24,size/24);
 ctx.strokeStyle=ctx.fillStyle='#19754d';ctx.lineWidth=1.75;ctx.lineJoin='round';
 ctx.beginPath();ctx.moveTo(3.9,17.6);ctx.lineTo(2.45,22);ctx.lineTo(6.9,20.7);
 ctx.bezierCurveTo(13,24.0,21.6,19.8,21.8,12.2);
 ctx.bezierCurveTo(22.0,6.6,17.5,2.1,11.9,2.1);
 ctx.bezierCurveTo(6.2,2.1,1.8,6.9,2.0,12.3);
 ctx.bezierCurveTo(2,14.2,2.6,16.1,3.9,17.6);ctx.closePath();ctx.stroke();
 ctx.beginPath();ctx.moveTo(7.7,6.5);
 ctx.bezierCurveTo(6.4,6.8,6.1,8.0,6.6,9.6);
 ctx.bezierCurveTo(7.7,13.0,10.5,15.8,13.8,17.1);
 ctx.bezierCurveTo(15.5,17.7,17,17.3,17.5,15.8);
 ctx.lineTo(17.5,14.9);ctx.lineTo(14.4,13.45);ctx.lineTo(13.15,14.8);
 ctx.bezierCurveTo(11.4,14.0,9.95,12.55,9.25,10.9);
 ctx.lineTo(10.35,9.55);ctx.lineTo(9.0,6.6);ctx.closePath();ctx.fill();ctx.restore();
}
function globeIcon(ctx,x,y,size,color){
 ctx.save();ctx.translate(x,y-size/2);ctx.scale(size/24,size/24);
 ctx.strokeStyle=color;ctx.lineWidth=1.65;ctx.lineCap='round';
 ctx.beginPath();ctx.arc(12,12,9.2,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.ellipse(12,12,4.35,9.2,0,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.moveTo(3.1,12);ctx.lineTo(20.9,12);
 ctx.moveTo(5.05,6.2);ctx.quadraticCurveTo(12,9.0,18.95,6.2);
 ctx.moveTo(5.05,17.8);ctx.quadraticCurveTo(12,15.0,18.95,17.8);ctx.stroke();ctx.restore();
}
function ornament(ctx,x,y,size,accent,seed){
 const r=rng(seed);ctx.save();ctx.translate(x,y);ctx.strokeStyle=accent;ctx.fillStyle=accent;
 ctx.globalAlpha=.67;ctx.lineWidth=2;
 for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,0,size*(.25+i*.15),Math.PI*(.17+i*.045),Math.PI*(1.88-i*.055));ctx.stroke();}
 ctx.globalAlpha=1;
 for(let i=0;i<10;i++){
  const a=r()*Math.PI*2,d=size*(.4+r()*.89),rad=2+r()*4;
  ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d,rad,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function star(ctx,x,y,r,color,rotation){
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();
 for(let i=0;i<8;i++){const a=i*Math.PI/4,v=i%2?r*.29:r;ctx.lineTo(Math.cos(a)*v,Math.sin(a)*v);}
 ctx.closePath();ctx.fillStyle=color;ctx.globalAlpha=.66;ctx.fill();ctx.restore();
}
function handmadePaper(ctx,w,h,t,seed){
 const r=rng(seed),g=ctx.createLinearGradient(0,0,w,h);
 g.addColorStop(0,t.top);g.addColorStop(.47,t.base);g.addColorStop(1,t.mid);
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 for(let i=0;i<1750;i++){
  ctx.strokeStyle=i%2?'#8f6a56':'#fff';
  ctx.globalAlpha=.024+r()*.037;ctx.lineWidth=1+r();
  const x=w*r(),y=h*r();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+8*r(),y-2+4*r());ctx.stroke();
 }
 ctx.globalAlpha=1;
 for(const [x,y] of [[68,165],[w-76,164],[77,h-235],[w-89,h-270]]){
  for(let j=0;j<4;j++)star(ctx,x+(r()-.5)*50,y+(r()-.5)*95,7+r()*15,t.doodle,r());
 }
}
function rubyRows(ctx,tokens,size,weight,width){
 const font=Math.round(weight/100)*100+' '+size+'px '+JP_FONT;
 const small=Math.max(10,Math.round(size*.32)),rubyFont='500 '+small+'px '+JP_FONT;
 const units=tokens.flatMap(token=>token.ruby?[token]:Array.from(token.base,base=>({base}))).map(token=>{
  ctx.font=font;const baseWidth=ctx.measureText(token.base).width;
  if(!token.ruby)return {...token,width:baseWidth};
  ctx.font=rubyFont;const readingWidth=ctx.measureText(token.ruby).width;
  return {...token,width:Math.max(baseWidth,readingWidth+size*.065)};
 });
 const rows=[];let list=[],used=0;
 function flush(){if(list.length)rows.push({units:list,width:used,rubyHeight:list.some(x=>x.ruby)?small*1.38:0,small});list=[];used=0;}
 for(const unit of units){
  if(list.length&&used+unit.width>width){
   const last=/^[、。！？）」』】]$/u.test(unit.base)&&list.length>1?list.pop():null;
   if(last)used-=last.width;
   flush();if(last){list=[last];used=last.width;}
  }
  list.push(unit);used+=unit.width;
 }
 flush();return rows;
}
function writeBody(ctx,w,h,item,kind,t,scale,illustrated,furigana){
 const x=104,y=Math.max(h*.16,h*.19-27),bottom=h*BODY_BOTTOM,maxW=w-2*x-84,maxH=bottom-y-62;
 const extra=item.extra;
 const example=item.example;
 const blocks=[
  {text:item.jp,size:kind==='phrase'?72:kind==='kanji'?170:126,weight:750,font:JP_FONT,color:t.ink,jp:true,ruby:furigana&&item.ruby?.some(x=>x.ruby)?item.ruby:null,gap:10},
  {text:item.romaji,size:38,weight:560,font:LATIN_FONT,color:t.accent,gap:20},
  {text:item.es,size:56,weight:780,font:LATIN_FONT,color:t.ink,gap:18},
  {text:extra,size:26,weight:450,font:LATIN_FONT,color:t.soft,gap:8},
  {text:example,size:25,weight:510,font:JP_FONT,color:t.soft,gap:4}
 ].filter(b=>b.text);
 let layouts,total,fit=scale;
 do{
  total=0;
  layouts=blocks.map(b=>{
   const size=Math.max(10,Math.round(b.size*fit)),leading=size*(b.jp?1.26:1.13);
   ctx.font=Math.round(b.weight/100)*100+' '+size+'px '+b.font;
   const rubyLines=b.ruby?rubyRows(ctx,b.ruby,size,b.weight,maxW):null,lines=rubyLines?null:wrap(ctx,b.text,maxW,b.jp);
   total+=(rubyLines?rubyLines.reduce((n,line)=>n+leading+line.rubyHeight,0):lines.length*leading)+b.gap*fit;
   return {...b,size,leading,lines,rubyLines};
  });
  if(total<=maxH&&layouts.every(b=>!b.rubyLines||b.rubyLines.every(line=>line.width<=maxW)))break;
  fit*=.94;
 }while(fit>.25);
 if(illustrated){
  // Illustrated frames already provide their own border. Feather the wash
  // instead of painting a big, visible solid box over the center.
  let dark=false;
  try{
   const fx=ctx.canvas.width/w,fy=ctx.canvas.height/h;
   for(const u of [.28,.50,.72])for(const v of [.26,.50,.74]){
    const [r,g,b]=ctx.getImageData(Math.round(w*u*fx),Math.round((y+(bottom-y)*v)*fy),1,1).data;
    if(.2126*r+.7152*g+.0722*b<177)dark=true;
   }
  }catch(e){}
  const g=ctx.createRadialGradient(w/2,(y+bottom)/2,0,w/2,(y+bottom)/2,w*.52);
  g.addColorStop(0,dark?'#ffffffe8':'#ffffff55');
  g.addColorStop(.70,dark?'#ffffffcf':'#ffffff33');g.addColorStop(1,'#ffffff00');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 }else{
  ctx.save();ctx.shadowColor='#48263c1e';ctx.shadowBlur=26;ctx.shadowOffsetY=13;
  box(ctx,x,y,w-2*x,bottom-y,38,t.panel);ctx.restore();
  ctx.lineWidth=2;box(ctx,x,y,w-2*x,bottom-y,38,'#fff0',t.doodle+'86');
 }
 let yy=y+(bottom-y-total)/2;
 for(const b of layouts){
  if(b.rubyLines){
   for(const row of b.rubyLines){
    let xx=(w-row.width)/2;
    for(const unit of row.units){
     const center=xx+unit.width/2;
     if(unit.ruby)write(ctx,unit.ruby,center,yy+row.small*.61,row.small,500,t.accent,JP_FONT,'center');
     write(ctx,unit.base,center,yy+row.rubyHeight+b.leading/2,b.size,b.weight,b.color,JP_FONT,'center');
     xx+=unit.width;
    }
    yy+=row.rubyHeight+b.leading;
   }
  }else{
   for(const line of b.lines){
    write(ctx,line,w/2,yy+b.leading/2,b.size,b.weight,b.color,b.font,'center');
    yy+=b.leading;
   }
  }
  yy+=b.gap*fit;
 }
}
function drawCard(canvas,card){
 const {format,item,kind,design,images,scale,furigana=true}=card;
 const [W,H]=format,w=1080,h=H*1080/W;
 if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Tu navegador no pudo preparar la tarjeta.');
 ctx.setTransform(W/w,0,0,H/h,0,0);ctx.direction='ltr';ctx.lang='ja';
 const t=THEMES[design.theme];
 const image=images.background;
 handmadePaper(ctx,w,h,t,design.seed);
 if(image){
  cover(ctx,image,w,h);
  // Decoration edges stay visible, while reading always has its own ink/paper.
  const wash=ctx.createLinearGradient(0,0,0,h);
  wash.addColorStop(0,'#fdf1dc80');wash.addColorStop(.3,'#fdf1dc20');wash.addColorStop(.69,'#fdf1dc25');wash.addColorStop(1,'#fdf1dc99');
  ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
 }
 if(!image){
  ctx.lineWidth=1.6;box(ctx,35,33,w-70,h-66,42,'#fff0',t.doodle+'65');
 }
 const cast=(images.characters||[images.character]).filter(Boolean);
 const {top,bottom}=placeCast(w,h,cast,design.seed,image=>spriteCrop(image,ctx));
 box(ctx,76,63,440,62,26,t.panel,t.doodle+'a0');
 write(ctx,'✦  '+cardLabel(kind,item),99,95,30,820,t.accent);
 if(!top)write(ctx,'日本語',w-88,95,32,750,t.ink,JP_FONT,'right');
 writeBody(ctx,w,h,item,kind,t,scale,Boolean(image),furigana);
 const r=rng(design.seed),stageMid=h*ART_TOP+(h-ART_BOTTOM-h*ART_TOP)*.54;
 for(const side of [-1,1]){
  const x=w*(.5+.37*side),s=Math.min(46,(h-ART_BOTTOM-h*ART_TOP)*.21);
  ornament(ctx,x,stageMid,s,t.doodle,design.seed+side);
  for(let i=0;i<3;i++)star(ctx,x+(r()-.5)*75,stageMid+(r()-.5)*s*2,9+r()*9,t.doodle,r());
 }
 for(const {image,crop,x,y,w:width,h:height} of top?[top,...bottom]:bottom)ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,x,y,width,height);
 const footY=h-128;
 ctx.lineWidth=2;box(ctx,64,footY,w-128,87,26,t.panel,t.doodle+'85');
 write(ctx,'Asallam Sensei',92,footY+29,29,830,t.ink);
 const contactY=footY+62,contactSize=24,handle='@asallamsensei';
 whatsAppIcon(ctx,92,contactY,24);
 write(ctx,handle,125,contactY,contactSize,570,t.accent);
 const globeX=125+ctx.measureText(handle).width+28;
 globeIcon(ctx,globeX,contactY,24,t.accent);
 write(ctx,'asallamsensei.com',globeX+33,contactY,contactSize,570,t.accent);
 if(images.portrait){
  const px=w-160;photo(ctx,images.portrait,px,footY+8,71);
  write(ctx,'Tu profe',px-22,footY+43,25,750,t.accent,LATIN_FONT,'right');
 }
 return canvas;
}
const api={TZ,FORMATS,THEMES,dateKey,hash,rng,chooseDaily,manifestLists,makeCatalog,compose,stageLayout,placeCast,spriteCrop,cardLabel,rubyTokens,sentenceRuby,rubyRows,wrap,drawCard};
if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
const $=id=>root.document.getElementById(id);
const canvas=$('card'),images=new Map();
const state={day:dateKey(),kind:'word',revision:0,format:'1-1',size:FORMATS['1-1'],palette:-1,scale:1,furigana:true,lists:manifestLists(null),catalog:makeCatalog(),item:null,token:0,localPortrait:null,portraitRequest:0};
const files={curated:'data/tarjetas.json',words:'data/Vocabulario_N5.json',phrases:'data/Oraciones_N5_Bloque_01.json',kanji:'data/kanji_n5.json',manifest:'data/palabras/manifest.json'};
function request(url){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8500);
 return fetch(url,{signal:abort.signal}).then(r=>r.ok?r.json():null).catch(()=>null).finally(()=>clearTimeout(timer));
}
function loadImage(path){
 if(!path)return Promise.resolve(null);
 if(images.has(path))return images.get(path);
 const p=new Promise(resolve=>{
  const image=new Image();
  const done=ok=>{clearTimeout(timer);image.onload=image.onerror=null;resolve(ok&&image.naturalWidth?image:null);};
  const timer=setTimeout(()=>done(false),4400);
  image.onload=()=>done(true);image.onerror=()=>done(false);image.src=path;
 });
 images.set(path,p);
 return p;
}
function setOptions(){
 const select=$('selection'), frag=document.createDocumentFragment();
 for(const item of state.catalog.cards[state.kind]){
  const option=document.createElement('option');option.value=item.id;option.textContent=item.jp+' · '+item.es;frag.append(option);
 }
 select.replaceChildren(frag);
}
const currentDaily=()=>chooseDaily(state.catalog.cards[state.kind],state.day,state.kind);
function choose(item){
 state.item=item;state.revision=0;$('selection').value=item.id;void render();
}
async function render(){
 const token=++state.token,item=state.item;
 if(!item)return;
 const [W,H]=state.size,kind=state.kind,day=state.day;
 const design=compose(day,item.id,state.revision,[1080,H*1080/W],state.lists,state.palette,state.format);
 const frame={format:[W,H],item,kind,design,images:{},scale:state.scale,furigana:state.furigana};
 $('dimensions').textContent=W+' × '+H+' px';
 $('card-description').textContent=[cardLabel(kind,item),item.jp,item.romaji,item.es,item.extra,item.example].filter(Boolean).join('. ');
 canvas.style.setProperty('--preview-width',H>W?Math.max(420,700*W/H)+'px':'660px');
 drawCard(canvas,frame);$('download').disabled=true;
 const backgroundImage=name=>loadImage(name&&'data/palabras/'+name);
 const backgroundReady=backgroundImage(design.background).then(image=>{
  if(image||token!==state.token||design.fallbackBackground===design.background)return image;
  return backgroundImage(design.fallbackBackground);
 });
 const [background,characters,portrait]=await Promise.all([
  backgroundReady,Promise.all(design.characters.map(name=>loadImage('data/palabras/'+name))),state.localPortrait||loadImage(state.lists.portrait&&'data/palabras/'+state.lists.portrait),document.fonts?.ready
 ]);
 if(token!==state.token)return;
 frame.images={background,characters,portrait};
 drawCard(canvas,frame);$('download').disabled=false;
}
function format(key,size=FORMATS[key]){
 if(!size)return;
 state.format=key;state.size=size;
 document.querySelectorAll('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===key)));
 $('custom').setAttribute('aria-pressed',String(key==='custom'));
 void render();
}
$('kind').onchange=e=>{state.kind=e.target.value;if(!LABELS[state.kind])state.kind='word';setOptions();choose(currentDaily());};
$('selection').onchange=e=>{const item=state.catalog.cards[state.kind].find(x=>x.id===e.target.value);if(item)choose(item);};
$('today').onclick=()=>{state.day=dateKey();choose(currentDaily());};
$('random').onclick=()=>{
 const cards=state.catalog.cards[state.kind],other=cards.filter(x=>x.id!==state.item?.id);
 choose(pick(other,Math.random)||cards[0]);
};
$('design').onclick=()=>{state.revision++;void render();};
document.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>format(b.dataset.format));
$('custom').onclick=()=>{
 const w=Number($('customWidth').value),h=Number($('customHeight').value);
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<360||w>2160||h<360||h>2400||w/h<.48||w/h>1.35){
  $('status').textContent='Usa un ancho entre 360 y 2160 px, un alto entre 360 y 2400 px y una proporción de 0,48 a 1,35.';return;
 }
 $('status').textContent='';format('custom',[w,h]);
};
async function decodeLocalPortrait(file){
 if(file.size>15*1024*1024)throw Error('Elige una imagen de menos de 15 MB.');
 // Raster only, even when a browser supplies the wrong or an empty MIME type.
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const png=[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
 const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=[82,73,70,70].every((n,i)=>bytes[i]===n)&&[87,69,66,80].every((n,i)=>bytes[i+8]===n);
 if(!png&&!jpg&&!webp)throw Error('Elige una foto en formato JPG, PNG o WebP.');
 const url=URL.createObjectURL(file);
 try{
  return await new Promise((resolve,reject)=>{
   const image=new Image();
   const done=ok=>{
    clearTimeout(timer);image.onload=image.onerror=null;
    if(ok&&image.naturalWidth&&image.naturalHeight)resolve(image);
    else reject(Error('No se pudo abrir la foto. Prueba con otro archivo.'));
   };
   const timer=setTimeout(()=>done(false),8000);
   image.onload=()=>done(true);image.onerror=()=>done(false);image.src=url;
  });
 }finally{URL.revokeObjectURL(url);}
}
$('localPortrait').onchange=async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 const requested=++state.portraitRequest;
 $('portraitStatus').textContent='Abriendo foto…';
 try{
  const image=await decodeLocalPortrait(file);
  if(requested!==state.portraitRequest)return;
  state.localPortrait=image;$('removePortrait').hidden=false;
  $('portraitStatus').textContent='Foto añadida a la tarjeta.';void render();
 }catch(error){if(requested===state.portraitRequest)$('portraitStatus').textContent=error.message;}
};
$('removePortrait').onclick=()=>{
 state.portraitRequest++;state.localPortrait=null;$('localPortrait').value='';
 $('removePortrait').hidden=true;$('portraitStatus').textContent='Foto local quitada.';void render();
};
$('palette').append(new Option('Automática (según diseño)','-1'),...THEMES.map((t,i)=>new Option(t.name,String(i))));
$('palette').onchange=e=>{state.palette=Number(e.target.value);void render();};
$('furigana').checked=state.furigana;$('furigana').onchange=e=>{state.furigana=e.target.checked;void render();};
$('textScale').oninput=e=>{state.scale=Number(e.target.value)||1;void render();};
$('themeToggle').onclick=()=>{
 const html=document.documentElement,light=html.dataset.theme!=='light';
 html.dataset.theme=light?'light':'dark';$('themeToggle').setAttribute('aria-pressed',String(light));
 $('themeToggle').textContent=light?'Modo oscuro':'Modo claro';
};
$('download').onclick=()=>{
 const info={item:state.item,kind:state.kind,format:state.format};
 $('status').textContent='';
 try{
  canvas.toBlob(blob=>{
   if(!blob){$('status').textContent='No se pudo guardar el PNG. Vuelve a intentarlo.';return;}
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.download='asallam-'+LABELS[info.kind].toLowerCase()+'-'+info.item.number+'-'+info.format+'.png';a.href=url;
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  },'image/png');
 }catch(e){$('status').textContent='No se pudo guardar el PNG en este navegador.';}
};
async function init(){
 const controls=[$('kind'),$('selection'),$('today'),$('random'),$('design')];
 controls.forEach(x=>x.disabled=true);$('status').textContent='Cargando tarjetas…';
 // Draw an immediate source-verified fallback, then use the complete selection.
 setOptions();choose(currentDaily());
 const values=await Promise.all(Object.values(files).map(request));
 const [curated,words,phrases,kanji,manifest]=values;
 state.catalog=makeCatalog(curated,words,phrases,kanji);state.lists=manifestLists(manifest);state.day=dateKey();
 setOptions();choose(currentDaily());
 controls.forEach(x=>x.disabled=false);
 $('status').textContent=curated||words||phrases||kanji?'':'Mostrando tarjetas básicas mientras el catálogo no está disponible.';
}
init().catch(()=>{$('status').textContent='No se pudieron cargar todas las tarjetas. Puedes seguir usando la vista básica.';[$('kind'),$('selection'),$('today'),$('random'),$('design')].forEach(b=>b.disabled=false);});
})(typeof window!=='undefined'?window:globalThis);
