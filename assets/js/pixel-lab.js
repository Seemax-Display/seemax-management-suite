(function () {
 "use strict";
 let dialog=null,frame=null,ready=false,openedAt=0,context={},opener=null,owner="",revealTimer=0,timeoutTimer=0,oldOverflow="",comparisonRevision=0;
 const siteRoot=new URL("../../",document.currentScript.src);
 function snapshot(products) {
  return (Array.isArray(products)?products:[]).map(product=>{
   const result={id:String(product.id||""),nome:String(product.nome||"")};
   Object.keys(product).filter(key=>/^tech_[a-z_]+$/.test(key)).forEach(key=>{result[key]=String(product[key]??"").slice(0,500);});
   return result;
  });
 }
 function sendCatalog() {
  if(!frame||!ready)return;
  frame.contentWindow.postMessage({type:"SEEMAX_PIXEL_LAB_CATALOG",products:snapshot(context.products),catalogLabel:context.offlineOnly?"Catalogo disponibile offline":"Catalogo già caricato nel gestionale",comparison:Array.isArray(context.comparison)?context.comparison:null,comparisonRevision},window.location.origin);
 }
 function finishOpen() {
  if(!dialog||!dialog.open||!ready)return;
  const reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait=Math.max(0,(reduced?0:1150)-(performance.now()-openedAt));
  clearTimeout(revealTimer);
  revealTimer=setTimeout(()=>{
   if(!dialog||!dialog.open||!ready)return;
   dialog.classList.add("pixel-lab-is-ready");
   dialog.querySelector(".pixel-lab-launch").hidden=true;
   frame.removeAttribute("aria-hidden");frame.tabIndex=0;
   dialog.querySelector("[data-lab-close]").focus({preventScroll:true});
  },wait);
 }
 function showError() {
  if(!dialog||!dialog.open||ready)return;
  const panel=dialog.querySelector(".pixel-lab-launch");
  panel.classList.add("pixel-lab-launch-error");
  panel.querySelector("strong").textContent="Pixel Lab non disponibile";
  panel.querySelector("p").textContent="La pagina non è stata caricata. Se sei offline, apri il gestionale online una volta per aggiornare i file dell’app.";
  panel.querySelector("[data-lab-retry]").hidden=false;
 }
 function loadFrame() {
  ready=false;clearTimeout(timeoutTimer);
  dialog.classList.remove("pixel-lab-is-ready");
  const panel=dialog.querySelector(".pixel-lab-launch");
  panel.hidden=false;panel.classList.remove("pixel-lab-launch-error");
  panel.querySelector("strong").textContent="Ogni pixel conta.";
  panel.querySelector("p").textContent="I tuoi Ledwall, pronti per il confronto.";
  panel.querySelector("[data-lab-retry]").hidden=true;
  frame.setAttribute("aria-hidden","true");frame.tabIndex=-1;
  frame.src=new URL("pixel-lab/index.html",siteRoot).href;
  timeoutTimer=setTimeout(showError,15000);
 }
 function ensureDialog() {
  if(dialog)return;
  dialog=document.createElement("dialog");dialog.className="pixel-lab-dialog";dialog.id="pixelLabDialog";
  dialog.setAttribute("aria-label","Seemax Pixel Lab — confronto Ledwall");
  dialog.innerHTML='<header class="pixel-lab-dialog-bar"><div><span>SEEMAX PIXEL LAB</span><small>Confronto Ledwall · il tuo lavoro rimane aperto</small></div><button type="button" class="btn soft" data-lab-close>← Torna al lavoro</button></header><section class="pixel-lab-launch" role="status" aria-live="polite"><div class="pixel-lab-flight" aria-hidden="true"><i class="pixel-lab-monitor pixel-lab-monitor-a"></i><i class="pixel-lab-monitor pixel-lab-monitor-b"></i><b class="pixel-lab-burst"></b></div><strong>Ogni pixel conta.</strong><p>I tuoi Ledwall, pronti per il confronto.</p><button type="button" class="btn primary" data-lab-retry hidden>Riprova</button></section><iframe class="pixel-lab-frame" title="Laboratorio di confronto Ledwall" referrerpolicy="same-origin"></iframe>';
  document.body.append(dialog);frame=dialog.querySelector("iframe");
  dialog.querySelector("[data-lab-close]").addEventListener("click",close);
  dialog.querySelector("[data-lab-retry]").addEventListener("click",()=>{openedAt=performance.now();loadFrame();});
  dialog.addEventListener("cancel",event=>{event.preventDefault();close();});
  dialog.addEventListener("close",()=>{document.body.style.overflow=oldOverflow;});
 }
 function open(options={}) {
  const user=String(options.username||"offline");
  if(owner&&owner!==user)reset();
  owner=user;context=options;comparisonRevision++;
  ensureDialog();
  if(dialog.open)return;
  opener=document.activeElement;openedAt=performance.now();oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  dialog.querySelector(".pixel-lab-launch").hidden=false;
  dialog.classList.remove("pixel-lab-is-ready");
  frame.setAttribute("aria-hidden","true");frame.tabIndex=-1;
  /* Ricrea solo il gruppo animato: l'iframe e le immagini restano in memoria. */
  const flight=dialog.querySelector(".pixel-lab-flight");
  flight.replaceWith(flight.cloneNode(true));
  dialog.showModal();
  if(!frame.getAttribute("src"))loadFrame();
  else if(ready){sendCatalog();finishOpen();}
  else {clearTimeout(timeoutTimer);timeoutTimer=setTimeout(showError,15000);}
 }
 function close() {
  if(!dialog||!dialog.open)return;
  clearTimeout(revealTimer);clearTimeout(timeoutTimer);dialog.close();
  document.body.style.overflow=oldOverflow;
  if(opener&&opener.isConnected)opener.focus({preventScroll:true});
 }
 function reset() {
  close();clearTimeout(revealTimer);clearTimeout(timeoutTimer);
  if(dialog)dialog.remove();
  dialog=null;frame=null;ready=false;context={};owner="";opener=null;
 }
 window.addEventListener("message",event=>{
  if(!frame||event.source!==frame.contentWindow||event.origin!==window.location.origin)return;
  if(!event.data||typeof event.data.type!=="string")return;
  if(event.data.type==="SEEMAX_PIXEL_LAB_READY"){ready=true;clearTimeout(timeoutTimer);sendCatalog();finishOpen();}
  if(event.data.type==="SEEMAX_PIXEL_LAB_CLOSE")close();
 });
 window.SeemaxPixelLab={open,close,reset};
})();

