"use strict";
/* ============ router ============ */
let cleanup = [];
function onLeave(f){ cleanup.push(f); }
const FOCUS = new Set(["daily","lesson","study","drill","session","puzzle","storm","fix","review","play","game","course"]);
const TAB = {daily:"train",home:"home",learn:"learn",lesson:"learn",course:"learn",study:"learn",drill:"learn",train:"train",session:"home",puzzle:"train",storm:"train",fix:"train",review:"train",play:"play",game:"progress",progress:"progress"};
function route(){
  cleanup.forEach(f=>{ try{ f(); }catch(e){} }); cleanup=[];
  Engine.cancel();
  const hash=(location.hash||"#home").slice(1);
  let [view, ...rest] = hash.split("--"); const arg=rest.join("--");
  view = ({tactics:"train", openings:"learn", mylines:"home", editor:"home", shuffle:"learn", learnline:"study"})[view] || view;
  if (!VIEWS[view]) view="home";
  const app=$("#app"); app.innerHTML="";
  document.body.classList.toggle("focus", FOCUS.has(view));
  document.querySelectorAll("#nav a").forEach(a=>a.toggleAttribute("aria-current", false));
  const cur=document.querySelector(`#nav a[data-tab="${TAB[view]||"home"}"]`); if (cur) cur.setAttribute("aria-current","page");
  updateBadges();
  VIEWS[view](app, arg);
  window.scrollTo(0,0);
}
window.addEventListener("hashchange", route);
function go(h_){ if (location.hash==="#"+h_) route(); else location.hash=h_; }
function softRefresh(){ const v=(location.hash||"#home").slice(1).split("--")[0]; if (["home","learn","train","progress",""].includes(v)) route(); else updateBadges(); }
function updateBadges(){
  const a=document.querySelector('#nav a[data-tab="train"]'); if (!a) return;
  a.querySelectorAll(".badge").forEach(x=>x.remove()); const n=mistDue().length + dueLines().length; if (n) a.append(h("span",{class:"badge"},n));
}

/* ============ coach: what to learn and train next ============ */
const LESSON_BY_ID = Object.fromEntries(LESSONS.map(l=>[l.id,l]));
function lessonDone(id){ const s=S.les[id]; return !!(s && s.done); }
function coachView(){
  const p=profile(); const weak=[];
  const rr=rushRate(); if (rr!=null && rr>=.5) weak.push({k:"rush", t:"Бързаш с ходовете", why:`${Math.round(rr*100)}% от грешките ти в пъзелите са направени за по-малко от 6 секунди.`, fix:"Преди всеки ход: шахове, взимания, заплахи. Режимът „Мислене“ ще ти напомня.", lesson:"safe-check", src:"От пъзелите"});
  for (const hb of p.habits){ const lid=HABIT_LESSON[hb.k]; const H=HABITS[hb.k]; if (!lid||!H) continue; if (weak.some(w=>w.k===hb.k)) continue;
    weak.push({k:hb.k, t:H.t, why:H.why, fix:H.fix, lesson:lid, theme:HABIT_THEME[hb.k], src:`В ${hb.c} от последните ${p.n} ${plural(p.n,"партия","партии")}`}); }
  for (const x of themePlan()){ if (x.unknown || x.m>=.6) continue; const lid=THEME_LESSON[x.t]; if (!lid || weak.some(w=>w.lesson===lid)) continue;
    weak.push({k:"t-"+x.t, t:`Слаба тема: ${THEME_BG[x.t]}`, why:`Напоследък решаваш ${Math.round(x.m*100)}% от пъзелите с тази тема.`, fix:THEME_TIPS[x.t]||"Мини урока и реши упражнението.", lesson:lid, theme:x.t, src:`Последни ${x.n} опита`}); }
  return {p, weak:weak.slice(0,4)};
}
function nextLesson(){
  const c=coachView();
  for (const w of c.weak) if (!lessonDone(w.lesson)) return {l:LESSON_BY_ID[w.lesson], why:w};
  const startUnit = S.onb && S.onb.lvl==="club" ? 2 : 0;
  const order = [...LESSONS.filter(l=>UNITS.findIndex(u=>u.id===l.unit)>=startUnit), ...LESSONS];
  const l = order.find(l=>!lessonDone(l.id)); return l ? {l} : null;
}
function lessonsDoneCount(){ return LESSONS.filter(l=>lessonDone(l.id)).length; }
function dueLessonReviews(){ return LESSONS.filter(l=>{ const s=S.les[l.id]; return s && s.done && l.practice.puz && s.due && s.due<=Date.now(); }); }
function reviewLesson(id, ok){ const s=S.les[id]; if (!s) return; s.box = ok ? Math.min((s.box||1)+1, INTERVALS.length-1) : 1; s.due = Date.now() + INTERVALS[Math.max(1,s.box)]*DAY - 3600e3; save(); }
function startedLines(){ return Object.keys(S.lines).filter(id=>findLine(id)); }

// Today's session: your own mistakes, due opening lines (repertoire first), failed puzzles coming back,
// then puzzles from your weakest themes, interleaved, plus one "real game" puzzle with the theme hidden
function buildSession(){
  const items=[];
  mistDue().sort((a,b)=>a.due-b.due).slice(0,2).forEach(card=>items.push({k:"fix", id:card.id}));
  const rl=new Set(repLines()); dueLines().sort((a,b)=>(rl.has(b)?1:0)-(rl.has(a)?1:0)).slice(0,2).forEach(id=>items.push({k:"line", id}));
  const plan=themePlan(); const lab=x=>x.unknown?"Нова тема":x.habit?"От твоите партии":"Слабо място";
  const [a,b,c]=plan; const puz=[];
  [a,b,a,c,a,b].forEach(x=>puz.push({k:"puz", theme:x.t, why:lab(x)}));
  rqDue().slice(0,2).forEach((pid,i)=>puz.splice(1+i*3,0,{k:"puz", pid, why:"Връща се сгрешен пъзел"}));
  dueLessonReviews().slice(0,1).forEach(l=>puz.push({k:"puz", theme:l.theme, lesson:l.id, why:"Повторение на урок"}));
  puz.push({k:"puz", theme:"mix", why:"Като в партия"});
  puz.length=Math.min(puz.length,9);
  return [...puz.slice(0,2), ...items, ...puz.slice(2)];
}
function sessionDoneToday(){ return !!S.sessions[today()]; }

/* ============ home ============ */
function streak(){ let n=0; const set=new Set(S.days); let d=new Date(); if (!set.has(today())) d=new Date(Date.now()-DAY); while (set.has(d.toISOString().slice(0,10))){ n++; d=new Date(d-DAY); } return n; }
function greeting(){ const hr=new Date().getHours(); return hr<11 ? "Добро утро" : hr<18 ? "Здравей" : "Добър вечер"; }
let viewerName="";
/* filled, coloured icons for stats */
const FI = {
  flame:'<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c-4.4 0-7.5-3-7.5-7.2 0-3.6 2.6-5.8 4-8.1.4 1.9 1.4 3.2 2.7 3.8.4-3.3 1.7-5.9 4.3-7.7-.2 3 .9 5 2.4 6.8 1.3 1.6 2 3.3 2 5.6 0 3.8-3.3 6.8-7.9 6.8z" fill="#f5862b"/><path d="M12 22c-2.3 0-4-1.6-4-3.9 0-2 1.4-3.2 2.2-4.5.3 1 .9 1.8 1.6 2.1.2-1.7.9-3.1 2.3-4.1 0 1.7.5 2.8 1.3 3.8.7.9 1 1.8 1 3 0 2.1-1.8 3.6-4.4 3.6z" fill="#ffd166"/></svg>',
  bolt:'<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 1.8L4.2 13.6h6.6L9.4 22.2l10.4-12.6h-6.7z" fill="#f5bf3c"/><path d="M13.6 1.8L4.2 13.6h3.5l7.7-9.4z" fill="#ffe08a"/></svg>',
  medal:'<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l2 6H9z" fill="#4c9be6"/><path d="M17 2h-4l-2 6h4z" fill="#2c6cb8"/><circle cx="12" cy="15" r="7" fill="#e39b12"/><circle cx="12" cy="15" r="5.2" fill="#f5bf3c"/><path d="M12 11.6l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="#fff6d6"/></svg>',
  book:'<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5C5 4.3 8 4.3 12 6.2c4-1.9 7-1.9 9-.7V19c-2-1.2-5-1.2-9 .6-4-1.8-7-1.8-9-.6z" fill="#4c9be6"/><path d="M12 6.2v13.4c4-1.8 7-1.8 9-.6V5.5c-2-1.2-5-1.2-9 .7z" fill="#2c6cb8"/></svg>',
};
function fi(k){ const t=document.createElement("template"); t.innerHTML=FI[k]; return t.content.firstChild; }
function hstat(k, val, label){ return h("div",{class:"hstat"}, fi(k), h("div",null, h("b",null,val), h("small",null,label))); }
function weekStrip(){
  const set=new Set(S.days); const now=new Date(); const dow=(now.getDay()+6)%7; const names=["П","В","С","Ч","П","С","Н"];
  return h("div",{class:"week","aria-label":"Тази седмица"}, names.map((n,i)=>{ const d=new Date(now.getTime()+(i-dow)*DAY).toISOString().slice(0,10); const on=set.has(d);
    return h("div",{class:"wd"+(on?" on":"")+(i===dow?" today":"")+(i>dow?" future":"")}, h("span",null,n), h("i",null, on?icon("check"):null)); }));
}
function curSession(){ const c=S.cur; return c && c.d===today() && c.i<c.steps.length ? c : null; }
function ring(pct, label, sub){
  const ns="http://www.w3.org/2000/svg"; const svg=document.createElementNS(ns,"svg"); svg.setAttribute("viewBox","0 0 120 120"); svg.setAttribute("class","ring"); svg.setAttribute("aria-hidden","true");
  const mk=(tag,attrs)=>{ const e=document.createElementNS(ns,tag); Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v)); return e; };
  const defs=mk("defs",{}); const gr=mk("linearGradient",{id:"rg",x1:"0",y1:"0",x2:"0",y2:"1"}); gr.append(mk("stop",{offset:"0","stop-color":"#a6d872"}), mk("stop",{offset:"1","stop-color":"#5e9433"})); defs.append(gr); svg.append(defs);
  svg.append(mk("circle",{cx:60,cy:60,r:50,fill:"#1d1c1a"}), mk("circle",{cx:60,cy:60,r:44,fill:"none",stroke:"#3a3835","stroke-width":12}));
  if (pct>0) svg.append(mk("circle",{cx:60,cy:60,r:44,fill:"none",stroke:"url(#rg)","stroke-width":12,"stroke-linecap":"round","stroke-dasharray":`${Math.max(1,pct)*2.765} 277`,transform:"rotate(-90 60 60)"}));
  const t=mk("text",{x:60,y:sub?62:68,"text-anchor":"middle","font-family":"Montserrat, sans-serif","font-size":label.length>4?22:28,"font-weight":800,fill:"#fff"}); t.textContent=label; svg.append(t);
  if (sub){ const t2=mk("text",{x:60,y:82,"text-anchor":"middle","font-family":"Rubik, sans-serif","font-size":12,"font-weight":600,fill:"#a3a09b"}); t2.textContent=sub; svg.append(t2); }
  return svg;
}
/* puzzle of the day: the same for the whole day, near your rating */
function dailyPick(){
  if (!PZ) return null; const d=today();
  if (S.daily && S.daily.d===d){ const pz=puzzleById(S.daily.id); if (pz) return pz; }
  let hs=7; for (const ch of d) hs=(hs*31+ch.charCodeAt(0))>>>0;
  const r=S.puz.rating; const pool=PZ.p.filter(p=>Math.abs(p[3]-r)<=150 && !S.puz.hist[p[0]] && p[2].split(" ").length<=6);
  const list=pool.length?pool:PZ.p; const pz=list[hs%list.length];
  S.daily={d, id:pz[0], res:null}; save(); return pz;
}
function dailyCard(){
  const head=(chip)=>h("div",{class:"section-head"}, h("h2",null, tico("calendar","orange","sm"), "Пъзел на деня"), chip);
  const box=h("div",{class:"card daily"}, head(h("span",{class:"chip"},"...")), h("div",{style:"aspect-ratio:1;max-width:340px;width:100%;margin:0 auto;background:var(--sunk);border-radius:8px"}));
  loadPuzzles().then(()=>{
    const pz=dailyPick(); if (!pz || !box.isConnected) return; box.innerHTML="";
    const g=new Chess(pz[1]); const s0=pz[2].split(" ")[0]; g.move({from:s0.slice(0,2),to:s0.slice(2,4),promotion:s0[4]}); const uc=g.turn(); const res=S.daily.res;
    box.append(head(h("span",{class:"chip "+(res===1?"good":res!=null?"bad":"")}, res===1?"Решен":res!=null?"Опитан":"Рейтинг "+pz[3])),
      miniBoard(g.fen(), uc),
      h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"side-pill"}, h("span",{class:"pawn-dot "+uc}), `${sideName2(uc)} на ход`), h("span",{class:"muted small"}, new Date().toLocaleDateString("bg-BG",{day:"numeric",month:"long"}))),
      h("button",{class:"btn "+(res==null?"primary ":"")+"block",onclick:()=>go("daily")}, res==null ? "Реши пъзела" : "Виж го пак"));
  }).catch(()=>{});
  return box;
}
function vDaily(app){
  app.append(topbar("Пъзел на деня","home")); const host=h("div"); app.append(host);
  loadPuzzles().then(()=>{ const pz=dailyPick(); const first=S.daily.res==null;
    mountPuzzle(host, pz, {label:"Пъзел на деня", rated:first, xp:first, onResult:s=>{ if (S.daily.res==null){ S.daily.res=s; save(); if (s===1) confetti(); } }, onNext:()=>go("home"), nextLabel:"Към началото"});
  }).catch(()=>host.append(h("div",{class:"status bad"},"Пъзелите не се заредиха.")));
}
function qtile(ic, grad, title, sub, onclick){ return h("button",{class:"qtile",onclick}, tico(ic,grad), h("strong",null,title), h("small",null,sub)); }
function vHome(app){
  const fresh = !S.onb && S.puz.n===0 && !S.days.length;
  if (fresh){ app.append(onboarding()); return; }
  const c=coachView(); const nl=nextLesson(); const st=streak(); const done=sessionDoneToday(); const cur=curSession();
  const plan=cur ? cur.steps.slice(cur.i) : buildSession(); const nFix=plan.filter(x=>x.k==="fix").length, nLine=plan.filter(x=>x.k==="line").length, nPuz=plan.filter(x=>x.k==="puz").length;
  const mins=Math.max(cur?3:8, Math.round(nPuz*1.2 + nFix*1.5 + nLine*1.5));
  const L=levelOf(S.xp||0); const egDone=ENDGAMES.filter(e=>S.eg[e.id]&&S.eg[e.id].done).length;
  const ringEl = done && !cur ? ring(100,"✓","готово") : cur ? ring(cur.i/cur.steps.length*100, `${cur.i}/${cur.steps.length}`, "днес") : ring(0, `${mins}`, "минути");
  const pl=(ic,grad,txt)=>h("div",null, h("i",{class:"g-"+grad}, icon(ic)), txt);
  app.append(h("div",{class:"stack",style:"gap:22px"},
    h("div",{class:"homehead"},
      h("span",{class:"avatar","aria-hidden":"true"}, (viewerName||"Ш").charAt(0).toUpperCase()),
      h("div",{class:"stack",style:"gap:2px"}, h("span",{class:"eyebrow"}, new Date().toLocaleDateString("bg-BG",{weekday:"long", day:"numeric", month:"long"})), h("h1",null, greeting()+(viewerName?", "+viewerName:"")+"!")),
      h("div",{class:"hstats"},
        hstat("flame", st, plural(st,"ден подред","дни подред")),
        hstat("bolt", Math.round(S.puz.rating), "рейтинг"),
        h("button",{class:"hstat",onclick:()=>go("progress"),"aria-label":`Ниво ${L.name}`}, fi("medal"), h("div",null, h("b",null,L.name), h("div",{class:"bar"},h("i",{style:`width:${L.pct}%`})), h("small",null, L.to?`${S.xp} / ${L.to} т.`:`${S.xp} т.`))),
        h("button",{class:"iconbtn gear","aria-label":"Настройки",onclick:()=>go("prefs")}, icon("gear")))),
    installCard(),
    h("div",{class:"homegrid"},
      h("div",{class:"homecol"},
      h("div",{class:"hero"},
        h("div",{class:"stack",style:"gap:12px"},
          h("span",{class:"eyebrow",style:"color:#b2de7e"}, cur ? "Започната тренировка" : done ? "Днешната тренировка е готова" : "Тренировка за днес"),
          h("h2",null, cur ? "Продължи оттам, където спря." : done ? "Браво! Днес си свършил своето." : "Подготвих ти тренировка според слабите ти места."),
          done && !cur ? h("p",{class:"muted"},"Можеш да минеш урок, да изиграеш партия или да направиш още една тренировка.") : h("div",{class:"plan"},
            nFix ? pl("wrench","red",`${nFix} ${plural(nFix,"грешка","грешки")} от твоите партии`) : null,
            nLine ? pl("book","blue",`${nLine} ${plural(nLine,"дебютна линия","дебютни линии")} за повторение`) : null,
            nPuz ? pl("puzzle","orange",`${nPuz} ${plural(nPuz,"пъзел","пъзела")}, с акцент върху „${THEME_BG[themePlan()[0].t]}“`) : null),
          h("div",{class:"row",style:"margin-top:6px"},
            h("button",{class:"btn primary big",onclick:()=>go("session")}, icon("play"), cur ? "Продължи" : done ? "Още една тренировка" : "Започни тренировката"))),
        ringEl),
    h("div",{class:"qtiles two"},
      nl ? qtile("cap","blue", nl.why ? "Урок за теб" : "Следващ урок", nl.l.title, ()=>go("lesson--"+nl.l.id)) : qtile("cap","blue","Уроци","Всички са минати",()=>go("learn")),
      qtile("puzzle","orange","Пъзели за теб",`Рейтинг ${Math.round(S.puz.rating)}`,()=>go("puzzle--mix")),
      qtile("knight","green","Игра с треньор", S.rep ? "Ботът играе репертоара ти" : "Треньорът е до теб",()=>go("play")),
      qtile("trophy","purple","Доиграй до победа",`${egDone} от ${ENDGAMES.length} позиции`,()=>go("endgames")))),
      dailyCard()),
    h("div",{class:"gridc"},
      c.weak.length ? h("div",{class:"card stack"},
        h("div",{class:"section-head"}, h("h2",null, tico("brain","red","sm"), "Треньорът забеляза")),
        h("div",{class:"stack",style:"gap:6px"}, h("h3",null,c.weak[0].t), h("p",{class:"muted small"},c.weak[0].src+". "+c.weak[0].fix)),
        h("div",{class:"row"}, h("button",{class:"btn sm primary",onclick:()=>go("lesson--"+c.weak[0].lesson)},"Урок: "+LESSON_BY_ID[c.weak[0].lesson].title), h("button",{class:"btn sm",onclick:()=>go("progress")},"Всички навици")))
      : h("div",{class:"card stack"},
        h("div",{class:"section-head"}, h("h2",null, tico("knight","green","sm"), "Нека те опозная")),
        h("p",{class:"muted small"},"След всяка партия анализирам ходовете ти, намирам повтарящите се грешки и нагласям уроците и пъзелите."),
        h("button",{class:"btn sm primary",style:"align-self:flex-start",onclick:()=>go("play")},"Играй партия")),
      repCard(),
      h("div",{class:"card stack"},
        h("div",{class:"section-head"}, h("h2",null, tico("flame","orange","sm"), "Тази седмица"), h("span",{class:"chip gold"}, `${st} ${plural(st,"ден","дни")}`)),
        weekStrip(),
        h("p",{class:"muted small"}, st ? "Не прекъсвай серията: дори 10 минути на ден правят разлика." : "Започни серия днес: една тренировка е достатъчна.")))));
}
function repCard(){
  const head=h("div",{class:"section-head"}, h("h2",null, tico("crown","gold","sm"), "Твоят репертоар"));
  if (!S.rep) return h("div",{class:"card stack"}, head,
    h("p",{class:"muted small"},"Избери един дебют с белите. С черните играеш Каро-Кан и Отказан дамски гамбит. Ботът ги играе с теб, а аз следя дали ги спазваш."),
    h("button",{class:"btn sm primary",style:"align-self:flex-start",onclick:()=>go("learn")},"Избери репертоар"));
  const ids=repLines(); const learned=ids.filter(id=>S.lines[id]&&((S.lines[id].box||0)>=1)).length; const nx=nextRepLine(); const due=dueLines().filter(id=>ids.includes(id)).length;
  head.append(h("span",{class:"chip"},`${learned}/${ids.length}`));
  return h("div",{class:"card stack"}, head,
    h("h3",null, REP_W[S.rep.w].name.split(" · ")[1]+", Каро-Кан, Отказан дамски гамбит"),
    h("div",{class:"bar"},h("i",{style:`width:${ids.length?learned/ids.length*100:0}%`})),
    h("div",{class:"row"},
      nx ? h("button",{class:"btn sm primary",onclick:()=>go("study--"+nx)},"Научи: "+findLine(nx).line.name) : due ? h("button",{class:"btn sm primary",onclick:()=>go("review")},`Повтори (${due})`) : null,
      h("button",{class:"btn sm",onclick:()=>go("play")},"Играй го")));
}
// only in the phone-app build (pwa.js defines window.PWA); hidden once installed or dismissed
function installCard(){
  if (!window.PWA || PWA.standalone || S.set.hideInstall) return null;
  const how = PWA.prompt ? h("button",{class:"btn primary sm",style:"align-self:flex-start",onclick:()=>PWA.install()},"Инсталирай")
    : h("p",{class:"muted small"}, PWA.isIOS ? "В Safari натисни „Сподели“ (квадратчето със стрелка), после „Добави към началния екран“." : "В менюто на браузъра избери „Инсталирай приложението“ или „Добави към началния екран“.");
  return h("div",{class:"card row",style:"flex-wrap:nowrap;align-items:flex-start"}, tico("knight","green"),
    h("div",{class:"stack grow",style:"gap:4px"}, h("h3",null,"Инсталирай като приложение"), h("p",{class:"muted small"},"Иконка на началния екран, цял екран и работа без интернет."), how),
    h("button",{class:"btn ghost sm",onclick:()=>{ S.set.hideInstall=true; save(); route(); }},"Скрий"));
}
function onboarding(){
  const skip=()=>{ S.onb={lvl:"new", at:Date.now()}; if (S.puz.n===0) S.puz.rating=700; save(); route(); };
  return h("div",{class:"result",style:"margin-top:40px"},
    resultArt("knight","green"),
    h("span",{class:"eyebrow"},"Добре дошъл в Chess Master"),
    h("div",{class:"big",style:"font-size:2.2rem"},"Да започнем от правилното място"),
    h("p",{class:"muted",style:"max-width:48ch"},"Реши 5 кратки пъзела, за да определя нивото ти. После уроците и тренировките се нагласят сами според резултатите и партиите ти."),
    h("div",{class:"row",style:"justify-content:center"},
      h("button",{class:"btn primary big",onclick:()=>go("start")}, icon("play"), "Направи теста"),
      h("button",{class:"btn big",onclick:skip},"Започни от нулата")));
}

/* ============ learn: path + opening courses ============ */
const UNIT_STYLE = {u1:["shield","red"], u2:["book","blue"], u3:["bolt","orange"], u4:["crown","purple"], u5:["flag","teal"]};
function lessonDot(id, isNext, n){ const d=lessonDone(id); const el=h("span",{class:"ldot"+(d?" done":isNext?" next":"")}); if (d) el.append(icon("check")); else el.textContent=n; return el; }
function vLearn(app){
  const nl=nextLesson(); const nid=nl&&nl.l.id; const dn=lessonsDoneCount(); let n=0;
  app.append(h("div",{class:"stack",style:"gap:24px;max-width:880px"},
    h("div",{class:"homehead"}, tico("cap","blue"), h("div",{class:"stack",style:"gap:4px"}, h("h1",null,"Уроци"), h("span",{class:"muted"},"Кратки уроци, в които правиш, а не четеш.")),
      h("div",{class:"hstats"}, hstat("book", `${dn}/${LESSONS.length}`, "минати урока"))),
    nl ? h("div",{class:"hero"},
      h("div",{class:"stack",style:"gap:10px"},
        h("span",{class:"eyebrow",style:"color:#b2de7e"}, nl.why ? "Треньорът препоръчва" : "Продължи пътя"),
        h("h2",null, nl.l.title), h("p",{class:"muted"}, nl.why ? `Защото: ${nl.why.t.toLowerCase()}.` : nl.l.sub),
        h("div",{class:"row"}, h("button",{class:"btn primary big",onclick:()=>go("lesson--"+nl.l.id)}, icon("play"), "Започни урока"))),
      ring(dn/LESSONS.length*100, `${dn}/${LESSONS.length}`, "урока")) : null,
    UNITS.map((u,ui)=>{ const ls=LESSONS.filter(l=>l.unit===u.id); const k=ls.filter(l=>lessonDone(l.id)).length; const [ic,gr]=UNIT_STYLE[u.id]||["book","green"];
      return h("div",{class:"card unitcard"},
        h("div",{class:"unit-top"}, tico(ic,gr), h("div",{class:"grow"}, h("span",{class:"eyebrow"},`Част ${ui+1}`), h("h2",null,u.name), h("span",{class:"muted small"},u.sub)), h("span",{class:"chip "+(k===ls.length?"good":"")}, `${k}/${ls.length}`)),
        h("div",{class:"unit-list"}, ls.map(l=>{ n++; const st=S.les[l.id]; return h("button",{class:"lrow"+(l.id===nid?" next":""),onclick:()=>go("lesson--"+l.id)},
          lessonDot(l.id, l.id===nid, n),
          h("div",{class:"grow"}, h("div",{class:"t"},l.title), h("div",{class:"s"},l.sub)),
          st&&st.done ? starsEl(st.stars||1) : l.id===nid ? h("span",{class:"btn sm primary",style:"pointer-events:none"},"Започни") : h("svg",{class:"chev",html:'<path d="M9 5l7 7-7 7"/>',viewBox:"0 0 24 24"})); }))); }),
    repChooser(),
    h("div",{class:"section"},
      h("div",{class:"section-head"}, h("h2",null, tico("book","green","sm"), "Дебютни курсове"), h("span",{class:"muted small"},"Научи линии и ги упражнявай по памет")),
      h("div",{class:"ccards"}, allCourses().map(c=>{ const p=courseProgress(c); const nl_=c.chapters.reduce((a,ch)=>a+ch.lines.length,0); const k=c.icon||COURSE_ICON[c.id]||"crown";
        const cover=h("div",{class:"ccover ci-"+k}); cover.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true">'+COURSE_ART[k]+'</svg>';
        return h("button",{class:"card ccard click",onclick:()=>go("course--"+c.id)}, cover,
          h("div",{class:"cbody"}, h("strong",null,c.name), h("span",{class:"side-pill"},h("span",{class:"pawn-dot "+c.side}), sideLabel(c)+` · ${nl_} линии`), h("div",{class:"bar"},h("i",{style:`width:${p.pct}%`})), h("span",{class:"muted small"},`${p.k} от ${p.n} усвоени`))); })))));
}
function repChooser(){
  const pcs={d4:"wP", e4:"wN"};
  return h("div",{class:"card stack"},
    h("div",{class:"section-head"}, h("h2",null, tico("crown","gold","sm"), S.rep ? "Твоят репертоар" : "Избери репертоар")),
    h("p",{class:"muted small",style:"max-width:62ch"},"Малко дебюти, научени добре, носят повече от много дебюти наполовина. Тренировката повтаря първо тях, ботът ги играе с теб, а след всяка партия проверявам къде си излязъл от линиите."),
    h("div",{class:"reptiles"},
      Object.entries(REP_W).map(([k,v])=>h("button",{class:"reptile","aria-pressed":String(!!S.rep&&S.rep.w===k),onclick:()=>{ S.rep={w:k}; save(); toast("Репертоарът е запазен"); route(); }},
        h("i",{class:"pc "+pcs[k]}), h("div",null, h("b",null,"С белите: "+v.name.split(" · ")[0]), h("small",null,v.name.split(" · ")[1])))),
      h("div",{class:"reptile",style:"cursor:default"}, h("i",{class:"pc bK"}), h("div",null, h("b",null,"С черните"), h("small",null,"Каро-Кан срещу 1.e4, Отказан дамски гамбит срещу 1.d4")))),
    S.rep && nextRepLine() ? h("button",{class:"btn primary",style:"align-self:flex-start",onclick:()=>go("study--"+nextRepLine())},"Научи следващата линия: "+findLine(nextRepLine()).line.name) : null);
}

const COURSE_ART = {
  bulb:'<path d="M24 6a12.5 12.5 0 00-7.5 22.5V33h15v-4.5A12.5 12.5 0 0024 6z" fill="#fff"/><rect x="17.5" y="35" width="13" height="3.4" rx="1.6" fill="#fff"/><rect x="20" y="40" width="8" height="3" rx="1.5" fill="#fff"/>',
  tower:'<path d="M24 3l6.5 11h-13z" fill="#fff"/><rect x="17.5" y="14" width="13" height="27" rx="1" fill="#fff"/><circle cx="24" cy="21.5" r="4" fill="rgba(0,0,0,.2)"/><rect x="13" y="41" width="22" height="3.2" rx="1.2" fill="#fff"/>',
  wheel:'<circle cx="24" cy="21" r="13" fill="none" stroke="#fff" stroke-width="3"/><g stroke="#fff" stroke-width="2"><path d="M24 8v26M11 21h26M14.8 11.8l18.4 18.4M33.2 11.8L14.8 30.2"/></g><circle cx="24" cy="21" r="3.6" fill="#fff"/><path d="M17 44l7-10 7 10z" fill="#fff"/>',
  sword:'<path d="M35 5h8v8L24.5 31.5l-8-8z" fill="#fff"/><path d="M12 24.5l11.5 11.5-3 3L9 27.5z" fill="#fff"/><path d="M13.5 34.5l3 3-7 7-3-3z" fill="#fff"/>',
  shield:'<path d="M24 4.5l15.5 5.5v11.5c0 10-6.6 17.4-15.5 22.5C15.1 38.9 8.5 31.5 8.5 21.5V10z" fill="#fff"/><path d="M24 9v29.5M13 20.5h22" stroke="rgba(0,0,0,.18)" stroke-width="2.2"/>',
  crown:'<path d="M7 17l9.5 8L24 12l7.5 13 9.5-8-4.2 20.5H11.2z" fill="#fff"/><rect x="11" y="39" width="26" height="4" rx="1.6" fill="#fff"/>',
};
const COURSE_ICON = {basics:"bulb", london:"tower", vienna:"wheel", e4:"sword", caro:"shield", qgd:"crown"};
function courseIcon(c, size){ const k=c.icon||COURSE_ICON[c.id]||"crown"; const el=h("span",{class:"cicon ci-"+k+(size?" "+size:""),"aria-hidden":"true"}); el.innerHTML='<svg viewBox="0 0 48 48">'+COURSE_ART[k]+'</svg>'; return el; }
function sideLabel(c){ return c.side==="w"?"С белите":c.side==="b"?"С черните":"За всички"; }
function lineAction(id){ const st=S.lines[id]; return (st && (st.seen || st.box)) ? "drill--"+id : "study--"+id; }
function vCourse(app, id){
  const c=allCourses().find(x=>x.id===id); if (!c){ go("learn"); return; }
  const p=courseProgress(c); const ids=c.chapters.flatMap(ch=>ch.lines.map(l=>l.id));
  app.append(topbar(c.name,"learn"), h("div",{class:"stack",style:"gap:22px;max-width:820px;margin:0 auto"},
    h("div",{class:"row",style:"gap:20px;align-items:flex-start"}, courseIcon(c,"xl"),
      h("div",{class:"stack grow",style:"gap:8px;min-width:220px"},
        h("span",{class:"eyebrow"}, sideLabel(c)+" · "+c.level), h("h1",null,c.name), h("p",{class:"muted",style:"max-width:60ch"},c.desc),
        h("div",{class:"row",style:"gap:10px"}, h("div",{class:"bar",style:"flex:1;max-width:320px"},h("i",{style:`width:${p.pct}%`})), h("span",{class:"muted small"},`${p.k} от ${p.n} усвоени`)),
        h("div",{class:"row",style:"margin-top:6px"},
          h("button",{class:"btn primary",onclick:()=>{ REVIEW_IDS=orderLines(ids); go("review"); }},"Упражни целия курс"),
          c.side!=="both" ? h("button",{class:"btn",onclick:()=>go("play--"+c.id)},"Играй дебюта срещу бот") : null))),
    c.chapters.map((ch,ci)=>h("div",{class:"card stack",style:"gap:4px"},
      h("div",{class:"row",style:"justify-content:space-between;padding-bottom:6px"}, h("h3",null,`${ci+1}. ${ch.name}`)),
      h("div",{class:"list"}, ch.lines.map(l=>{ const s=lineStatus(l.id); const chip={new:"",learn:"warn",rev:"",done:"good",due:"bad"}[s.k];
        return h("div",{class:"li",style:"flex-wrap:nowrap"},
          h("div",{class:"grow"}, h("div",{style:"font-weight:600;color:var(--ink)"},l.name), h("span",{class:"chip "+chip,style:"margin-top:4px"},s.t)),
          h("button",{class:"btn sm ghost hide-sm",onclick:()=>go("study--"+l.id)},"Обяснения"),
          h("button",{class:"btn sm primary",onclick:()=>go(lineAction(l.id))}, s.k==="new" ? "Учи" : "Упражни")); }))))));
}
function vStudy(app, id){
  const f=findLine(id); if (!f){ go("learn"); return; }
  app.append(topbar(f.line.name, "course--"+f.course.id));
  const host=h("div"); app.append(host); mountStudy(host, id, {onDone:()=>go("drill--"+id)});
}
function vDrill(app, id){
  const f=findLine(id); if (!f){ go("learn"); return; }
  app.append(topbar(f.line.name, "course--"+f.course.id));
  const host=h("div"); app.append(host);
  mountDrill(host, id, {quiz:true, nextLabel:"Към курса", onNext:()=>go("course--"+f.course.id),
    extraButtons:[h("div",{class:"row"}, h("button",{class:"btn",onclick:()=>go("drill--"+id)},"Повтори"), h("button",{class:"btn ghost",onclick:()=>go("study--"+id)},"Обясненията"))]});
}
// due first, then new, then the rest
function orderLines(ids){ const now=Date.now(); return ids.map(id=>{ const st=lineStat(id); const p=!st||!st.box?1:(st.due<=now?0:2+(st.box||0)); return {id,p:p+Math.random()*.9}; }).sort((a,b)=>a.p-b.p).map(x=>x.id); }
let REVIEW_IDS=null;
function vReview(app){
  const ids = REVIEW_IDS || dueLines(); REVIEW_IDS=null;
  if (!ids.length){ app.append(topbar("Дебюти","train"), h("div",{class:"card empty",style:"max-width:560px;margin:30px auto"}, h("h2",null,"Няма линии за повторение"), h("p",null,"Научи линия от курсовете и тя ще се връща тук навреме."), h("div",{class:"row",style:"justify-content:center;margin-top:12px"}, h("button",{class:"btn primary",onclick:()=>go("learn")},"Към курсовете")))); return; }
  runSeq(app, {back:"train", label:"Дебюти", steps:ids.slice(0,12),
    render:(id, host, next)=>mountDrill(host, id, {onNext:next}),
    finish:(res, host)=>summary(host, "Дебютите са повторени", res.map(r=>({t:findLine(r.step).line.name, ok:r.res===0, note:r.res?`${r.res} ${plural(r.res,"грешка","грешки")}`:"Чисто"})), [h("button",{class:"btn primary big",onclick:()=>go("home")},"Към началото")])});
}

/* ============ lesson: short, hands-on, adapted to what you already know ============ */
function vLesson(app, arg){
  const [id, modeArg]=String(arg||"").split("--"); const L=LESSON_BY_ID[id]; if (!L){ go("learn"); return; }
  const th=L.practice.puz; const ms = th ? mastery(th) : {m:null,n:0};
  const known = modeArg!=="full" && th && ms.m!=null && ms.n>=5 && ms.m>=.8;
  const repeat = !!(S.les[id] && S.les[id].done);
  const steps=[];
  if (known) steps.push({k:"known"});
  else {
    L.cards.forEach(c=>{ if (!c.fen && repeat) return; steps.push({k:"card", c}); });
    if (th && !repeat && (ms.m==null || ms.m<.6)) steps.push({k:"example"});
  }
  steps.push(th ? {k:"practice"} : {k:"line"});
  if (!repeat && !known) (L.quiz||[]).slice(0,1).forEach(q=>steps.push({k:"quiz", q}));
  let pr=null, lineMistakes=null;
  const render=(st, host, next)=>{
    if (st.k==="known"){ host.append(h("div",{class:"textstep"}, h("span",{class:"eyebrow"},L.title),
      h("div",{class:"card stack",style:"gap:12px"}, h("h1",null,"Тази тема ти се отдава"), h("p",{class:"comment"},`Решаваш около ${Math.round(ms.m*100)}% от пъзелите с „${THEME_BG[th]}“. Няма нужда да четеш отново. Направи кратка проверка с 3 по-трудни пъзела.`)),
      h("button",{class:"btn primary big block",onclick:()=>next()},"Към проверката", icon("arrow")),
      h("button",{class:"btn ghost",onclick:()=>go("lesson--"+id+"--full")},"Искам целия урок"))); return; }
    if (st.k==="card") return lessonCard(host, L, st.c, next);
    if (st.k==="example") return lessonExample(host, L, next);
    if (st.k==="quiz"){ const box=h("div",{class:"textstep"}); const nb=h("button",{class:"btn primary big block",disabled:true,onclick:()=>next()},"Напред"); box.append(h("span",{class:"eyebrow"},L.title+" · проверка"), quizCard(st.q,()=>{ nb.disabled=false; }), nb); host.append(box); return; }
    if (st.k==="line"){ host.append(h("p",{class:"muted",style:"margin:0 0 12px"},"Сега изиграй линията по памет. Противникът отговаря сам.")); return mountDrill(host, L.practice.line, {label:"Упражнение", onResult:m=>{ lineMistakes=m; }, onNext:()=>next()}); }
    if (st.k==="practice") return lessonPractice(host, L, known, r=>{ pr=r; next(); });
  };
  runSeq(app, {back:"learn", label:L.title, steps, render, finish:(res, host)=>{
    let pass, stars, line1;
    if (th){ const r=pr||{c:0,n:0,pass:false}; pass=r.pass; stars = !pass ? 0 : r.n<=3 ? 3 : r.n===4 ? 2 : 1; line1 = pass ? `${r.n} ${plural(r.n,"пъзел","пъзела")} до 3 верни` : `${r.c%1?r.c.toFixed(1):r.c} верни от ${r.n}`; }
    else { const m=lineMistakes??9; pass = m<=1; stars = m===0 ? 3 : m===1 ? 2 : 0; line1 = m===0 ? "Линията е изиграна без грешка" : `${m} ${plural(m,"грешка","грешки")} в линията`; }
    const prev=S.les[id]||{}; const wasDone=!!prev.done;
    S.les[id] = Object.assign(prev, {last:Date.now(), tries:(prev.tries||0)+1, best:Math.max(prev.best||0, stars)});
    if (pass){ S.les[id].done=true; S.les[id].stars=Math.max(prev.stars||0, stars); if (!prev.due){ S.les[id].box=1; S.les[id].due=Date.now()+DAY-3600e3; } }
    markDay(); save(); Sound.play(pass?"win":"bad"); if (pass){ confetti(); award(wasDone ? 15 : 50+stars*10); }
    const nl=nextLesson();
    host.append(h("div",{class:"result"},
      h("span",{class:"eyebrow"},L.title),
      resultArt(pass?"trophy":"target", pass?"gold":"blue"),
      pass ? starsEl(stars) : null,
      h("div",{class:"big"}, pass ? (known ? "Потвърдено" : "Урокът е минат") : "Почти"),
      h("p",{class:"muted"}, line1 + (pass ? ". Темата ще се връща в тренировката, само ако започнеш да грешиш в нея." : ". Реши 3 верни, за да минеш. Тренировката за деня ще ти дава още пъзели с тази тема.")),
      h("div",{class:"row",style:"justify-content:center"},
        pass && nl ? h("button",{class:"btn primary big",onclick:()=>go("lesson--"+nl.l.id)},"Следващ урок: "+nl.l.title) : null,
        !pass ? h("button",{class:"btn primary big",onclick:()=>go("lesson--"+id)},"Опитай пак") : null,
        h("button",{class:"btn big",onclick:()=>go("learn")},"Към уроците"))));
  }});
}
// practice until you show it: 3 correct ends it, 3 misses (or no way to reach 3) ends it
function lessonPractice(host, L, known, done){
  let c=0, w=0, n=0; const avoid=new Set(); const need=3, maxN=known?4:5;
  const dots=h("div",{class:"pdots"});
  host.append(h("div",{class:"row",style:"justify-content:space-between;margin-bottom:10px"}, h("span",{class:"muted small"}, known?"Проверка: 3 верни":"Реши 3 верни, за да минеш"), dots));
  const slot=h("div"); host.append(slot);
  const base = themeTarget(L.practice.puz) + (known?150:0) + (L.practice.up||0);
  const nextP=()=>{
    slot.innerHTML=""; window.scrollTo(0,0);
    if (c>=need || w>=3 || n>=maxN || need-c > maxN-n){ done({c, n, pass:c>=need}); return; }
    loadPuzzles().then(()=>{
      const pz=pickPuzzle(L.practice.puz,{target:base+n*50, avoid}) || pickPuzzle("mix",{avoid}); avoid.add(pz[0]); n++;
      mountPuzzle(slot, pz, {label:`${THEME_BG[L.theme]} · пъзел ${n}`, rated:false, track:true, inLesson:true, think:!known,
        onResult:s=>{ if (s===1) c++; else if (s===.5) c+=.5; else w++; dots.append(h("i",{class:s===1?"ok":s?"cur":"bad"})); },
        onNext:nextP, nextLabel:"Напред"});
    }).catch(()=>{ slot.append(h("div",{class:"status bad"},"Пъзелите не се заредиха.")); slot.append(h("button",{class:"btn",onclick:()=>done({c,n,pass:false})},"Продължи")); });
  };
  nextP();
}
// a position card: first you find the move, then you read why
function lessonCard(host, L, c, next){
  const nb=h("button",{class:"btn primary big block",onclick:()=>next()},"Напред", icon("arrow"));
  if (!c.fen){ host.append(h("div",{class:"textstep"}, h("span",{class:"eyebrow"},L.title), h("div",{class:"card stack",style:"gap:14px"}, h("h1",null,c.h), c.p.map(t=>h("p",{class:"comment",html:t}))), nb)); return; }
  const game=new Chess(c.fen); const uc=game.turn(); const bel=h("div"); const board=new Board(bel,{orientation:c.orient||uc});
  const col=a=>({g:"rgba(30,140,85,.9)",r:"rgba(214,64,45,.9)",y:"rgba(225,160,20,.9)"}[a[2]||"g"]);
  const draw=(all)=>{ board.arrows((c.arrows||[]).filter(a=>all||a[2]!=="g").map(a=>({from:a[0],to:a[1],color:col(a)}))); board.mark(all?(c.marks||[]):[]); };
  board.setCheck(game.in_check()); board.setFen(c.fen,null);
  const first=h("p",{class:"comment",html:c.p[0]});
  const rest=h("div",{class:"stack",style:"gap:10px",hidden:!!c.move}, c.p.slice(1).map(t=>h("p",{class:"comment",html:t})));
  if (!c.move){ draw(true); host.append(trainLayout([bel],[h("div",{class:"pcard"}, h("span",{class:"eyebrow"},L.title), h("h2",null,c.h), first, rest, nb)])); return; }
  draw(false); nb.hidden=true;
  const exp=new Chess(c.fen).move(c.move); let tries=0, solved=false;
  const status=h("div",{class:"status"},`${sideName2(uc)} са на ход. Намери най-силния ход.`);
  const showBtn=h("button",{class:"btn ghost sm",style:"align-self:flex-start",onclick:()=>reveal(false)},"Покажи ми");
  function reveal(ok){
    if (solved) return; solved=true; board.o.movable=null; showBtn.remove();
    const g2=new Chess(c.fen); const m=g2.move(c.move); board.setCheck(g2.in_check()); board.setFen(g2.fen(),{from:m.from,to:m.to},{anim:true}); boardMark(board, m.to, ok);
    setTimeout(()=>{ if (host.isConnected) draw(true); }, 450);
    setStatus(status, ok?"good":"info", ok ? (tries? `Да, ${c.move}.` : `Точно така: ${c.move}!`) : `Ходът е ${c.move}.`);
    rest.hidden=false; nb.hidden=false; if (ok) Sound.play("good");
  }
  playable(board, game, uc, mv=>{
    if (solved) return;
    if (mv.from===exp.from && mv.to===exp.to) return reveal(true);
    tries++; board.flashBad(mv.to); Sound.play("bad");
    if (tries===1) setStatus(status,"bad","Не е този. Огледай пак: шахове, взимания, заплахи.");
    else { board.mark([exp.from]); setStatus(status,"warn","Подсказка: ходът е с фигурата на маркираното поле."); }
  });
  host.append(trainLayout([bel],[h("div",{class:"pcard"}, h("span",{class:"eyebrow"},L.title), h("h2",null,c.h), first, status, showBtn, rest, nb)]));
}
function lessonExample(host, L, next){
  const load=h("p",{class:"muted"},"Зареждам пример..."); host.append(load);
  loadPuzzles().then(()=>{
    load.remove(); const ti=PZ.themes.indexOf(L.practice.puz);
    const pool=PZ.p.filter(p=>p[4].includes(ti) && p[2].split(" ").length<=4).sort((a,b)=>a[3]-b[3]);
    const pz=pool[Math.floor(Math.random()*Math.min(6,pool.length))]; if (!pz){ next(); return; }
    const [pid,fen,ms]=pz; const sol=ms.split(" "); const g=new Chess(fen); const uc=g.turn()==="w"?"b":"w";
    const bel=h("div"); const board=new Board(bel,{orientation:uc}); board.setFen(fen,null);
    const cap=h("div",{class:"comment"},`Пример от реална партия. ${sideName2(uc)} са на ход, след като противникът изиграе своя ход.`);
    let running=false;
    const play=h("button",{class:"btn",onclick:async()=>{
      if (running) return; running=true; play.disabled=true; const gg=new Chess(fen); board.setCheck(false); board.setFen(fen,null); board.arrows([]);
      for (let i=0;i<sol.length;i++){
        await sleep(i?1100:500); if (!host.isConnected) return; const u=sol[i]; const m=gg.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
        board.setCheck(gg.in_check()); board.setFen(gg.fen(),{from:m.from,to:m.to},{anim:true});
        cap.textContent = i===0 ? `Противникът изигра ${m.san}. Сега удар: ` : (cap.textContent.endsWith(": ")? cap.textContent : cap.textContent+" ") + (i%2 ? m.san : `(отговор ${m.san})`);
      }
      cap.textContent = `Решението: ${sanLine(new Chess(fen).fen(), pvToSan(fen, sol, 10))}. Това е „${THEME_BG[L.theme]}“ на практика. Сега е твой ред.`;
      running=false; play.disabled=false; play.textContent="Пусни пак";
    }}, icon("play"), "Пусни примера");
    host.append(trainLayout([bel],[h("div",{class:"pcard"}, h("span",{class:"eyebrow"},L.title+" · пример"), h("h2",null,"Виж го в партия"), cap, h("div",{class:"actions"},play), h("button",{class:"btn primary big block",onclick:()=>next()},"Към упражнението", icon("arrow")))]));
    setTimeout(()=>{ if (host.isConnected) play.click(); }, 400);
  }).catch(()=>next());
}

/* ============ today's session ============ */
function vSession(app){
  let cur=curSession(); if (!cur){ S.cur={d:today(), steps:buildSession(), i:0, results:[], r0:S.puz.rating}; save(); cur=S.cur; }
  const steps=cur.steps; const avoid=new Set(); const r0=cur.r0;
  runSeq(app, {back:"home", label:"Тренировка", steps, start:cur.i, results:cur.results.slice(), onStep:(i,results)=>{ cur.i=i; cur.results=results.slice(); save(); }, render:(st, host, next)=>{
    if (st.k==="fix"){ const card=(S.mist||[]).find(x=>x.id===st.id); if (!card) return next(null); return mountFix(host, card, {label:"Грешка от твоя партия", onResult:s=>{ st.ok=s; }, onNext:()=>next(st.ok)}); }
    if (st.k==="line") return mountDrill(host, st.id, {label:"Повторение на дебют", onResult:m=>{ st.ok=m===0?1:0; }, onNext:()=>next(st.ok)});
    const load=h("p",{class:"muted"},"Зареждам..."); host.append(load);
    loadPuzzles().then(()=>{ load.remove();
      const pz=(st.pid && puzzleById(st.pid)) || pickPuzzle(st.theme||"mix",{avoid, target: st.theme && st.theme!=="mix" ? themeTarget(st.theme) : S.puz.rating}) || pickPuzzle("mix",{avoid}); avoid.add(pz[0]);
      mountPuzzle(host, pz, {label: st.why + (st.theme && st.theme!=="mix" ? " · "+(THEME_BG[st.theme]||"") : ""), showTheme: !!st.theme && st.theme!=="mix", onResult:s=>{ st.ok=s; if (st.lesson) reviewLesson(st.lesson, s===1); }, onNext:()=>next(st.ok)});
    }).catch(()=>{ load.textContent="Пъзелите не се заредиха."; host.append(h("button",{class:"btn",onclick:()=>next(null)},"Пропусни")); });
  }, finish:(res, host)=>{
    S.sessions[today()]=(S.sessions[today()]||0)+1; const ks=Object.keys(S.sessions).sort(); while (ks.length>60) delete S.sessions[ks.shift()];
    delete S.cur; S.cnt.sess=(S.cnt.sess||0)+1; markDay(); save(); Sound.play("win"); confetti(); award(30);
    const ok=res.filter(r=>r.res===1).length, n=res.filter(r=>r.res!=null).length; const d=Math.round(S.puz.rating-r0); const nl=nextLesson();
    const rows=res.map(r=>{ const s=r.step; const t = s.k==="fix" ? "Грешка от партия" : s.k==="line" ? (findLine(s.id)||{line:{name:"Линия"}}).line.name : (s.theme==="mix"?"Смесен пъзел":THEME_BG[s.theme]); return {t, ok:r.res===1, note:r.res===1?"Вярно":r.res===.5?"С подсказка":r.res==null?"Пропуснато":"Грешно"}; });
    summary(host, "Тренировката е готова", rows, [
      nl ? h("button",{class:"btn primary big",onclick:()=>go("lesson--"+nl.l.id)},"Следващ урок: "+nl.l.title) : null,
      h("button",{class:"btn big",onclick:()=>go("play")},"Изиграй партия"),
      h("button",{class:"btn big ghost",onclick:()=>go("home")},"Към началото")],
      `${ok} от ${n} верни · рейтинг ${Math.round(S.puz.rating)} (${d>=0?"+":""}${d}) · серия ${streak()} ${plural(streak(),"ден","дни")}`);
  }});
}
function summary(host, title, rows, buttons, sub, art){
  const ok=rows.filter(r=>r.ok).length;
  host.append(h("div",{class:"result"},
    resultArt(art||(ok>=rows.length*.7?"trophy":"target"), ok>=rows.length*.7?"gold":"blue"),
    h("div",{class:"big"},title), sub ? h("p",{class:"muted"},sub) : null,
    h("div",{class:"card list"}, rows.map(r=>h("div",{class:"li"}, h("span",{class:"grow",style:"font-weight:600;color:var(--ink)"},r.t), h("span",{class:"chip "+(r.ok?"good":"bad")},r.note)))),
    h("div",{class:"row",style:"justify-content:center"}, buttons)));
}

/* ============ train hub ============ */
function tile2(ic, grad, title, sub, onclick, stat, statLabel){
  const ch=document.createElementNS("http://www.w3.org/2000/svg","svg"); ch.setAttribute("viewBox","0 0 24 24"); ch.setAttribute("class","chev"); ch.innerHTML='<path d="M9 5l7 7-7 7"/>';
  return h("button",{class:"tile2",onclick}, tico(ic,grad), h("div",{class:"grow"}, h("strong",null,title), h("small",null,sub)), stat!=null ? h("div",{class:"tstat"}, h("b",null,stat), h("small",{class:"muted"},statLabel||"")) : null, ch);
}
function vTrain(app){
  const md=mistDue().length, ld=dueLines().length, all=(S.mist||[]).length;
  const failed=Object.values(S.puz.hist).filter(v=>v[0]===0).length; const egDone=ENDGAMES.filter(e=>S.eg[e.id]&&S.eg[e.id].done).length;
  const themesBox=h("div",{class:"stack"}, h("p",{class:"muted"},"Зареждам темите..."));
  const dres = S.daily && S.daily.d===today() ? S.daily.res : null;
  app.append(h("div",{class:"stack",style:"gap:26px"},
    h("div",{class:"homehead"}, tico("puzzle","orange"), h("div",{class:"stack",style:"gap:4px"}, h("h1",null,"Тренировка"), h("span",{class:"muted"},"Избери какво да упражняваш. Най-лесно е тренировката за деня.")),
      h("div",{class:"hstats"}, h("button",{class:"btn primary",onclick:()=>go("session")}, icon("play"), "Тренировка за днес"))),
    h("div",{class:"section"}, h("div",{class:"section-head"}, h("h2",null, tico("puzzle","orange","sm"), "Пъзели")), h("div",{class:"tiles"},
      tile2("target","green","Пъзели за теб","Подбрани според слабите ти теми", ()=>go("puzzle--mix"), Math.round(S.puz.rating), "рейтинг"),
      tile2("calendar","orange","Пъзел на деня", dres===1?"Решен днес. Браво!":"Един пъзел, нов всеки ден", ()=>go("daily"), dres===1?"✓":dres!=null?"✗":"-", "днес"),
      tile2("flame","red","Пъзел серия","Докато сгрешиш, все по-трудни", ()=>go("pstreak"), S.pstreak.best||0, "рекорд"),
      tile2("timer","gold","Пъзел щурм","3 минути, колкото можеш", ()=>go("storm"), S.storm.best||0, "рекорд"))),
    h("div",{class:"section"}, h("div",{class:"section-head"}, h("h2",null, tico("knight","green","sm"), "Техника")), h("div",{class:"tiles"},
      tile2("trophy","purple","Доиграй до победа","Матове и ендшпили срещу Stockfish", ()=>go("endgames"), `${egDone}/${ENDGAMES.length}`, "минати"),
      tile2("grid","teal","Координати","Намирай полетата бързо", ()=>go("coords"), S.coords.best||0, "рекорд"))),
    h("div",{class:"section"}, h("div",{class:"section-head"}, h("h2",null, tico("wrench","red","sm"), "От твоите партии и дебюти")), h("div",{class:"tiles"},
      tile2("wrench","red","Грешки от партиите", all ? (md?"Чакат да ги поправиш":"Всичко е поправено за днес") : "Появяват се след анализ на партия", ()=>go(all?"fix":"play"), md, "за днес"),
      tile2("book","blue","Повтори дебютите", ld?"Линиите, които трябва да опресниш":"Няма линии за днес", ()=>go(ld?"review":"learn"), ld, "за днес"),
      failed ? tile2("eye","gray","Сгрешени пъзели","Опитай отново тези, които не реши", ()=>go("puzzle--failed"), failed, "общо") : null)),
    h("div",{class:"section"}, h("div",{class:"section-head"}, h("h2",null, tico("target","blue","sm"), "По тема"), h("span",{class:"muted small"},"колко ти се отдава")), themesBox)));
  loadPuzzles().then(d=>{
    themesBox.innerHTML="";
    for (const gr of THEME_GROUPS.slice(0,5)){
      themesBox.append(h("div",{class:"stack",style:"gap:8px"}, h("span",{class:"eyebrow"},gr.name.replace(/^Ниво \d - /,"")),
        h("div",{class:"themelist"}, gr.t.map(t=>{ const ms=mastery(t); const v=ms.m==null?null:Math.round(ms.m*100);
          return h("button",{class:"tbtn",onclick:()=>go("puzzle--"+t)}, h("div",{class:"row"}, h("span",null,THEME_BG[t]||t), h("small",null, v==null?"нова":v+"%")),
            h("div",{class:"bar"},h("i",{style:`width:${v||0}%;background:${v==null?"transparent":v>=75?"linear-gradient(#a6d872,#73a83f)":v>=55?"linear-gradient(#ffd166,#e39b12)":"linear-gradient(#f5775f,#cc3a26)"}`}))); }))));
    }
  }).catch(()=>{ themesBox.innerHTML=""; themesBox.append(h("div",{class:"status bad"},"Пъзелите не се заредиха. Презареди страницата.")); });
}

function vPuzzle(app, modeArg){
  const m=modeArg||"mix"; const label = m==="mix" ? "Пъзели за теб" : m==="failed" ? "Сгрешени пъзели" : THEME_BG[m]||m;
  let count=0, ok=0; const avoid=new Set();
  const stat=h("span",{class:"pcount"});
  app.append(h("div",{class:"topbar"}, h("button",{class:"iconbtn","aria-label":"Затвори",onclick:()=>go("train")}, icon("close")), h("div",{class:"ttl grow"},label), stat));
  const host=h("div"); app.append(host);
  const nextP=()=>{
    host.innerHTML=""; window.scrollTo(0,0);
    let pz, why=label, th=null; if (m==="mix"){ const r=pickSmart(avoid); pz=r.pz; why=r.why; th=r.theme; } else pz=pickPuzzle(m,{avoid}); if (!pz){ host.append(h("div",{class:"card empty",style:"max-width:520px;margin:30px auto"}, m==="failed"?"Няма сгрешени пъзели. Браво!":"Няма повече пъзели тук.", h("div",{class:"row",style:"justify-content:center;margin-top:12px"},h("button",{class:"btn",onclick:()=>go("train")},"Към тренировката")))); return; }
    avoid.add(pz[0]);
    mountPuzzle(host, pz, {label:why, showTheme: m==="mix" ? !!th : m!=="failed", onResult:s=>{ count++; if (s===1) ok++; stat.textContent=`${ok}/${count}`; }, onNext:nextP, nextLabel:"Следващ пъзел"});
  };
  loadPuzzles().then(nextP).catch(()=>host.append(h("div",{class:"status bad"},"Пъзелите не се заредиха.")));
}

/* ============ puzzle storm ============ */
function vStorm(app){
  app.append(topbar("Пъзел щурм","train"));
  const host=h("div"); app.append(host);
  const intro=()=>{
    host.innerHTML="";
    host.append(h("div",{class:"result"},
      resultArt("timer","gold"), h("span",{class:"chip gold"}, icon("timer"), "3 минути"),
      h("div",{class:"big"},"Пъзел щурм"),
      h("p",{class:"muted",style:"max-width:46ch"},"Решавай колкото можеш повече пъзели за 3 минути. Започват лесно и стават по-трудни. След 3 грешки играта свършва. Тренира бързото виждане на ударите."),
      h("p",null, h("span",{class:"muted"},"Твоят рекорд: "), h("b",{class:"num",style:"font-size:1.2rem"}, S.storm.best||0)),
      h("button",{class:"btn primary big",onclick:start}, icon("play"), "Старт")));
  };
  function start(){
    let solved=0, lives=3, t=180, target=Math.max(450, Math.min(900, S.puz.rating-500)), over=false; const avoid=new Set();
    host.innerHTML="";
    const tbar=h("div",{class:"timer"},h("i",{style:"width:100%"})); const tl=h("b",{class:"num",style:"font-size:1.1rem"},"3:00");
    const sc=h("b",{class:"num",style:"font-size:1.1rem"},"0"); const lv=h("div",{class:"lives"},[0,1,2].map(()=>h("i")));
    const head=h("div",{class:"stack",style:"gap:8px;margin-bottom:12px"}, h("div",{class:"row",style:"justify-content:space-between"}, h("div",{class:"row"},h("span",{class:"muted small"},"Решени"),sc), lv, h("div",{class:"row"},h("span",{class:"muted small"},"Време"),tl)), tbar);
    const slot=h("div"); host.append(head, slot);
    const iv=setInterval(()=>{ t--; tl.textContent=`${Math.floor(Math.max(t,0)/60)}:${String(Math.max(t,0)%60).padStart(2,"0")}`; tbar.firstChild.style.width=(Math.max(t,0)/180*100)+"%"; if (t<=0) end(); },1000);
    onLeave(()=>clearInterval(iv));
    const nextP=()=>{
      if (over) return; slot.innerHTML="";
      const pz=pickPuzzle("mix",{target, avoid, maxLen:6}); avoid.add(pz[0]);
      mountPuzzle(slot, pz, {label:"Щурм", rated:false, auto:true, quick:true, xpAmt:3, onResult:s=>{ if (s===1){ solved++; sc.textContent=solved; target+=55; } else { lives--; lv.children[2-lives] && lv.children[2-lives].classList.add("x"); target=Math.max(400,target-40); } }, onNext:()=>{ if (lives<=0) end(); else nextP(); }});
    };
    function end(){
      if (over) return; over=true; clearInterval(iv);
      const rec = solved>(S.storm.best||0); if (rec) S.storm.best=solved; S.storm.runs=(S.storm.runs||0)+1; markDay(); save(); Sound.play("win");
      host.innerHTML=""; host.append(h("div",{class:"result"},
        rec ? h("span",{class:"chip gold"},"Нов рекорд!") : null,
        h("div",{class:"big"}, solved), h("p",{class:"muted"},`${plural(solved,"решен пъзел","решени пъзела")}. Рекорд: ${S.storm.best}.`),
        h("div",{class:"row",style:"justify-content:center"}, h("button",{class:"btn primary big",onclick:start},"Пак"), h("button",{class:"btn big",onclick:()=>go("train")},"Към тренировката"))));
    }
    loadPuzzles().then(nextP);
  }
  intro();
}

/* ============ own mistakes ============ */
function vFix(app, id){
  const list = id ? (S.mist||[]).filter(x=>x.id===id) : mistDue().sort((a,b)=>a.due-b.due).slice(0,10);
  if (!list.length){ app.append(topbar("Грешки от партиите","train"), h("div",{class:"card empty",style:"max-width:560px;margin:30px auto"}, h("h2",null,"Няма грешки за поправяне"), h("p",null,"Изиграй партия с треньора или анализирай своя партия от chess.com/lichess. Грешките ти ще се появят тук като упражнения."), h("div",{class:"row",style:"justify-content:center;margin-top:12px"}, h("button",{class:"btn primary",onclick:()=>go("play")},"Играй партия"), h("button",{class:"btn",onclick:()=>go("progress")},"Прогрес")))); return; }
  runSeq(app, {back: id?"progress":"train", label:"Грешки", steps:list, render:(card, host, next)=>mountFix(host, card, {onResult:s=>{ card._ok=s; }, onNext:()=>next(card._ok)}),
    finish:(res, host)=>summary(host, "Готово", res.map(r=>({t:`${r.step.san} · ${CAT_LABEL[r.step.cat]||"грешка"}`, ok:r.res===1, note:r.res===1?"Поправена":"Ще се върне"})), [h("button",{class:"btn primary big",onclick:()=>go("home")},"Към началото")])});
}

/* ============ progress ============ */
function sparkline(vals){
  const W=300,H=60; const ns="http://www.w3.org/2000/svg"; const svg=document.createElementNS(ns,"svg"); svg.setAttribute("viewBox",`0 0 ${W} ${H}`); svg.setAttribute("class","spark"); svg.setAttribute("preserveAspectRatio","none");
  if (vals.length<2) return svg; const mn=Math.min(...vals), mx=Math.max(...vals);
  const x=i=>i/(vals.length-1)*(W-8)+4, y=v=>H-6-(v-mn)/((mx-mn)||1)*(H-12);
  const pts=vals.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
  const area=document.createElementNS(ns,"polygon"); area.setAttribute("points",`${x(0)},${H} ${pts} ${x(vals.length-1)},${H}`); area.setAttribute("fill","var(--accent-soft)"); svg.append(area);
  const pl=document.createElementNS(ns,"polyline"); pl.setAttribute("points",pts); pl.setAttribute("fill","none"); pl.setAttribute("stroke","var(--accent)"); pl.setAttribute("stroke-width","2.5"); pl.setAttribute("stroke-linejoin","round"); pl.setAttribute("vector-effect","non-scaling-stroke"); svg.append(pl);
  return svg;
}
function parsePgn(txt){
  const head={}; txt.replace(/\[(\w+)\s+"([^"]*)"\]/g,(m,k,v)=>{ head[k]=v; return ""; });
  let body=txt.replace(/\[[^\]]*\]/g," ").replace(/\{[^}]*\}/g," ").replace(/;[^\n]*/g," ");
  let prev; do { prev=body; body=body.replace(/\([^()]*\)/g," "); } while (body!==prev);
  body=body.replace(/\$\d+/g," ").replace(/\d+\.(\.\.)?/g," ").replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/,"");
  const start=head.FEN||null; const g=start?new Chess(start):new Chess(); const sans=[];
  for (const tk of body.split(/\s+/).filter(Boolean)){ const m=g.move(tk.replace(/[!?]+$/,""),{sloppy:true}); if (!m) return {err:`Не разпознах хода „${tk}“.`}; sans.push(m.san); }
  if (sans.length<4) return {err:"Няма достатъчно ходове в текста."};
  return {head, sans, start};
}
const AREA_IC = {think:["brain","purple"], tactic:["bolt","orange"], mate:["crown","red"], defense:["shield","blue"], opening:["book","green"], endgame:["flag","teal"]};
function vProgress(app){
  const c=coachView(); const pr=c.p; const games=S.games||[];
  const set=new Set(S.days); const days=[...Array(14)].map((_,i)=>{ const d=new Date(Date.now()-(13-i)*DAY).toISOString().slice(0,10); return h("i",{class:set.has(d)?"on":"",title:d}); });
  const rh=(S.puz.rh||[]).map(x=>x.r);
  const phaseBar=(l,v)=>h("div",{class:"stack",style:"gap:6px"}, h("div",{class:"row",style:"justify-content:space-between"}, h("span",null,l), h("b",{class:"mono"}, v==null?"-":v+"%")), h("div",{class:"bar"},h("i",{style:`width:${v||0}%;background:${v==null?"transparent":v>=80?"var(--good)":v>=65?"var(--warn)":"var(--bad)"}`})));
  // PGN import
  const handleIn=h("input",{type:"text",id:"handle",placeholder:"напр. nick_sofia",value:S.handle||"",style:"width:100%"});
  let myColor="w"; const seg=h("div",{class:"seg"},["w","b"].map(cc=>h("button",{"aria-pressed":String(cc===myColor),"data-c":cc,onclick:()=>{ myColor=cc; seg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.c===cc))); }}, cc==="w"?"Бели":"Черни")));
  const pgnIn=h("textarea",{id:"pgnin",placeholder:"[Event \"Live Chess\"]\n1. e4 e5 2. Nf3 ..."}); const pgnMsg=h("div");
  function importGame(){
    pgnMsg.innerHTML=""; const r=parsePgn(pgnIn.value); if (r.err){ pgnMsg.append(h("div",{class:"status bad"},r.err+" Копирай PGN от chess.com или lichess (Сподели → PGN).")); return; }
    S.handle=handleIn.value.trim(); let uc=myColor;
    if (S.handle){ const hn=S.handle.toLowerCase(); if ((r.head.White||"").toLowerCase()===hn) uc="w"; else if ((r.head.Black||"").toLowerCase()===hn) uc="b"; }
    const opp = uc==="w" ? (r.head.Black||"противник") : (r.head.White||"противник");
    const g={id:"p"+Date.now().toString(36), date:Date.now(), src:"pgn", name:`Срещу ${opp}`, uc, res:r.head.Result||"*", sans:r.sans, start:r.start, site:r.head.Site||""};
    saveGame(g); go("game--"+g.id);
  }
  // settings
  const soundChk=h("input",{type:"checkbox",id:"snd",checked:!!S.set.sound,onchange:()=>{ S.set.sound=soundChk.checked; save(); if (S.set.sound){ Sound.unlock(); Sound.play("move"); } }});
  const sw=h("div",{class:"swatches"}, Object.entries(BOARDS).map(([k,b])=>h("button",{class:"swatch","aria-label":"Дъска: "+b[2],title:b[2],"aria-pressed":String(S.set.board===k),onclick:(e)=>{ const me=e.currentTarget; S.set.board=k; save(); applySettings(); sw.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===me))); }}, h("i",{style:`background:${b[0]}`}),h("i",{style:`background:${b[1]}`}),h("i",{style:`background:${b[1]}`}),h("i",{style:`background:${b[0]}`}))));
  app.append(h("div",{class:"stack",style:"gap:26px"},
    h("div",{class:"stack",style:"gap:8px"}, h("h1",null,"Прогрес"), h("p",{class:"muted",style:"max-width:62ch"},"Треньорът следи пъзелите и партиите ти, намира навиците, които ти струват точки, и нагласява уроците и тренировката за деня.")),
    (()=>{ const L=levelOf(S.xp||0); return h("div",{class:"card levelcard"},
      (()=>{ const m=fi("medal"); m.setAttribute("class","medal"); return m; })(),
      h("div",{class:"stack grow",style:"gap:6px"}, h("span",{class:"eyebrow"},"Твоето ниво"), h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"num"},L.name), h("span",{class:"muted small mono"}, L.to?`${S.xp} / ${L.to} точки`:`${S.xp} точки`)),
        h("div",{class:"bar",style:"height:8px"},h("i",{style:`width:${L.pct}%`})), h("span",{class:"muted small"}, L.next?`Следващо ниво: ${L.next}. Точки получаваш за всеки решен пъзел, упражнение, урок и тренировка.`:"Най-високото ниво. Браво!"))); })(),
    (()=>{ const ar=areas(); const known=ar.filter(a=>a.v!=null); const low=known.length? known.reduce((x,y)=>y.v<x.v?y:x) : null;
      return h("div",{class:"section"}, h("div",{class:"section-head"}, h("h2",null,"Профил в 6 области"), h("span",{class:"muted small"},"от 0 до 100")),
        h("div",{class:"areas"}, ar.map(a=>h("button",{class:"area"+(low&&a.k===low.k?" low":""),onclick:()=>go(a.go)},
          h("div",{class:"row",style:"justify-content:space-between;flex-wrap:nowrap"}, h("span",{class:"row",style:"gap:10px;flex-wrap:nowrap"}, tico(...(AREA_IC[a.k]||["target","green"]),"sm"), h("b",null,a.t)), h("span",{class:"num",style:"font-size:1.1rem"}, a.v==null?"-":a.v)),
          h("div",{class:"bar"},h("i",{style:`width:${a.v||0}%;background:${a.v==null?"transparent":a.v>=75?"var(--good)":a.v>=55?"var(--warn)":"var(--bad)"}`})),
          h("small",{class:"muted"}, a.v==null ? "Още няма данни" : low&&a.k===low.k ? "Най-слабото ти място. Натисни, за да тренираш." : a.d))))); })(),
    h("div",{class:"statgrid"},
      h("div",{class:"card stat"}, h("span",{class:"eyebrow"},"Рейтинг пъзели"), h("span",{class:"num"},Math.round(S.puz.rating)), sparkline(rh)),
      h("div",{class:"card stat"}, h("span",{class:"eyebrow"},"Серия"), h("span",{class:"num"},`${streak()} ${plural(streak(),"ден","дни")}`), h("div",{class:"days"},days)),
      h("div",{class:"card stat"}, h("span",{class:"eyebrow"},"Уроци"), h("span",{class:"num"},`${lessonsDoneCount()}/${LESSONS.length}`), h("div",{class:"bar",style:"margin-top:12px"},h("i",{style:`width:${lessonsDoneCount()/LESSONS.length*100}%`}))),
      h("div",{class:"card stat"}, h("span",{class:"eyebrow"},"Точност в партии"), h("span",{class:"num"}, pr.accAvg!=null?pr.accAvg+"%":"-"), h("span",{class:"muted small"}, pr.n?`${pr.n} ${plural(pr.n,"анализирана партия","анализирани партии")}`:"Още няма партии"))),
    h("div",{class:"section"}, h("h2",null,"Какво да поправиш първо"),
      c.weak.length ? h("div",{class:"grid2"}, c.weak.map((w,i)=>h("div",{class:"card weak"}, h("span",{class:"n"},i+1),
        h("div",{class:"stack",style:"gap:6px"}, h("h3",null,w.t), h("p",{class:"muted small"},w.why), h("p",{class:"small"},w.fix), h("span",{class:"muted small"},w.src),
          h("button",{class:"btn sm primary",style:"align-self:flex-start;margin-top:4px",onclick:()=>go("lesson--"+w.lesson)},"Урок: "+LESSON_BY_ID[w.lesson].title)))))
      : h("div",{class:"card empty"},"Още няма достатъчно данни. Изиграй 2-3 партии с треньора или анализирай свои партии отдолу. Решавай и пъзели: слабите теми също се отчитат.")),
    (S.mist||[]).length ? h("div",{class:"card row"}, h("div",{class:"grow",style:"min-width:200px"}, h("h3",null,"Грешки от твоите партии"), h("span",{class:"muted small"}, mistDue().length?`${mistDue().length} позиции чакат поправка. Всяка се връща, докато я научиш.`:`Всички ${(S.mist||[]).length} позиции са повторени за днес.`)), h("button",{class:"btn primary",disabled:!mistDue().length,onclick:()=>go("fix")},"Поправи")) : null,
    h("div",{class:"grid2"},
      h("div",{class:"card stack"}, h("h3",null,"Точност по фази на партията"), phaseBar("Дебют",pr.phase.o), phaseBar("Мителшпил",pr.phase.m), phaseBar("Ендшпил",pr.phase.e)),
      h("div",{class:"card stack"}, h("h3",null,"Тактически теми"),
        pr.themes.length ? h("div",{class:"stack",style:"gap:6px"},
          (()=>{ const nW=Math.min(3,Math.ceil(pr.themes.length/2)); pr._w=pr.themes.slice(0,nW); pr._s=pr.themes.slice(nW).slice(-2).reverse(); return null; })(),
          pr._w.map(t=>h("button",{class:"trow",onclick:()=>go("puzzle--"+t.t)}, h("span",{class:"grow"},THEME_BG[t.t]), h("b",{style:`color:${t.pct<60?"var(--bad)":t.pct<75?"var(--warn)":"var(--good)"}`},t.pct+"%"))),
          pr._s.length ? h("span",{class:"eyebrow",style:"margin-top:6px"},"Най-силни") : null,
          pr._s.map(t=>h("div",{class:"trow",style:"cursor:default"}, h("span",{class:"grow"},THEME_BG[t.t]), h("b",{style:"color:var(--good)"},t.pct+"%"))))
          : h("p",{class:"muted small"},"Реши поне 4 пъзела от тема, за да видиш силните и слабите си страни."))),
    games.length ? h("div",{class:"card stack"}, h("h3",null,"Последни партии"), h("div",{class:"list"}, games.slice(0,12).map(g=>{
      const res = g.res==="*" ? "-" : g.res==="1/2-1/2" ? "Реми" : ((g.res==="1-0")===(g.uc==="w") ? "Победа" : "Загуба");
      return h("div",{class:"li",role:"link",tabindex:"0",style:"cursor:pointer",onclick:()=>go("game--"+g.id),onkeydown:e=>{ if(e.key==="Enter") go("game--"+g.id); }},
        h("span",{class:"dot "+g.uc}), h("div",{class:"grow"}, h("div",{style:"font-weight:600;color:var(--ink)"},g.name), h("span",{class:"muted small"}, new Date(g.date).toLocaleDateString("bg-BG")+" · "+(g.src==="pgn"?"внесена":"с треньора"))),
        h("span",{class:"chip "+(res==="Победа"?"good":res==="Загуба"?"bad":"")},res), h("b",{class:"mono",style:"min-width:3.2em;text-align:right"}, g.sum? g.sum.acc+"%" : "..."));
    }))) : null,
    h("details",{class:"card"}, h("summary",null,"Анализирай своя партия от chess.com или lichess"),
      h("div",{class:"stack",style:"margin-top:14px"},
        h("p",{class:"muted small"},"В chess.com: отвори партията → Сподели → PGN → Копирай. В lichess: Сподели и експорт → PGN. Постави текста тук. Грешките ти влизат в упражненията."),
        h("div",{class:"row",style:"align-items:flex-end"}, h("label",{class:"field grow",for:"handle",style:"min-width:180px"},h("span",null,"Твоето потребителско име (по желание)"),handleIn), h("span",{class:"field"},h("span",null,"Аз бях с"),seg)),
        h("label",{class:"field",for:"pgnin"},h("span",null,"PGN"),pgnIn), pgnMsg,
        h("div",{class:"row"}, h("button",{class:"btn primary",onclick:importGame},"Анализирай партията")))),
    h("div",{class:"section"}, h("div",{class:"section-head"}, h("h2",null,"Значки"), h("span",{class:"muted small"},`${BADGES.filter(b=>S.badges[b.id]).length} от ${BADGES.length}`)),
      h("div",{class:"badges"}, BADGES.slice().sort((a,b)=>(S.badges[b.id]?1:0)-(S.badges[a.id]?1:0)).map(b=>{ const got=!!S.badges[b.id]; return h("div",{class:"badge-i"+(got?" got":""),title:b.d}, h("span",{class:"bi"}, icon(got?"medal":"lock")), h("b",null,b.t), h("small",null,b.d)); }))),
    coachCard(()=>`Профил на ученика. Анализирани партии: ${pr.n}. Средна точност: ${pr.accAvg??"-"}%. Груби грешки на партия: ${pr.blunders!=null?pr.blunders.toFixed(1):"-"}. Точност по фази: дебют ${pr.phase.o??"-"}%, мителшпил ${pr.phase.m??"-"}%, ендшпил ${pr.phase.e??"-"}%. Навици: ${pr.habits.slice(0,5).map(x=>(HABITS[x.k]?HABITS[x.k].t:x.k)+" ("+x.c+" партии)").join("; ")||"няма данни"}. Слаби теми: ${pr.themes.slice(0,3).map(t=>THEME_BG[t.t]+" "+t.pct+"%").join(", ")||"няма данни"}. Рейтинг пъзели: ${Math.round(S.puz.rating)}. Минати уроци: ${LESSONS.filter(l=>lessonDone(l.id)).map(l=>l.title).join(", ")||"няма"}. Направи кратък персонален план за следващите 2 седмици: какво да тренира всеки ден (20-30 минути) и защо.`, "Персонален план от треньора")));
}

/* ============ boot ============ */
const VIEWS = {daily:vDaily, home:vHome, learn:vLearn, lesson:vLesson, course:vCourse, study:vStudy, drill:vDrill, train:vTrain, session:vSession, puzzle:vPuzzle, storm:vStorm, fix:vFix, review:vReview};
