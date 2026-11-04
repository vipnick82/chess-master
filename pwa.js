"use strict";
/* Phone-app build only: offline cache (service worker), "new version" notice and install help.
   The Claude page does not load this file, so window.PWA is undefined there. */
(function(){
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
  const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone===true;
  const PWA = window.PWA = {
    isIOS, standalone, prompt:null,
    install(){ const p=this.prompt; if (!p) return; p.prompt(); (p.userChoice||Promise.resolve()).finally(()=>{ this.prompt=null; if (typeof softRefresh==="function") softRefresh(); }); }
  };
  window.addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); PWA.prompt=e; if (typeof softRefresh==="function") softRefresh(); });
  window.addEventListener("appinstalled", ()=>{ PWA.prompt=null; });
  if (!("serviceWorker" in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  window.addEventListener("load", ()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); });
  // a new version took over: offer a reload instead of interrupting a puzzle or a game
  let shown=false;
  navigator.serviceWorker.addEventListener("controllerchange", ()=>{
    if (!hadController || shown) return; shown=true;
    const bar=document.createElement("div"); bar.className="updbar"; bar.setAttribute("role","status");
    const t=document.createElement("span"); t.textContent="Има нова версия на приложението.";
    const b=document.createElement("button"); b.className="btn sm primary"; b.textContent="Обнови"; b.onclick=()=>location.reload();
    bar.append(t,b); document.body.append(bar);
  });
})();
