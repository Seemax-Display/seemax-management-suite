
"use strict";
(() => {
const {MODELS,TECH_FIELDS,metrics,energy,clampInt,hydrateCatalog}=window.LedEngine;
const $=id=>document.getElementById(id),nf=new Intl.NumberFormat('it-IT'),dec=(v,n=2)=>new Intl.NumberFormat('it-IT',{minimumFractionDigits:0,maximumFractionDigits:n}).format(v);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const quantity=(value,unit='',n=2)=>value===null||!Number.isFinite(value)?'Da verificare':dec(value,n)+(unit?' '+unit:'');
const composition=m=>m.mix?`${m.mix.rect} cabinet 50×100 + ${m.mix.square} cabinet 50×50`:`${m.cols} × ${m.rows} cabinet`;
const DEFAULT={a:{id:'p25',cols:1,rows:1},b:{id:'p391',cols:1,rows:1},source:'photo',fit:'contain',scale:'physical',cabinetGrid:false,pixelGrid:true,zoom:4,panX:50,panY:50,hours:8,days:30,tab:'resolution'};
let lastComparisonRevision=null;
let state=JSON.parse(JSON.stringify(DEFAULT)),current={},rects={},sourceCanvas=document.createElement('canvas'),customImage=null,customName='',toastTimer,frame=0,animTimer;
const photo=$('defaultPhoto');let photoReady=false;
try{const saved=JSON.parse(localStorage.getItem('SEEMAX_PIXEL_LAB_INTEGRATED_V1')||'null');if(saved){for(const side of ['a','b']){const v=saved[side];if(v&&MODELS[v.id])state[side]={id:v.id,cols:clampInt(v.cols,1,8),rows:clampInt(v.rows,1,8)};}if(['photo','graphic','text'].includes(saved.source))state.source=saved.source;if(['physical','normalized'].includes(saved.scale))state.scale=saved.scale;if(['contain','cover'].includes(saved.fit))state.fit=saved.fit;}}
catch(e){}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function persist(){try{localStorage.setItem('SEEMAX_PIXEL_LAB_INTEGRATED_V1',JSON.stringify({...state,source:state.source==='custom'?'photo':state.source}));}catch(e){}}
function sourceImage(){if(state.source==='custom'&&customImage)return customImage;if(state.source==='photo'&&photoReady)return photo;return sourceCanvas;}
function drawSource(){const c=sourceCanvas;c.width=c.height=2048;const x=c.getContext('2d');x.fillStyle='#0a2349';x.fillRect(0,0,2048,2048);if(state.source==='text'){
 x.fillStyle='#f5f8ff';x.fillRect(0,0,2048,2048);x.fillStyle='#153762';x.font='800 176px Arial';x.fillText('SEEMAX',110,260);x.font='72px Arial';x.fillText('Ogni pixel fa la differenza.',110,395);x.fillStyle='#245fc9';x.fillRect(110,460,1828,10);
 [96,72,56,40,28,20,14].forEach((s,i)=>{x.fillStyle='#183956';x.font=`${s}px Arial`;x.fillText('Aa Bb 0123456789 · Dettaglio e definizione',110,650+i*145);});
 for(let i=0;i<40;i++){x.fillStyle=i%2?'#fff':'#133a6c';x.fillRect(110+i*46,1800,23,120);}return;
 }
 const g=x.createLinearGradient(0,0,2048,2048);g.addColorStop(0,'#0c2d60');g.addColorStop(.65,'#235fbc');g.addColorStop(1,'#3cc5d5');x.fillStyle=g;x.fillRect(0,0,2048,2048);
 x.fillStyle='#ffffff15';x.beginPath();x.arc(1820,160,700,0,Math.PI*2);x.fill();x.fillStyle='#ffffff0c';x.beginPath();x.arc(1600,1800,620,0,Math.PI*2);x.fill();
 x.fillStyle='#a8d7ff';x.font='700 42px Arial';x.fillText('SEEMAX DISPLAY',120,180);x.fillStyle='#fff';x.font='850 205px Arial';x.fillText('La tua',120,580);x.fillText('visione.',120,805);x.fillStyle='#66e3ee';x.fillText('Più grande.',120,1030);x.fillStyle='#fff';x.font='52px Arial';x.fillText('Immagini. Colori. Nuove possibilità.',125,1220);x.fillStyle='#ef6e6e';x.fillRect(125,1340,225,13);
 const colors=['#fd5b6b','#ffc34f','#4ad6a6','#4ec5ff','#a77cff','#f8faff'];colors.forEach((v,i)=>{x.fillStyle=v;x.fillRect(125+i*300,1650,250,165);});
}
function drawNative(side){const m=current[side],c=$('screen-'+side);if(c.width!==m.rx)c.width=m.rx;if(c.height!==m.ry)c.height=m.ry;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.fillStyle='#0b1423';x.fillRect(0,0,c.width,c.height);const img=sourceImage(),iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const scale=(state.fit==='contain'?Math.min:Math.max)(m.rx/iw,m.ry/ih),w=iw*scale,h=ih*scale,dx=(m.rx-w)/2,dy=(m.ry-h)/2;x.drawImage(img,dx,dy,w,h);rects[side]={x:dx,y:dy,w,h,iw,ih};}
function placeDisplays(){if(!current.a)return;const stages=[$('stage-a'),$('stage-b')];const availW=Math.max(55,Math.min(...stages.map(e=>e.clientWidth))-65),availH=Math.min(...stages.map(e=>e.clientHeight))-65;const common=Math.min(availW/Math.max(current.a.w,current.b.w),availH/Math.max(current.a.h,current.b.h));for(const side of ['a','b']){const m=current[side],scale=state.scale==='physical'?common:Math.min(availW/m.w,availH/m.h);$('assembly-'+side).style.width=(m.w*scale)+'px';$('assembly-'+side).style.height=(m.h*scale)+'px';}}
function updateLenses(){if(!current.a)return;for(const side of ['a','b']){const m=current[side],src=$('screen-'+side),dst=$('lens-'+side),x=dst.getContext('2d'),r=rects[side];const sw=Math.max(1,Math.min(m.rx,m.ry,r.w/state.zoom)),sh=sw;const cx=r.x+r.w*state.panX/100,cy=r.y+r.h*state.panY/100;const sx=Math.min(Math.max(0,cx-sw/2),m.rx-sw),sy=Math.min(Math.max(0,cy-sh/2),m.ry-sh);const ix=Math.round(sx),iy=Math.round(sy),size=Math.max(1,Math.min(Math.round(sw),m.rx-ix,m.ry-iy));x.fillStyle='#101824';x.fillRect(0,0,dst.width,dst.height);x.imageSmoothingEnabled=false;x.drawImage(src,ix,iy,size,size,0,0,dst.width,dst.height);const px=dst.width/size;if(state.pixelGrid&&px>=5){x.strokeStyle='#ffffff30';x.lineWidth=1;for(let n=1;n<size;n++){const k=Math.round(n*px)+.5;x.beginPath();x.moveTo(k,0);x.lineTo(k,dst.height);x.moveTo(0,k);x.lineTo(dst.width,k);x.stroke();}}$('sample-'+side).textContent=`${nf.format(size)} × ${nf.format(size)} px`;$('lens-hint-'+side).textContent=`×${state.zoom} sul contenuto · pixel ingranditi senza sfumatura`;$('lens-name-'+side).textContent=m.p.name;}}
function specRow(label,a,b,cls=''){return `<tr${cls?' class="'+cls+'"':''}><td>${label}</td><td>${a}</td><td>${b}</td></tr>`;}
function updateSpecs(){
 const a=current.a,b=current.b;let rows='';
 const group=t=>{rows+='<tr class="group"><td colspan="3">'+t+'</td></tr>';};
 const row=(label,fn)=>rows+=specRow(label,fn(a),fn(b));
 group('COMPOSIZIONE E RISOLUZIONE');
 row('Colonne × righe di composizione',m=>m.cols+' × '+m.rows+(m.p.unified?' passi da 50 cm':' cabinet'));
 row('Cabinet fisici',m=>'<b>'+m.count+' cabinet</b><small>'+composition(m)+'</small>');
 row('Dimensioni cabinet',m=>m.p.unified?'Composizione unica 50×100 + 50×50 cm':m.p.cabW+' × '+m.p.cabH+' cm');
 row('Matrice per passo di composizione',m=>m.p.pxW+' × '+m.p.pxH+' px'+(m.p.unified?'<small>Ogni passo 50×50 cm; 50×100 cm = 128×256 px.</small>':''));
 row('Configurazione',m=>m.fromPlanner&&m.faces===2?'Bifacciale · render di una faccia, cabinet totali':'Monofacciale');
 row('Dimensioni complessive',m=>'<b>'+m.w+' × '+m.h+' cm</b>');
 row('Superficie luminosa',m=>quantity(m.area,'m²',4));
 row('Risoluzione complessiva',m=>'<b>'+m.rx+' × '+m.ry+' px</b>');
 row('Pixel totali',m=>nf.format(m.pixels));
 row('Densità pixel calcolata',m=>quantity(m.density,'px/m²'));
 row('Passo nominale',m=>quantity(m.p.pitch,'mm'));
 row('Passo calcolato X × Y',m=>quantity(m.pitchExact,'',5)+' × '+quantity(m.pitchY,'mm',5));
 row('Riferimento della matrice',m=>esc(m.p.matrixSource));
 group('POTENZA E UTILIZZO');
 row('Potenza media stimata per una faccia',m=>'<b>'+quantity(m.avgW,'W')+'</b>');
 row('Potenza massima di riferimento per una faccia',m=>quantity(m.maxW,'W'));
 row('Energia stimata · '+state.hours+' h × '+state.days+' giorni',m=>quantity(energy(m,state.hours,state.days),'kWh'));
 group('CARATTERISTICHE DELLA SCHEDA');
 for(const [key,label] of TECH_FIELDS) {
  if(key==='tech_misura')continue;
  row(label,m=>{
   const value=m.p.tech[key];
   if(!value)return '<span class="warn">Da verificare</span>';
   if(key==='tech_scala_grigi'&&String(value).trim()==='16')return '<span class="warn">16 — da verificare</span><small>Confermare se il dato indica bit o livelli.</small>';
   if(key==='tech_peso_cabinet'&&String(value).includes('/'))return '<span class="warn">'+esc(value)+'</span><small>Confermare il peso della variante impiegata.</small>';
   return esc(value);
  });
 }
 row('Origine dei dati tecnici',m=>esc(m.p.source)+'<small>'+esc(m.p.sourceNote)+'</small>');
 $('tech-body').innerHTML=rows;$('th-a').textContent='A · '+a.p.name;$('th-b').textContent='B · '+b.p.name;
 $('energy-summary').textContent='A: '+quantity(energy(a,state.hours,state.days),'kWh')+' · B: '+quantity(energy(b,state.hours,state.days),'kWh')+' nel periodo impostato.';
}
function render(){drawSource();for(const side of ['a','b']){const s=state[side],m=metrics(s.id,s.cols,s.rows,s.configuration);current[side]=m;$('model-'+side).value=s.id;$('cols-'+side).value=m.cols;$('rows-'+side).value=m.rows;$('cols-'+side).disabled=!!s.configuration;$('rows-'+side).disabled=!!s.configuration;$('hint-'+side).textContent=m.fromPlanner?'Misure esatte dal Planner · il render mostra una faccia':m.p.unified?'Unico modello · passi di 50 cm · 128 px ogni 50 cm':`Cabinet ${m.p.cabW} × ${m.p.cabH} cm · ${m.p.pxW} × ${m.p.pxH} px`;$('count-'+side).textContent=`${m.count} cabinet fisici${m.fromPlanner?(m.faces===2?' · bifacciale, conteggio totale':' · dal Planner'):' · massimo 8 × 8 passi'}`;$('name-'+side).textContent=m.p.name;$('native-'+side).textContent=`${m.rx} × ${m.ry} px`;$('width-'+side).textContent=m.w+' cm';$('height-'+side).textContent=m.h+' cm';$('array-'+side).textContent=composition(m);$('ratio-'+side).textContent=`${dec(m.w/100)} × ${dec(m.h/100)} m`;$('pixels-'+side).textContent=nf.format(m.pixels);$('area-'+side).innerHTML=`${dec(m.area,4)} <span class="unit">m²</span>`;$('power-'+side).textContent=quantity(m.avgW,'W');$('grid-'+side).hidden=!state.cabinetGrid;$('grid-'+side).style.backgroundSize=`${100/m.cols}% ${100/m.rows}%`;drawNative(side);}const ratio=current.a.pixels/current.b.pixels;$('insight').textContent=Math.abs(ratio-1)<1e-9?'Stessa risoluzione totale. Il passo fisico resta una caratteristica del modello.':ratio>1?`A ha ${dec(ratio)}× i pixel totali di B.`:`B ha ${dec(1/ratio)}× i pixel totali di A.`;$('scaleHint').textContent=state.scale==='physical'?'Render alla stessa scala fisica. Confronta anche le dimensioni.':'Ingombro normalizzato: le dimensioni fisiche non sono in scala tra i render.';for(const b of document.querySelectorAll('[data-source]'))b.classList.toggle('active',state.source===b.dataset.source);for(const b of document.querySelectorAll('[data-zoom]'))b.classList.toggle('active',state.zoom===Number(b.dataset.zoom));$('scaleMode').value=state.scale;$('imageFit').value=state.fit;$('cabinetGrid').checked=state.cabinetGrid;$('pixelGrid').checked=state.pixelGrid;$('panX').value=state.panX;$('panY').value=state.panY;const img=sourceImage(),iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const limited=['a','b'].filter(s=>rects[s].w>iw+1||rects[s].h>ih+1);const label=state.source==='custom'?customName:state.source==='photo'?'Fotografia predefinita, generata con IA':state.source==='graphic'?'Grafica commerciale di test':'Tavola testi e linee';$('sourceMeta').textContent=`${label} · sorgente ${iw} × ${ih} px. ${limited.length?'La configurazione '+limited.map(s=>s.toUpperCase()).join(' e ')+' ingrandisce la sorgente: non aggiunge dettaglio all’immagine.':''}${state.source==='custom'?' Il file resta nella pagina e andrà ricaricato dopo la chiusura.':''}`;updateSpecs();placeDisplays();updateLenses();persist();updateStepButtons();}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(render);}
function updateStepButtons(){for(const b of document.querySelectorAll('[data-step]')){const input=$(b.dataset.target);b.disabled=input.disabled||Number(input.value)+(Number(b.dataset.step))<1||Number(input.value)+Number(b.dataset.step)>8;}const vectors={single:[1,1,1,1],pixels:[1,1,2,2],near:[3,3,4,4],large:[5,3,6,4]};for(const b of document.querySelectorAll('[data-preset]')){const v=vectors[b.dataset.preset];b.classList.toggle('is-active',state.a.id==='p25'&&state.b.id==='p391'&&state.a.cols===v[0]&&state.a.rows===v[1]&&state.b.cols===v[2]&&state.b.rows===v[3]);}}
function setTab(tab){state.tab=tab;for(const t of ['resolution','specs']){$(t+'-tab').setAttribute('aria-selected',String(t===tab));$(t+'-tab').tabIndex=t===tab?0:-1;$(t+'-pane').hidden=t!==tab;}if(tab==='resolution')requestAnimationFrame(placeDisplays);}
function animate(){setTab('resolution');render();const bench=$('bench');bench.classList.remove('comparing');void bench.offsetWidth;bench.classList.add('comparing');clearTimeout(animTimer);animTimer=setTimeout(()=>bench.classList.remove('comparing'),950);toast('Confronto aggiornato. Stessa immagine, due matrici native.');}
function clearPreset(){document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('is-active'));}
for(const side of ['a','b']){const select=$('model-'+side);select.replaceChildren();for(const p of Object.values(MODELS)){const o=document.createElement('option');o.value=p.id;o.textContent=p.name+(p.unified?' · unificato':` · ${p.cabW}×${p.cabH}`);select.append(o);}select.addEventListener('change',()=>{state[side].id=select.value;delete state[side].configuration;state[side].cols=clampInt(state[side].cols,1,8);state[side].rows=clampInt(state[side].rows,1,8);clearPreset();schedule();});for(const axis of ['cols','rows'])$(axis+'-'+side).addEventListener('change',e=>{state[side][axis]=clampInt(e.target.value,1,8);clearPreset();schedule();});}
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{const [axis,side]=b.dataset.target.split('-');state[side][axis]=clampInt(state[side][axis]+Number(b.dataset.step),1,8);clearPreset();render();}));
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const presets={single:[1,1,1,1],pixels:[1,1,2,2],near:[3,3,4,4],large:[5,3,6,4]},n=presets[b.dataset.preset];state.a={id:'p25',cols:n[0],rows:n[1]};state.b={id:'p391',cols:n[2],rows:n[3]};clearPreset();b.classList.add('is-active');animate();}));
document.querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',()=>{state.source=b.dataset.source;schedule();}));document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{state.zoom=Number(b.dataset.zoom);document.querySelectorAll('[data-zoom]').forEach(t=>t.classList.toggle('active',t===b));updateLenses();}));
for(const key of ['panX','panY'])$(key).addEventListener('input',e=>{state[key]=Number(e.target.value);updateLenses();});$('pixelGrid').addEventListener('change',e=>{state.pixelGrid=e.target.checked;updateLenses();});$('cabinetGrid').addEventListener('change',e=>{state.cabinetGrid=e.target.checked;schedule();});$('scaleMode').addEventListener('change',e=>{state.scale=e.target.value;schedule();});$('imageFit').addEventListener('change',e=>{state.fit=e.target.value;schedule();});
for(const key of ['hours','days'])$(key).addEventListener('change',e=>{state[key]=clampInt(e.target.value,1,key==='hours'?24:31,key==='hours'?8:30);e.target.value=state[key];updateSpecs();});
for(const t of ['resolution','specs']){$(t+'-tab').addEventListener('click',()=>setTab(t));$(t+'-tab').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'resolution':e.key==='End'?'specs':t==='resolution'?'specs':'resolution';setTab(next);$(next+'-tab').focus();}});}
for(const side of ['a','b'])$('screen-'+side).addEventListener('pointerdown',e=>{const c=e.currentTarget,b=c.getBoundingClientRect(),m=current[side],r=rects[side];state.panX=Math.min(100,Math.max(0,((e.clientX-b.left)/b.width*m.rx-r.x)/r.w*100));state.panY=Math.min(100,Math.max(0,((e.clientY-b.top)/b.height*m.ry-r.y)/r.h*100));$('panX').value=state.panX;$('panY').value=state.panY;updateLenses();});
$('upload').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024){toast('Scegli un’immagine PNG, JPEG o WebP fino a 12 MB.');e.target.value='';return;}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{if(img.naturalWidth*img.naturalHeight>24000000){URL.revokeObjectURL(url);toast('Immagine troppo grande: usa un file fino a 24 megapixel.');return;}customImage=img;customName=file.name;state.source='custom';render();URL.revokeObjectURL(url);toast('Immagine caricata in locale, senza invio a un server.');};img.onerror=()=>{URL.revokeObjectURL(url);toast('Non riesco a leggere questa immagine. Prova un altro file.');};img.src=url;e.target.value='';});
$('reset').addEventListener('click',()=>{state=JSON.parse(JSON.stringify(DEFAULT));customImage=null;customName='';$('hours').value=8;$('days').value=30;clearPreset();document.querySelector('[data-preset="single"]').classList.add('is-active');setTab('resolution');animate();});
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000);}
$('about').addEventListener('click',()=>{const notes=$('labNotes');notes.open=!notes.open;if(notes.open)notes.scrollIntoView({behavior:'smooth',block:'start'});});
$('export').addEventListener('click',()=>{render();const c=document.createElement('canvas');c.width=1800;c.height=1350;const x=c.getContext('2d');x.fillStyle='#f5f8fc';x.fillRect(0,0,c.width,c.height);x.fillStyle='#153052';x.font='800 43px Arial';x.fillText('SEEMAX PIXEL LAB',65,84);x.fillStyle='#6d7c91';x.font='23px Arial';x.fillText('Confronto della risoluzione · simulazione digitale · una faccia',65,127);let common=Math.min(720/Math.max(current.a.w,current.b.w),600/Math.max(current.a.h,current.b.h));for(const [i,side]of ['a','b'].entries()){const m=current[side],ox=65+i*865;x.fillStyle='#fff';x.fillRect(ox,175,805,1005);x.fillStyle=side==='a'?'#205cca':'#8153ba';x.font='800 34px Arial';x.fillText(side.toUpperCase()+' · '+m.p.name,ox+30,230);x.fillStyle='#64758b';x.font='23px Arial';x.fillText(`${m.rx} × ${m.ry} px`,ox+30,270);const scale=state.scale==='physical'?common:Math.min(720/m.w,600/m.h),w=m.w*scale,h=m.h*scale,px=ox+(805-w)/2,py=320+(600-h)/2;x.fillStyle='#111b2c';x.fillRect(px-7,py-7,w+14,h+14);x.imageSmoothingEnabled=false;x.drawImage($('screen-'+side),px,py,w,h);x.fillStyle='#183451';x.font='700 27px Arial';x.fillText(`${m.w} × ${m.h} cm · ${m.count} cabinet`,ox+30,990);x.font='23px Arial';x.fillText(`${nf.format(m.pixels)} pixel · ${dec(m.area,4)} m²`,ox+30,1033);x.fillText(`Potenza media stimata: ${quantity(m.avgW,'W')}`,ox+30,1076);x.fillText(`Passo nominale: ${dec(m.p.pitch)} mm`,ox+30,1119);}x.fillStyle='#6d7c91';x.font='21px Arial';x.fillText(state.scale==='physical'?'Render alla stessa scala fisica.':'Ingombro normalizzato: i due render non sono alla stessa scala fisica.',65,1223);x.fillText('La simulazione non riproduce luminosità, refresh e percezione del display reale.',65,1261);x.fillText('Dati dal catalogo disponibile. Confermare la variante e i campi segnalati prima dell’offerta.',65,1299);c.toBlob(blob=>{if(blob)download(blob,'SEEMAX_Confronto_'+current.a.p.name+'_vs_'+current.b.p.name+'.png');else toast('Esportazione non riuscita. Riprova.');},'image/png');});
window.addEventListener('message',event=>{
 if(window.parent===window||event.source!==window.parent||event.origin!==window.location.origin)return;
 if(!event.data||event.data.type!=='SEEMAX_PIXEL_LAB_CATALOG')return;
 hydrateCatalog(Array.isArray(event.data.products)?event.data.products:[]);
 $('catalogSourceStatus').textContent=event.data.catalogLabel||'Catalogo locale del gestionale';
 const choices=event.data.comparison;
 if(Array.isArray(choices)&&choices.length===2&&event.data.comparisonRevision!==lastComparisonRevision){
  try{
   const validated=choices.map(choice=>{if(!choice||!MODELS[choice.id]||!choice.configuration)throw new Error('Confronto non valido');metrics(choice.id,choice.cols,choice.rows,choice.configuration);return {id:choice.id,cols:clampInt(choice.cols,1,1000),rows:clampInt(choice.rows,1,1000),configuration:choice.configuration};});
   state.a=validated[0];state.b=validated[1];lastComparisonRevision=event.data.comparisonRevision;clearPreset();setTab('resolution');
   $('catalogSourceStatus').textContent+=' · confronto con misure esatte dal Planner';
  }catch(error){toast(error.message||'Impossibile importare il confronto.');return;}
 }
 render();
});
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&window.parent!==window)window.parent.postMessage({type:'SEEMAX_PIXEL_LAB_CLOSE'},window.location.origin);});
new ResizeObserver(()=>{if(state.tab==='resolution')placeDisplays();}).observe($('bench'));
photo.onload=()=>{photoReady=true;schedule();};photo.onerror=()=>{if(state.source==='photo'){state.source='graphic';toast('Fotografia non disponibile: uso la grafica di test.');schedule();}};if(photo.complete&&photo.naturalWidth)photoReady=true;setTab('resolution');render();
if(window.parent!==window)window.parent.postMessage({type:'SEEMAX_PIXEL_LAB_READY'},window.location.origin);
})();

