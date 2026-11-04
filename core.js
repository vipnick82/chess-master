"use strict";
/* ============ helpers ============ */
const $ = (s, r=document) => r.querySelector(s);
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const [k,v] of Object.entries(attrs)){
    if (v==null || v===false) continue;
    if (k==="class") el.className=v; else if (k==="html") el.innerHTML=v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k==="style") el.style.cssText=v; else el.setAttribute(k, v===true?"":v);
  }
  for (const k of kids.flat(Infinity)) if (k!=null && k!==false) el.append(k.nodeType?k:document.createTextNode(String(k)));
  return el;
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; };
const today = () => new Date().toISOString().slice(0,10);
const sideName = s => s==="w" ? "белите" : "черните";
function fenKey(fen){ return fen.split(" ").slice(0,4).join(" "); }
function uciOf(m){ return m.from + m.to + (m.promotion||""); }

/* ============ state & storage ============ */
const LS_KEY = "chessmaster.v1";
function blankState(){ return {v:1, updatedAt:0, lines:{}, puz:{rating:1200, n:0, ok:0, theme:{}, hist:{}}, custom:[], play:{games:0, level:2, strict:20}, days:[], drills:0, games:[], mist:[], today:null, handle:""}; }
let S = blankState();
try { const raw = localStorage.getItem(LS_KEY); if (raw) S = Object.assign(blankState(), JSON.parse(raw)); } catch(e) {}
// fields added in v2 (lessons, settings, storm, onboarding); old progress keeps working
function migrate(){
  S.les = S.les || {}; S.storm = S.storm || {best:0, runs:0};
  S.set = Object.assign({board:"green", sound:true, theme:"auto"}, S.set || {});
  S.puz = Object.assign({rating:1200, n:0, ok:0, theme:{}, hist:{}}, S.puz || {}); S.puz.rh = S.puz.rh || [];
  S.play = S.play || {games:0, level:2, strict:20}; S.mist = S.mist || []; S.games = S.games || []; S.days = S.days || []; S.lines = S.lines || {};
  S.sessions = S.sessions || {};
}
migrate();
let dbRef = null, saveTimer = null, saving = false, pendingSave = false;
function markDay(){ const d=today(); if (!S.days.includes(d)) { S.days.push(d); if (S.days.length>400) S.days.shift(); } }
function save(){
  S.updatedAt = Date.now();
  try { let js=JSON.stringify(S); let i=(S.games||[]).length-1; while (js.length>230000 && i>=5){ if (S.games[i].an){ delete S.games[i].an; } i--; js=JSON.stringify(S); } } catch(e) {}
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch(e) {}
  clearTimeout(saveTimer); saveTimer = setTimeout(flushDb, 1500);
}
async function flushDb(){
  if (!dbRef) return;
  if (saving) { pendingSave = true; return; }
  saving = true;
  try { await dbRef.set({updatedAt:S.updatedAt, data:JSON.stringify(S)}); setSync("Прогресът се пази в акаунта ти"); }
  catch(e){ setSync("Пази се само в този браузър"); }
  saving = false;
  if (pendingSave){ pendingSave=false; flushDb(); }
}
function setSync(t){ const el=$("#sync"); if (el) el.textContent=t; }
async function initDb(){
  setSync("Пази се в този браузър");
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    dbRef = db.doc("data/users/" + id + "/progress");
    const snap = await dbRef.get();
    if (snap.exists){
      const d = snap.data();
      if (d && d.data && (d.updatedAt||0) > (S.updatedAt||0)){
        S = Object.assign(blankState(), JSON.parse(d.data)); migrate(); if (typeof applySettings==="function") applySettings();
        try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch(e) {}
        softRefresh();
      } else if ((S.updatedAt||0) > (d.updatedAt||0)) flushDb();
    } else if (S.updatedAt) flushDb();
    setSync("Прогресът се пази в акаунта ти");
  } catch(e){ setSync("Пази се в този браузър"); }
}

/* ============ courses model ============ */
function allCourses(){ return BASE_COURSES; }
function findLine(id){
  for (const c of allCourses()) for (const ch of c.chapters) for (const l of ch.lines)
    if (l.id===id) return {course:c, chapter:ch, line:l, side: l.side || c.side};
  return null;
}
function lineStat(id){ return S.lines[id] || null; }
function lineStatus(id){
  const st = lineStat(id);
  if (!st || !st.box) return st && st.seen ? {k:"learn", t:"Прегледана"} : {k:"new", t:"Нова"};
  if (st.due <= Date.now()) return {k:"due", t:"За повторение"};
  if (st.box >= 5) return {k:"done", t:"Усвоена"};
  if (st.box >= 3) return {k:"rev", t:"Затвърдява се"};
  return {k:"learn", t:"Учи се"};
}
function dueLines(){
  const out=[];
  for (const c of allCourses()) for (const ch of c.chapters) for (const l of ch.lines){
    const st=lineStat(l.id); if (st && st.box && st.due<=Date.now()) out.push(l.id);
  }
  return out;
}
function recordDrill(id, mistakes){
  const st = S.lines[id] || {box:0, due:0, ok:0, bad:0};
  if (mistakes===0){ st.box = Math.min((st.box||0)+1, INTERVALS.length-1); st.ok=(st.ok||0)+1; }
  else if (mistakes===1){ st.box = Math.max(1, st.box||1); st.bad=(st.bad||0)+1; }
  else { st.box = 1; st.bad=(st.bad||0)+1; }
  st.due = mistakes>=2 ? Date.now() + 10*60e3 : Date.now() + INTERVALS[st.box]*DAY - 3600e3;
  st.last = Date.now(); st.seen = true;
  S.lines[id] = st; S.drills=(S.drills||0)+1; bump("lines"); markDay(); save();
}
function courseProgress(c){
  let n=0, k=0; for (const ch of c.chapters) for (const l of ch.lines){ n++; const st=lineStat(l.id); if (st && st.box>=3) k++; }
  return {n, k, pct: n? Math.round(k/n*100):0};
}
// opening book from course lines: fenKey -> [{san, uci, lineId}]
function buildBook(course){
  const book = new Map();
  for (const ch of course.chapters) for (const l of ch.lines){
    const g = new Chess();
    for (const m of l.moves){
      const k = fenKey(g.fen());
      const arr = book.get(k) || []; if (!arr.some(x=>x.san===m.s)) arr.push({san:m.s, line:l.id}); book.set(k, arr);
      if (!g.move(m.s)) break;
    }
  }
  return book;
}

/* ============ Board ============ */
const FILES="abcdefgh";
class Board {
  constructor(el, opts={}){
    this.el = el; this.o = Object.assign({orientation:"w", movable:null, dests:()=>[], onMove:()=>{}}, opts);
    this.pos = {}; this.last=null; this.sel=null; this.arrowsList=[]; this.marks=new Set();
    this.build(); this.bind();
  }
  build(){
    const el=this.el; el.innerHTML=""; el.className="board"; this.sq={};
    const ranks = this.o.orientation==="w" ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
    const files = this.o.orientation==="w" ? [...FILES] : [...FILES].reverse();
    ranks.forEach((r,ri)=>files.forEach((f,fi)=>{
      const name=f+r, light=(FILES.indexOf(f)+r)%2===1;
      const d=h("div",{class:"sq "+(light?"l":"d"),"data-sq":name});
      if (ri===7) d.append(h("span",{class:"coord f"},f));
      if (fi===0) d.append(h("span",{class:"coord r"},r));
      el.append(d); this.sq[name]=d;
    }));
    this.svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    this.svg.setAttribute("viewBox","0 0 8 8"); this.svg.classList.add("arrows"); el.append(this.svg);
    this.render();
  }
  setOrientation(o){ if (o!==this.o.orientation){ this.o.orientation=o; this.build(); } }
  setFen(fen, last, opts){
    this.pos={}; const rows=fen.split(" ")[0].split("/");
    rows.forEach((row,i)=>{ let f=0; for (const ch of row){ if (/\d/.test(ch)) f+=+ch; else { const color = ch===ch.toUpperCase()?"w":"b"; this.pos[FILES[f]+(8-i)] = color+ch.toUpperCase(); f++; } } });
    const prev=this.prevPos||{}; this.prevPos=Object.assign({},this.pos);
    this.fen=fen; this.last = last||null; this.sel=null; this.render();
    if (opts && opts.anim && last){
      const capture = !!prev[last.to] || (this.pos[last.to]&&this.pos[last.to][1]==="P"&&last.from[0]!==last.to[0]);
      Sound.play(this.inCheck ? "check" : capture ? "capture" : "move");
      if (this.dropped===last.to){ this.dropped=null; return; }
      this.slide(last.from, last.to);
      // castling: slide the rook too
      const p=this.pos[last.to]; if (p && p[1]==="K" && Math.abs(FILES.indexOf(last.from[0])-FILES.indexOf(last.to[0]))===2){ const r=last.to[1]; const kside=last.to[0]==="g"; this.slide((kside?"h":"a")+r, (kside?"f":"d")+r); }
    }
    this.dropped=null;
  }
  render(){
    const turn = this.fen ? this.fen.split(" ")[1] : "w";
    let checkSq=null;
    if (this.fen && this.inCheck){ for (const [s,p] of Object.entries(this.pos)) if (p===turn+"K") checkSq=s; }
    for (const [name,d] of Object.entries(this.sq)){
      d.querySelectorAll(".pc,.dest").forEach(x=>x.remove());
      d.classList.toggle("last", !!(this.last && (this.last.from===name||this.last.to===name)));
      d.classList.toggle("sel", this.sel===name);
      d.classList.toggle("hint", this.marks.has(name));
      d.classList.toggle("check", checkSq===name);
      const p=this.pos[name]; if (p) d.append(h("div",{class:"pc "+p}));
    }
    if (this.sel) for (const t of this.o.dests(this.sel)) this.sq[t] && this.sq[t].append(h("div",{class:"dest"+(this.pos[t]?" cap":"")}));
    this.drawArrows();
  }
  setCheck(v){ this.inCheck=v; }
  slide(from, to){
    const a=this.sq[from], b=this.sq[to]; if (!a||!b||!b.animate) return; const pc=b.querySelector(".pc"); if (!pc || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect(); const dx=ra.left-rb.left, dy=ra.top-rb.top; if (!dx&&!dy) return;
    pc.style.zIndex=5; const an=pc.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"translate(0,0)"}],{duration:170,easing:"cubic-bezier(.3,.7,.3,1)"}); an.onfinish=()=>{pc.style.zIndex="";};
  }
  mark(sqs){ this.marks=new Set(sqs||[]); this.render(); }
  arrows(list){ this.arrowsList=list||[]; this.drawArrows(); }
  drawArrows(){
    const svg=this.svg; if (!svg) return; svg.innerHTML="";
    const ns="http://www.w3.org/2000/svg";
    const xy = s => { let f=FILES.indexOf(s[0]), r=+s[1]; if (this.o.orientation==="w") return [f+.5, 8-r+.5]; return [7-f+.5, r-1+.5]; };
    for (const a of this.arrowsList){
      const [x1,y1]=xy(a.from), [x2,y2]=xy(a.to); const col=a.color||"rgba(40,130,80,.85)";
      const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy), ux=dx/len, uy=dy/len;
      const ex=x2-ux*.32, ey=y2-uy*.32;
      const line=document.createElementNS(ns,"line");
      line.setAttribute("x1",x1); line.setAttribute("y1",y1); line.setAttribute("x2",ex); line.setAttribute("y2",ey);
      line.setAttribute("stroke",col); line.setAttribute("stroke-width",".16"); line.setAttribute("stroke-linecap","round"); svg.append(line);
      const px=-uy, py=ux, hx=x2-ux*.05, hy=y2-uy*.05, bx=x2-ux*.45, by=y2-uy*.45;
      const tri=document.createElementNS(ns,"polygon");
      tri.setAttribute("points",`${hx},${hy} ${bx+px*.24},${by+py*.24} ${bx-px*.24},${by-py*.24}`); tri.setAttribute("fill",col); svg.append(tri);
    }
  }
  flashBad(s){ const d=this.sq[s]; if(!d) return; d.classList.remove("badflash"); void d.offsetWidth; d.classList.add("badflash"); setTimeout(()=>d.classList.remove("badflash"),800); }
  sqAt(x,y){
    const r=this.el.getBoundingClientRect(); if (x<r.left||y<r.top||x>r.right||y>r.bottom) return null;
    let fi=Math.floor((x-r.left)/r.width*8), ri=Math.floor((y-r.top)/r.height*8); fi=Math.min(7,Math.max(0,fi)); ri=Math.min(7,Math.max(0,ri));
    return this.o.orientation==="w" ? FILES[fi]+(8-ri) : FILES[7-fi]+(ri+1);
  }
  canMove(s){ const p=this.pos[s]; if (!p || !this.o.movable) return false; const turn=this.fen.split(" ")[1]; return p[0]===turn && (this.o.movable==="both" || this.o.movable===p[0]); }
  bind(){
    let drag=null;
    // keyboard: Tab to the board, arrows move a cursor, Enter/Space selects a piece and then a square
    this.el.tabIndex=0; this.el.setAttribute("role","application"); this.el.setAttribute("aria-label","Шахматна дъска. Стрелки за избор на поле, Enter за ход.");
    this.el.addEventListener("keydown", e=>{
      const k=e.key; if (!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter"," "].includes(k)) return;
      e.preventDefault(); const w=this.o.orientation==="w";
      if (!this.kc) this.kc = w ? "e2" : "e7";
      let f=FILES.indexOf(this.kc[0]), r=+this.kc[1];
      if (k==="ArrowUp") r+=w?1:-1; if (k==="ArrowDown") r+=w?-1:1; if (k==="ArrowRight") f+=w?1:-1; if (k==="ArrowLeft") f+=w?-1:1;
      f=Math.max(0,Math.min(7,f)); r=Math.max(1,Math.min(8,r)); this.kc=FILES[f]+r;
      if (k==="Enter"||k===" "){
        const s=this.kc;
        if (this.sel && this.sel!==s && this.o.dests(this.sel).includes(s)){ const fr=this.sel; this.sel=null; this.render(); this.o.onMove(fr,s); }
        else if (this.canMove(s)){ this.sel=s; this.render(); }
        else { this.sel=null; this.render(); }
      }
      Object.values(this.sq).forEach(d=>d.classList.remove("kcur")); this.sq[this.kc] && this.sq[this.kc].classList.add("kcur");
    });
    this.el.addEventListener("blur", ()=>Object.values(this.sq).forEach(d=>d.classList.remove("kcur")));
    this.el.addEventListener("pointerdown", e=>{
      if (e.button>0) return;
      const s=this.sqAt(e.clientX,e.clientY); if (!s) return;
      if (this.sel && this.sel!==s && this.o.dests(this.sel).includes(s)){ const f=this.sel; this.sel=null; this.render(); this.o.onMove(f,s); return; }
      if (this.canMove(s)){
        e.preventDefault(); this.sel=s; this.render();
        const pc=this.sq[s].querySelector(".pc"); const size=this.el.getBoundingClientRect().width/8;
        drag={from:s, x:e.clientX, y:e.clientY, moved:false, pc, size, ghost:null};
        this.el.setPointerCapture && this.el.setPointerCapture(e.pointerId);
      } else { this.sel=null; this.render(); }
    });
    this.el.addEventListener("pointermove", e=>{
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5) return;
      if (!drag.moved){ drag.moved=true; drag.ghost=h("div"); drag.ghost.className="dragghost pc "+this.pos[drag.from]; drag.ghost.style.width=drag.ghost.style.height=drag.size+"px"; drag.ghost.style.position="fixed"; document.body.append(drag.ghost); const pc=this.sq[drag.from].querySelector(".pc"); pc && pc.classList.add("dragging"); }
      drag.ghost.style.left=e.clientX+"px"; drag.ghost.style.top=e.clientY+"px";
    });
    const end = e=>{
      if (!drag) return; const d=drag; drag=null;
      if (d.ghost) d.ghost.remove();
      if (!d.moved) return; // click-select stays
      const s=this.sqAt(e.clientX,e.clientY);
      if (s && s!==d.from && this.o.dests(d.from).includes(s)){ this.sel=null; this.dropped=s; this.render(); this.o.onMove(d.from,s); }
      else { this.render(); }
    };
    this.el.addEventListener("pointerup", end);
    this.el.addEventListener("pointercancel", ()=>{ if (drag&&drag.ghost) drag.ghost.remove(); drag=null; this.render(); });
  }
  askPromotion(color){
    return new Promise(res=>{
      const o=h("div",{class:"promo"});
      for (const p of ["q","r","b","n"]) o.append(h("button",{"aria-label":{q:"Дама",r:"Топ",b:"Офицер",n:"Кон"}[p], onclick:(e)=>{e.stopPropagation(); o.remove(); res(p);}}, h("div",{class:"pc "+color+p.toUpperCase()})));
      o.addEventListener("pointerdown", e=>e.stopPropagation());
      this.el.append(o);
    });
  }
}
// wire a Board to a chess.js game. onMove(move) returns after handling; userColor 'w'|'b'|'both'
function playable(board, game, userColor, onUserMove){
  board.o.movable = userColor;
  board.o.dests = s => game.moves({square:s, verbose:true}).map(m=>m.to);
  board.o.onMove = async (from,to) => {
    let promotion;
    const cand = game.moves({square:from, verbose:true}).filter(m=>m.to===to);
    if (!cand.length) return;
    if (cand.some(m=>m.promotion)) promotion = await board.askPromotion(game.turn());
    onUserMove({from,to,promotion});
  };
}
function sync(board, game, last, anim=true){ board.setCheck(game.in_check()); board.setFen(game.fen(), last, {anim}); }

/* ============ Engine: Stockfish 19 lite (NNUE) in a worker ============ */
const ENGINE_FILE = "stockfish-19-lite-single.js";
const Engine = {
  w:null, readyP:null, queue:Promise.resolve(), listeners:new Set(), ok:false, gen:0, busy:false,
  init(){
    if (this.readyP) return this.readyP;
    this.readyP = new Promise(res=>{
      let done=false; const finish=v=>{ if(!done){ done=true; this.ok=v; res(v);} };
      try {
        this.w = new Worker(ENGINE_FILE);
        this.w.onmessage = e => { const l = typeof e.data==="string"?e.data:""; for (const f of [...this.listeners]) f(l); };
        this.w.onerror = () => finish(false);
        const f = l => { if (l==="uciok"){ this.send("setoption name Hash value 32"); this.send("isready"); } if (l==="readyok"){ this.listeners.delete(f); finish(true); } };
        this.listeners.add(f); this.send("uci");
        setTimeout(()=>finish(false), 30000);
      } catch(e){ finish(false); }
    });
    return this.readyP;
  },
  send(c){ this.w && this.w.postMessage(c); },
  cancel(){ this.gen++; if (this.busy) this.send("stop"); },
  run(fen, go, opts={}){
    const myGen = this.gen;
    const job = async () => {
      if (myGen!==this.gen) return null;
      if (!(await this.init())) return null;
      if (myGen!==this.gen) return null;
      return new Promise(res=>{
        const info={}; this.busy=true;
        const f = l => {
          if (l.startsWith("info") && l.includes(" pv ")){
            const mp = +(l.match(/ multipv (\d+)/)||[0,1])[1];
            const sc = l.match(/ score (cp|mate) (-?\d+)/);
            const pv = l.split(" pv ")[1].trim().split(" ").filter(t=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(t));
            const dp = +(l.match(/ depth (\d+)/)||[0,0])[1];
            if (sc && pv.length) info[mp] = {cp: sc[1]==="cp"? +sc[2] : null, mate: sc[1]==="mate"? +sc[2]: null, pv, depth:dp};
          }
          if (l.startsWith("bestmove")){ this.listeners.delete(f); this.busy=false; res(myGen===this.gen ? {best:l.split(" ")[1], lines:info, top:info[1]||null} : null); }
        };
        this.listeners.add(f);
        if (opts.elo){ this.send("setoption name UCI_LimitStrength value true"); this.send("setoption name UCI_Elo value "+opts.elo); }
        else this.send("setoption name UCI_LimitStrength value false");
        this.send("setoption name MultiPV value " + (opts.multipv || 1));
        this.send("position fen " + fen);
        this.send(go);
      });
    };
    const p = this.queue.then(job, job); this.queue = p.catch(()=>{}); return p;
  },
  analyse(fen, o={}){ return this.run(fen, `go depth ${o.depth||16} movetime ${o.movetime||500}`, {multipv:o.multipv||1}); },
};
// score in centipawns from the side-to-move's view; mate mapped to large values
function scoreOf(top){ if (!top) return 0; if (top.mate!=null) return top.mate>0 ? 10000-top.mate*10 : -10000-top.mate*10; return top.cp||0; }
function fmtEval(cpWhite){ if (Math.abs(cpWhite)>=9000) return (cpWhite>0?"+":"-")+"M"+Math.max(1,Math.round((10000-Math.abs(cpWhite))/10)); return (cpWhite>0?"+":"")+(cpWhite/100).toFixed(1); }
function pvToSan(fen, pv, n=6){ const g=new Chess(fen); const out=[]; for (const u of (pv||[]).slice(0,n)){ const m=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}); if(!m) break; out.push(m.san);} return out; }
function sanLine(fen, sans){ const parts=fen.split(" "); let n=+parts[5], white=parts[1]==="w"; let s=""; sans.forEach((m,i)=>{ if (white) s+=n+"."+m+" "; else s+=(i===0?n+"..."+m:m)+" "; if(!white) n++; white=!white; }); return s.trim(); }
// win probability (0-100) for the side whose view cp is given (Lichess formula)
function winPct(cp){ if (cp>=9000) return 100; if (cp<=-9000) return 0; return 50 + 50*(2/(1+Math.exp(-0.00368208*cp))-1); }
function moveAccuracy(loss){ return Math.max(0, Math.min(100, 103.1668*Math.exp(-0.04354*loss) - 3.1669)); }

/* ============ Opponent levels ============ */
const LEVELS = [
  {name:"Новак", elo:"~600", h:{depth:5, mpv:6, temp:230, maxLoss:800, wild:.14}},
  {name:"Начинаещ", elo:"~800", h:{depth:6, mpv:6, temp:160, maxLoss:550, wild:.09}},
  {name:"Любител", elo:"~1000", h:{depth:8, mpv:5, temp:105, maxLoss:380, wild:.05}},
  {name:"Клубен", elo:"~1200", h:{depth:10, mpv:5, temp:65, maxLoss:260, wild:.03}},
  {name:"Силен клубен", elo:"~1400", uci:1400},
  {name:"Опитен", elo:"~1600", uci:1600},
  {name:"Кандидат-майстор", elo:"~1900", uci:1900},
  {name:"Майстор", elo:"~2200", uci:2200},
  {name:"Гросмайстор", elo:"~2600", uci:2600},
  {name:"Максимум", elo:"3000+", max:true}];
// returns uci move or null
async function botMove(fen, lvl){
  if (lvl.max){ const r=await Engine.run(fen, "go movetime 1500"); return r&&r.best; }
  if (lvl.uci){ const r=await Engine.run(fen, "go movetime 700", {elo:lvl.uci}); return r&&r.best; }
  const c=lvl.h; const r=await Engine.run(fen, "go depth "+c.depth, {multipv:c.mpv}); if (!r) return null;
  const lines=Object.values(r.lines).filter(l=>l.pv&&l.pv[0]); if (!lines.length) return r.best;
  const sc=lines.map(l=>scoreOf(l)); const best=Math.max(...sc);
  const wild=Math.random()<c.wild; const cap = wild ? c.maxLoss*1.6 : c.maxLoss; const temp = wild ? c.temp*2 : c.temp;
  // a human at this level never misses mate in 1 when it is the obvious capture-free finish? keep it simple: allow misses
  const cand=lines.map((l,i)=>({u:l.pv[0], loss:best-sc[i]})).filter(x=>x.loss<=cap);
  const ws=cand.map(x=>Math.exp(-x.loss/temp)); const tot=ws.reduce((a,b)=>a+b,0);
  let t=Math.random()*tot; for (let i=0;i<cand.length;i++){ t-=ws[i]; if (t<=0) return cand[i].u; }
  return cand[0].u;
}

/* ============ board geometry helpers ============ */
const VAL={p:1,n:3,b:3,r:5,q:9,k:0};
const PNOM={p:"пешката",n:"конят",b:"офицерът",r:"топът",q:"дамата",k:"царят"};
const PACC={p:"пешката",n:"коня",b:"офицера",r:"топа",q:"дамата",k:"царя"};
const PIND={p:"пешка",n:"кон",b:"офицер",r:"топ",q:"дама",k:"цар"};
const capFirst = s => s.charAt(0).toUpperCase()+s.slice(1);
function grid(fen){ const g=[]; for (const row of fen.split(" ")[0].split("/")){ const r=[]; for (const ch of row){ if (/\d/.test(ch)) for(let i=0;i<+ch;i++) r.push(null); else r.push({t:ch.toLowerCase(), c: ch===ch.toUpperCase()?"w":"b"}); } g.push(r);} return g; }
const sqRF = s => [8-(+s[1]), FILES.indexOf(s[0])];
const rfSq = (r,f) => FILES[f]+(8-r);
function attacksFrom(g, r, f){
  const p=g[r][f]; if (!p) return []; const out=[]; const add=(rr,ff)=>{ if(rr>=0&&rr<8&&ff>=0&&ff<8) out.push([rr,ff]); };
  if (p.t==="p"){ const d = p.c==="w"?-1:1; add(r+d,f-1); add(r+d,f+1); return out; }
  if (p.t==="n"){ for (const [a,b] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]) add(r+a,f+b); return out; }
  if (p.t==="k"){ for (let a=-1;a<=1;a++) for (let b=-1;b<=1;b++) if (a||b) add(r+a,f+b); return out; }
  const dirs = p.t==="b" ? [[1,1],[1,-1],[-1,1],[-1,-1]] : p.t==="r" ? [[1,0],[-1,0],[0,1],[0,-1]] : [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  for (const [a,b] of dirs){ let rr=r+a, ff=f+b; while (rr>=0&&rr<8&&ff>=0&&ff<8){ out.push([rr,ff]); if (g[rr][ff]) break; rr+=a; ff+=b; } }
  return out;
}
function attackersOf(g, r, f, color){ const res=[]; for (let i=0;i<8;i++) for (let j=0;j<8;j++){ const p=g[i][j]; if (p&&p.c===color && attacksFrom(g,i,j).some(([a,b])=>a===r&&b===f)) res.push({r:i,f:j,t:p.t}); } return res; }
function material(fen, color){ let m=0; for (const row of grid(fen)) for (const p of row) if (p&&p.c===color) m+=VAL[p.t]; return m; }
function nonPawnMaterial(fen){ let m=0; for (const row of grid(fen)) for (const p of row) if (p&&p.t!=="p"&&p.t!=="k") m+=VAL[p.t]; return m; }
function phaseOf(fen, ply){ if (nonPawnMaterial(fen)<=26) return "e"; return ply<20 ? "o" : "m"; }
// material balance change for `color` along a uci line (up to n plies, extending through captures)
function lineSwing(fen, pv, color, n=4){
  const g=new Chess(fen); const opp=color==="w"?"b":"w";
  const base=material(fen,color)-material(fen,opp); let i=0, lastCap=false;
  for (const u of (pv||[])){ if (i>=n && !lastCap) break; if (i>=n+2) break; const m=g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}); if(!m) break; lastCap=!!m.captured||!!m.promotion; i++; }
  const f=g.fen(); return (material(f,color)-material(f,opp)) - base;
}
// pieces of `victimColor` worth >=3 (or king) attacked by the piece standing on sq
function forkTargets(fen, sq){
  const g=grid(fen); const [r,f]=sqRF(sq); const p=g[r][f]; if (!p) return [];
  const opp=p.c==="w"?"b":"w";
  return attacksFrom(g,r,f).map(([a,b])=>({p:g[a][b],sq:rfSq(a,b)})).filter(x=>x.p&&x.p.c===opp&&(x.p.t==="k"||VAL[x.p.t]>=3)&&(x.p.t==="k"||VAL[x.p.t]>VAL[p.t]||!attackersOf(g,...sqRF(x.sq),opp).length));
}
function nullMoveFen(fen){ const p=fen.split(" "); p[1]=p[1]==="w"?"b":"w"; p[3]="-"; return p.join(" "); }
async function threatOf(fen){ // what would the opponent play if it were their move again
  const f2=nullMoveFen(fen); const t=new Chess(); if (!t.load(f2) || new Chess(fen).in_check()) return null;
  const r=await Engine.analyse(f2,{depth:12,movetime:250}); if (!r||!r.best) return null;
  return {u:r.best, san:pvToSan(f2,[r.best],1)[0], cp:scoreOf(r.top), pv:r.top?r.top.pv:[]};
}

/* ============ explain one move ============ */
// evB: analysis of fenBefore (mover to move); evA: analysis of fen after (opponent to move); returns {cat, text, arrows}
async function explainMove(fenBefore, mv, evB, evA, opts={}){
  const me=mv.color, opp=me==="w"?"b":"w";
  const fenAfter=(()=>{ const g=new Chess(fenBefore); g.move(mv.san); return g.fen(); })();
  const bestSan = evB&&evB.best ? pvToSan(fenBefore,[evB.best],1)[0] : null;
  const arrows=[{from:mv.from,to:mv.to,color:"rgba(228,91,69,.9)"}];
  if (evB&&evB.best) arrows.push({from:evB.best.slice(0,2),to:evB.best.slice(2,4),color:"rgba(129,182,76,.95)"});
  const pvB = evB&&evB.pv||[], pvA = evA&&evA.pv||[];
  const replyU = pvA[0]; const replySan = replyU ? pvToSan(fenAfter,[replyU],1)[0] : null;
  // mates
  if (evB && evB.mate>0) return {cat:"missedMate", text:`Имаше мат в ${evB.mate}: ${sanLine(fenBefore, pvToSan(fenBefore,pvB,Math.min(7,evB.mate*2-1)))}.`, arrows};
  if (evA && evA.mate>0) return {cat:"allowedMate", text:`Този ход позволява мат: ${sanLine(fenAfter, pvToSan(fenAfter,pvA,Math.min(7,evA.mate*2-1)))}. Провери шаховете на противника преди хода.`, arrows:[arrows[0], ...(replyU?[{from:replyU.slice(0,2),to:replyU.slice(2,4),color:"rgba(228,91,69,.9)"}]:[])]};
  const lost = -lineSwing(fenAfter, pvA, me, 4);
  if (lost>=2 && replyU){
    const ga=new Chess(fenAfter); const rep=ga.move({from:replyU.slice(0,2),to:replyU.slice(2,4),promotion:replyU[4]});
    const replyArrow={from:replyU.slice(0,2),to:replyU.slice(2,4),color:"rgba(228,91,69,.9)"};
    if (rep && rep.captured){
      const vsq=rep.to, vt=rep.captured;
      if (vsq===mv.to) return {cat:"hangMoved", text:`Премести ${PACC[vt]} на ${vsq}, където не е в безопасност. Противникът отговаря с ${replySan} и печели материал.`, arrows:[arrows[0],replyArrow]};
      const gb=grid(fenBefore); const [fr,ff]=sqRF(mv.from); const [vr,vf]=sqRF(vsq);
      const defendedBefore = attacksFrom(gb,fr,ff).some(([a,b])=>a===vr&&b===vf);
      if (defendedBefore) return {cat:"removedDefender", text:`${capFirst(PNOM[mv.piece])} пазеше ${PACC[vt]} на ${vsq}. Ходът махна тази защита и следва ${replySan}.`, arrows:[arrows[0],replyArrow]};
      const th = opts.threat!==undefined ? opts.threat : await threatOf(fenBefore);
      if (th && th.u===replyU) return {cat:"ignoredThreat", text:`Противникът заплашваше ${th.san}. Ходът ти не спира заплахата. Първият въпрос преди всеки ход: какво иска противникът?`, arrows:[arrows[0],replyArrow]};
      return {cat:"hangOther", text:`${capFirst(PNOM[vt])} на ${vsq} е без достатъчна защита. Противникът отговаря с ${replySan} и печели материал.`, arrows:[arrows[0],replyArrow]};
    }
    if (rep){
      const ft=forkTargets(ga.fen(), rep.to);
      if (ft.length>=2) return {cat:"allowedFork", text:`Позволи вилица: ${replySan} напада едновременно ${ft.map(x=>PACC[x.p.t]+" на "+x.sq).join(" и ")}.`, arrows:[arrows[0],replyArrow]};
    }
    const th = opts.threat!==undefined ? opts.threat : await threatOf(fenBefore);
    if (th && th.u===replyU) return {cat:"ignoredThreat", text:`Противникът заплашваше ${th.san}. Ходът ти не спира заплахата.`, arrows:[arrows[0],replyArrow]};
    return {cat:"allowedTactic", text:`Противникът има удар: ${sanLine(fenAfter, pvToSan(fenAfter,pvA,4))} и печели материал.`, arrows:[arrows[0],replyArrow]};
  }
  const gain = lineSwing(fenBefore, pvB, me, 4);
  if (gain>=2 && evB && evB.best){
    const gb=new Chess(fenBefore); const bm=gb.move({from:evB.best.slice(0,2),to:evB.best.slice(2,4),promotion:evB.best[4]});
    if (bm && bm.captured){ const [r,f]=sqRF(bm.to); if (!attackersOf(grid(fenBefore),r,f,opp).length) return {cat:"missedFree", text:`Можеше да вземеш ${PACC[bm.captured]} на ${bm.to} безплатно с ${bestSan}.`, arrows}; }
    if (bm){ const ft=forkTargets(gb.fen(), bm.to); if (ft.length>=2) return {cat:"missedFork", text:`Пропусна вилица: ${bestSan} напада ${ft.map(x=>PACC[x.p.t]+" на "+x.sq).join(" и ")}.`, arrows}; }
    return {cat:"missedTactic", text:`Пропусна удар: ${sanLine(fenBefore, pvToSan(fenBefore,pvB,4))} печели материал.`, arrows};
  }
  if ((opts.loss||0)>=12){
    const gb=new Chess(fenBefore); const bm = evB&&evB.best ? gb.move({from:evB.best.slice(0,2),to:evB.best.slice(2,4),promotion:evB.best[4]}) : null;
    if (bm && (bm.captured || bm.san.includes("+")) && (gain>=1 || bm.san.includes("+") && !replyU)) return {cat:"missedTactic", text:`Пропусна силно продължение: ${sanLine(fenBefore, pvToSan(fenBefore,pvB,4))}.`, arrows};
    if (replyU) return {cat:"allowedTactic", text:`Противникът има силен отговор: ${sanLine(fenAfter, pvToSan(fenAfter,pvA,4))}. Преди хода провери шаховете, взиманията и заплахите на противника.`, arrows:[arrows[0],{from:replyU.slice(0,2),to:replyU.slice(2,4),color:"rgba(228,91,69,.9)"}]};
  }
  const ph=phaseOf(fenBefore, opts.ply||0);
  const hint = ph==="o" ? "В дебюта мисли за център, развитие и рокада." : ph==="e" ? "В ендшпила активирай царя и бутай проходните пешки." : "Намери най-лошо поставената си фигура и план за нея.";
  return {cat:"positional", text:`По-добре беше ${bestSan||"друг ход"}. ${hint}`, arrows};
}

/* ============ habits ============ */
const HABITS = {
  rush:{t:"Бързаш с ходовете", why:"Грешките, направени за секунди, са най-лесни за избягване.", fix:"Преди всеки ход: шахове, взимания, заплахи. Отделяй поне 10 секунди в критичните позиции.", act:["Урок: Проверка преди всеки ход","lesson--safe-check"]},
  hang:{t:"Оставяш фигури без защита", why:"Това е причината номер едно за загубени партии на начинаещо ниво.", fix:"Преди всеки ход провери: коя моя фигура е нападната или незащитена? Включи проверката за грешки при игра.", act:["Пъзели: Незащитена фигура","puzzle--hangingPiece"]},
  threat:{t:"Не виждаш заплахите на противника", why:"Играеш своя план, но пропускаш какво иска противникът с последния си ход.", fix:"Първият въпрос преди всеки ход: какво заплашва противникът? Ползвай бутона „Каква е заплахата?“.", act:["Пъзели: Защитен ход","puzzle--defensiveMove"]},
  tactic:{t:"Пропускаш удари", why:"Противникът ти дава шанс да спечелиш материал, а ти не го виждаш.", fix:"Търси шахове, взимания и заплахи за себе си при всеки ход. Решавай пъзели всеки ден.", act:["Пъзели: Вилица","puzzle--fork"]},
  mate:{t:"Мат: пропуснат или допуснат", why:"Матът решава партията веднага.", fix:"Провери шаховете за двете страни, особено около царя. Тренирай мат в 1 и 2.", act:["Пъзели: Мат в 2","puzzle--mateIn2"]},
  punish:{t:"Не наказваш грешките на противника", why:"Когато противникът сгреши, най-силният ход често е очевиден, но лесно се пропуска.", fix:"След всеки ход на противника питай: какво остави без защита?", act:["Пъзели: Незащитена фигура","puzzle--hangingPiece"]},
  positional:{t:"Позиционни неточности", why:"Ходове без план бавно влошават позицията.", fix:"Подобрявай най-лошата си фигура и следи плана от дебюта.", act:["Основи на дебюта","course--basics"]},
  earlyQueen:{t:"Изкарваш дамата твърде рано", why:"Ранната дама става мишена и губиш време в дебюта.", fix:"Първо коне и офицери, после дамата. Мини урока „Не бързай с дамата“.", act:["Урок: Трите принципа","learn--bas-italian"]},
  samePiece:{t:"Местиш една фигура много пъти в дебюта", why:"Всеки повторен ход е темп, в който противникът се развива.", fix:"Правило: в първите 10 хода всяка фигура по веднъж, освен ако няма тактика.", act:["Урок: Трите принципа","learn--bas-italian"]},
  lateCastle:{t:"Рокираш късно", why:"Царят в центъра е лесна мишена, щом центърът се отвори.", fix:"Целта е рокада до 8-10-ия ход.", act:["Урок: Трите принципа","learn--bas-italian"]},
  kingWalk:{t:"Губиш правото на рокада", why:"Ранен ход с царя оставя топовете затворени и царя открит.", fix:"Не мести царя в дебюта, освен ако не е форсирано.", act:["Урок: Мат на Легал","learn--bas-legal"]},
  weakKing:{t:"Отслабваш пешките пред царя", why:"Ходове като f3/f6 и g4/g5 рано отварят линии към царя.", fix:"Не мести f- и g-пешките в дебюта без конкретна причина.", act:["Урок: Мат на глупака","learn--bas-fools"]},
  slowDev:{t:"Бавно развитие", why:"Фигурите на изходните полета не участват в играта.", fix:"До 10-ия ход изкарай двата коня и двата офицера.", act:["Курс: Основи на дебюта","course--basics"]},
  manyPawns:{t:"Твърде много пешечни ходове в дебюта", why:"Пешечните ходове не развиват фигури и създават слабости.", fix:"В дебюта: 2-3 пешечни хода за център, после фигури.", act:["Урок: Трите принципа","learn--bas-italian"]},
};
const CAT_HABIT = {hangMoved:"hang",hangOther:"hang",removedDefender:"hang",ignoredThreat:"threat",allowedFork:"threat",allowedTactic:"threat",missedTactic:"tactic",missedFork:"tactic",missedFree:"tactic",missedMate:"mate",allowedMate:"mate",positional:"positional"};
const CAT_LABEL = {book:"Излизане от репертоара",hangMoved:"Незащитена фигура",hangOther:"Незащитена фигура",removedDefender:"Махна защитата",ignoredThreat:"Пропусната заплаха",allowedFork:"Допусната вилица",allowedTactic:"Допуснат удар",missedTactic:"Пропуснат удар",missedFork:"Пропусната вилица",missedFree:"Безплатна фигура",missedMate:"Пропуснат мат",allowedMate:"Допуснат мат",positional:"Позиционна грешка"};
function openingHabits(fens, moves, uc){
  const found=new Set(); const minorsHome = uc==="w" ? {b1:"n",g1:"n",c1:"b",f1:"b"} : {b8:"n",g8:"n",c8:"b",f8:"b"};
  let userN=0, pawnMoves=0, castled=false; const movedFrom=new Set(); const curSq={};
  for (let j=0;j<moves.length;j++){
    const m=moves[j]; if (m.color!==uc) continue; userN++;
    const inCheck = new Chess(fens[j]).in_check();
    const cap = !!m.captured;
    if (m.flags.includes("k")||m.flags.includes("q")) castled=true;
    if (userN<=5 && m.piece==="q" && !cap && !inCheck) found.add("earlyQueen");
    if (userN<=8 && m.piece!=="p" && m.piece!=="k" && !cap && !inCheck && movedFrom.has(m.from)){
      const g=grid(fens[j]); const home=Object.entries(minorsHome).filter(([s,t])=>{ const [r,f]=sqRF(s); const p=g[r][f]; return p&&p.c===uc&&p.t===t; }).length;
      if (home>=2) found.add("samePiece");
    }
    if (m.piece!=="p") movedFrom.add(m.to);
    if (userN<=15 && m.piece==="k" && !m.flags.includes("k") && !m.flags.includes("q") && !inCheck && !castled){ const homeK = uc==="w"?"e1":"e8"; if (m.from===homeK) found.add("kingWalk"); }
    if (userN<=8 && m.piece==="p" && !cap && !castled && ((uc==="w"&&(m.to==="f3"||m.to==="g4"))||(uc==="b"&&(m.to==="f6"||m.to==="g5")))) found.add("weakKing");
    if (userN<=10 && m.piece==="p") pawnMoves++;
    if (userN===10){
      const g=grid(fens[j+1]||fens[j]); const home=Object.entries(minorsHome).filter(([s,t])=>{ const [r,f]=sqRF(s); const p=g[r][f]; return p&&p.c===uc&&p.t===t; }).length;
      if (home>=2) found.add("slowDev");
    }
    if (userN===12 && !castled){ const g=grid(fens[j+1]||fens[j]); const [r,f]=sqRF(uc==="w"?"e1":"e8"); const k=g[r][f]; if (k&&k.t==="k") found.add("lateCastle"); }
  }
  if (pawnMoves>=7) found.add("manyPawns");
  return [...found];
}

/* ============ full game analysis ============ */
const CLS = {best:{l:"Най-добър",c:"best"},exc:{l:"Отличен",c:"good"},good:{l:"Добър",c:"good"},inacc:{l:"Неточност",c:"inacc",m:"?!"},mist:{l:"Грешка",c:"mist",m:"?"},blun:{l:"Груба грешка",c:"blun",m:"??"},miss:{l:"Пропусната възможност",c:"miss",m:"?"}};
function classify(loss, isBest){ if (isBest) return "best"; if (loss<2) return "exc"; if (loss<6) return "good"; if (loss<12) return "inacc"; if (loss<25) return "mist"; return "blun"; }
async function analyseGame(game, onProgress){
  const start=game.start||new Chess().fen(); const g=new Chess(start); const fens=[g.fen()]; const moves=[];
  for (const s of game.sans){ const m=g.move(s,{sloppy:true}); if(!m) break; moves.push(m); fens.push(g.fen()); }
  const ev=[];
  for (let i=0;i<fens.length;i++){
    const t=new Chess(fens[i]);
    if (t.in_checkmate()) ev.push({cp:-10000,mate:null,best:null,pv:[]});
    else if (t.game_over()) ev.push({cp:0,mate:null,best:null,pv:[]});
    else { const r=await Engine.analyse(fens[i],{depth:16,movetime:450}); if (!r) return null; ev.push({cp:scoreOf(r.top), mate:r.top?r.top.mate:null, best:r.best, pv:r.top?r.top.pv:[]}); }
    onProgress && onProgress(i+1, fens.length);
  }
  const cw = ev.map((e,i)=> fens[i].split(" ")[1]==="w" ? e.cp : -e.cp);
  const cls=[], loss=[], acc={w:[],b:[]}, txt={}, cat={};
  const phase={o:[0,0],m:[0,0],e:[0,0]};
  for (let j=0;j<moves.length;j++){
    const m=moves[j], c=m.color; const pov = v => c==="w"? v : -v;
    const wb=winPct(pov(cw[j])), wa=winPct(pov(cw[j+1]));
    const isBest = ev[j].best===uciOf(m); const l = isBest?0:Math.max(0,wb-wa);
    let k=classify(l,isBest);
    if (j>0 && (cls[j-1]==="mist"||cls[j-1]==="blun") && l>=10 && k!=="blun") k="miss";
    cls.push(k); loss.push(Math.round(l*10)/10); const a=moveAccuracy(l); acc[c].push(a);
    if (c===game.uc){ const ph=phaseOf(fens[j], j); phase[ph][0]+=a; phase[ph][1]++; }
  }
  for (let j=0;j<moves.length;j++){
    if (moves[j].color!==game.uc) continue; const k=cls[j]; if (!(k==="mist"||k==="blun"||k==="miss")) continue;
    const ex=await explainMove(fens[j], moves[j], ev[j], ev[j+1], {ply:j, loss:loss[j]}); if (ex===null) return null;
    let text=ex.text; if (k==="miss") text="Противникът сгреши на предишния ход, но ти не го наказа. "+text;
    txt[j]=text; cat[j]= k==="miss" ? "punish" : (CAT_HABIT[ex.cat]||"positional");
    cat[j+"c"]=ex.cat;
  }
  const mean=a=>a.length? a.reduce((x,y)=>x+y,0)/a.length : 0;
  const cnt={inacc:0,mist:0,blun:0}; moves.forEach((m,j)=>{ if (m.color===game.uc){ if (cls[j]==="inacc") cnt.inacc++; if (cls[j]==="mist"||cls[j]==="miss") cnt.mist++; if (cls[j]==="blun") cnt.blun++; } });
  const habitsCount={}; Object.entries(cat).forEach(([k,v])=>{ if (!k.endsWith("c")) habitsCount[v]=(habitsCount[v]||0)+1; });
  openingHabits(fens, moves, game.uc).forEach(hk=>habitsCount[hk]=(habitsCount[hk]||0)+1);
  game.an = {cw:cw.map(v=>Math.round(Math.max(-10000,Math.min(10000,v)))), best:ev.map(e=>e.best||""), cls, loss, txt, cat};
  game.sum = {acc:Math.round(mean(acc[game.uc])), accOpp:Math.round(mean(acc[game.uc==="w"?"b":"w"])), cnt, phase:{o:phase.o[1]?Math.round(phase.o[0]/phase.o[1]):null, m:phase.m[1]?Math.round(phase.m[0]/phase.m[1]):null, e:phase.e[1]?Math.round(phase.e[0]/phase.e[1]):null}, habits:habitsCount};
  // add the user's real mistakes to the personal deck
  S.mist = S.mist || [];
  for (const [j,text] of Object.entries(txt)){
    const jj=+j; if (!ev[jj].best) continue; const id=game.id+"-"+jj; if (S.mist.some(x=>x.id===id)) continue;
    S.mist.push({id, gid:game.id, ply:jj, fen:fens[jj], best:ev[jj].best, bcp:ev[jj].cp, san:moves[jj].san, cat:cat[jj+"c"]||"", text, box:0, due:Date.now()});
  }
  if (S.mist.length>250){ S.mist.sort((a,b)=>(b.box||0)-(a.box||0)); S.mist=S.mist.slice(S.mist.length-250); }
  return game;
}
function saveGame(game){
  S.games = S.games || []; const i=S.games.findIndex(x=>x.id===game.id); if (i>=0) S.games[i]=game; else S.games.unshift(game);
  if (S.games.length>40) S.games.length=40;
  markDay(); save();
}

/* ============ profile ============ */
function profile(){
  const games=(S.games||[]).filter(g=>g.sum).slice(0,15);
  const n=games.length; const freq={};
  games.forEach(g=>Object.keys(g.sum.habits||{}).forEach(k=>freq[k]=(freq[k]||0)+1));
  const weight={hang:3,mate:3,threat:2.5,tactic:2.2,punish:2,earlyQueen:1.5,kingWalk:1.5,lateCastle:1.3,samePiece:1.2,weakKing:1.2,slowDev:1.2,manyPawns:1,positional:.6};
  const habits=Object.entries(freq).map(([k,c])=>({k,c,score:c*(weight[k]||1)})).sort((a,b)=>b.score-a.score);
  const acc=games.map(g=>g.sum.acc).reverse();
  const ph={o:[],m:[],e:[]}; games.forEach(g=>{ for (const k of ["o","m","e"]) if (g.sum.phase[k]!=null) ph[k].push(g.sum.phase[k]); });
  const avg=a=>a.length? Math.round(a.reduce((x,y)=>x+y,0)/a.length) : null;
  const blunders = n ? (games.reduce((a,g)=>a+g.sum.cnt.blun,0)/n) : null;
  const themes=Object.entries(S.puz.theme||{}).filter(([t,a])=>a[1]>=4 && THEME_BG[t] && !["short","long","opening","middlegame","endgame"].includes(t)).map(([t,a])=>({t, pct:Math.round(a[0]/a[1]*100), n:a[1]})).sort((a,b)=>a.pct-b.pct);
  return {n, habits, acc, accAvg:avg(acc.slice(-10)), phase:{o:avg(ph.o),m:avg(ph.m),e:avg(ph.e)}, blunders, themes};
}
function focusTheme(p){
  p = p || profile();
  const map={hang:"hangingPiece",threat:"defensiveMove",tactic:"fork",mate:"mateIn2",punish:"hangingPiece",positional:"quietMove"};
  for (const hb of p.habits) if (map[hb.k]) return map[hb.k];
  if (p.themes.length && p.themes[0].pct<70) return p.themes[0].t;
  if (p.phase.e!=null && p.phase.e < Math.min(p.phase.o||100, p.phase.m||100)-5) return "endgame";
  return "fork";
}
function todayCounter(){ if (!S.today || S.today.d!==today()) S.today={d:today(), lines:0, puz:0, fix:0, games:0}; return S.today; }
function bump(k){ const t=todayCounter(); t[k]=(t[k]||0)+1; }
function mistDue(){ return (S.mist||[]).filter(x=>x.due<=Date.now()); }

/* ============ Claude coach (optional) ============ */
let samplePromise=null;
function getSample(){ if (!samplePromise) samplePromise = (window.claude && claude.use) ? claude.use("sample").catch(()=>null) : Promise.resolve(null); return samplePromise; }
const COACH_RULES = "Ти си търпелив шахматен треньор. Ученикът е възрастен любител (рейтинг около {R}). Пиши на български, на прост и ясен език, без излишни думи. Използвай алгебрична нотация (SAN, напр. Nf3, exd5). Не използвай дълго тире, само обикновено тире '-'. Ползвай оценката от двигателя като факт, но обяснявай ИДЕИТЕ: какво заплашва, коя фигура е слаба, какъв е планът. До 140 думи.";
async function coachInto(out, btn, task){
  const sample = await getSample();
  if (!sample){ out.textContent="Треньорът Claude не е достъпен в този изглед."; return; }
  const ctl = new AbortController(); btn && (btn.disabled=true);
  out.textContent = "Треньорът мисли...";
  try {
    await sample(COACH_RULES.replace("{R}", Math.round(S.puz.rating)) + "\n\n" + task, {signal:ctl.signal, onText:({text})=>{ out.textContent=text.replace(/—/g,"-"); }});
  } catch(e){
    if (e && e.text) out.textContent = e.text;
    else out.textContent = ({not_granted:"Не е разрешено използване на Claude.", rate_limited:"Твърде много въпроси. Опитай след малко."}[e&&e.code]) || "Треньорът не успя да отговори. Опитай отново.";
  } finally { btn && (btn.disabled=false); }
}
function coachCard(getTask, label="Попитай треньора"){
  const out=h("div",{class:"coach muted"});
  const btn=h("button",{class:"btn sm",onclick:()=>coachInto(out,btn,getTask())},label);
  const card=h("div",{class:"card stack",hidden:true}, h("div",{class:"row"}, h("span",{class:"eyebrow"},"Треньор Claude"), h("span",{style:"flex:1"}), btn), out);
  getSample().then(s=>{ if (s) card.hidden=false; });
  return card;
}

