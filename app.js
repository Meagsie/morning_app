/* ============================================================
   The Life I'm Building — a calm personal operating system.
   All data lives on this device only. No accounts, no servers.
   ============================================================ */

/* ---------- storage ---------- */
const DB = {
  get(k, fb){ try{ const v = localStorage.getItem('intotheday:'+k); return v===null ? fb : JSON.parse(v); }catch(e){ return fb; } },
  set(k, v){ try{ localStorage.setItem('intotheday:'+k, JSON.stringify(v)); }catch(e){ console.error('save failed', k, e); } },
  del(k){ try{ localStorage.removeItem('intotheday:'+k); }catch(e){} }
};
if(navigator.storage && navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); }
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js').catch(()=>{}); });
}

/* ---------- tiny helpers ---------- */
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function dateKey(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function prettyDate(){ return new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'}); }
function hourNow(){ return new Date().getHours(); }
function uid(){ return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function weekDates(offset){
  if(offset===undefined) offset=0;
  const d=new Date(); const day=(d.getDay()+6)%7;
  const mon=new Date(d); mon.setDate(d.getDate()-day+offset*7); mon.setHours(0,0,0,0);
  const out=[]; for(let i=0;i<7;i++){ const x=new Date(mon); x.setDate(mon.getDate()+i); out.push(dateKey(x)); }
  return out;
}
function fortnightKey(){ return 'f'+Math.floor(Date.now()/(1000*60*60*24*14)); }
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('on');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'), 2600);
}

/* ---------- identity lines (one greets you each day) ---------- */
const IDENTITIES = [
  'I am someone who gets out of bed and starts the day.',
  'I am someone who protects her mornings.',
  'I am someone who moves for strength, not punishment.',
  'I am someone who stretches because her body needs care.',
  'I am someone who returns to the water.',
  'I am someone who uses the pool that is already in her building.',
  'I am someone who builds strength slowly and consistently.',
  'I am someone who recovers after demanding workdays.',
  'I am someone who protects her evenings.',
  'I am someone who sketches and notices beauty.',
  'I am someone who captures ideas before they disappear.',
  'I am someone who makes her small apartment support her life.',
  'I am someone who looks at her money instead of avoiding it.',
  'I am someone who plans joy, not just responsibilities.',
  'I am someone who parks tomorrow before bed.',
  'I am someone who builds a future beyond survival.',
  'I am someone who comes back after a bad day.',
  'I am someone who builds self-trust through small repeated actions.'
];
/* ---------- personal constitution ----------
   Placeholder articles drawn from our conversation. They are meant to be
   replaced with the real articles from Megan's own constitution project —
   editable in-app on the "My Constitution" screen. Each article's `ev`
   lists the habit ids that count as evidence toward it, so every tick
   quietly builds the identity it belongs to. */
const DEFAULT_CONSTITUTION = [
  {id:'mornings', text:'I protect my mornings. I get up and start the day before the phone decides it.', ev:['noscroll']},
  {id:'body', text:'I care for my body. I move for strength and ease, never punishment.', ev:['mstretch','stretch','reset','legsup','hips','winddown','strength']},
  {id:'water', text:'I return to the water. I use the pool that is already in my building.', ev:['swim']},
  {id:'land', text:'I let work end. I land, recover, and protect my evenings.', ev:['land']},
  {id:'create', text:'I notice beauty and sketch ideas before they disappear. I am building my eye.', ev:['sketch','notice','homeidea']},
  {id:'money', text:'I look at the number. Money is information, not fear.', ev:['money','moneyweek']},
  {id:'joy', text:'I plan joy on purpose. A life is more than its responsibilities.', ev:['joy']},
  {id:'park', text:'I park tomorrow before bed. I do not carry it into sleep.', ev:['close','park']},
  {id:'return', text:'I come back after a bad day. Missing once is human; returning is who I am.', ev:['returned']},
  {id:'trust', text:'I build self-trust through small, repeated, real actions.', ev:[]}
];
function identityToday(){
  const arts = (S.constitution && S.constitution.length) ? S.constitution : null;
  const d=new Date();
  const doy=Math.floor((d - new Date(d.getFullYear(),0,0))/86400000);
  if(arts) return arts[doy % arts.length].text;
  return IDENTITIES[doy % IDENTITIES.length];
}

/* ---------- tone ---------- */
function tone(v){ // v = {soft, direct, firm}
  const t=(S.settings.tone)||'firm';
  return v[t] || v.firm || v.direct || v.soft;
}

/* ---------- default habits (Habit Design sample data) ---------- */
const DEFAULT_HABITS = [
  {id:'noscroll', area:'Morning', name:'Get out of bed without scrolling',
   identity:'I am someone who protects her mornings.',
   cue:'Waking up', stack:'When I wake up, I will sit up and put my feet on the floor.',
   tiny:'Sit up and put feet on the floor.', full:'Get up, drink water, open curtains, start the day.',
   low:'Sit up. That is all for now.', recovery:'If I have already scrolled, notice it and stand up now.',
   env:'Put the phone across the room before bed.', done:'You interrupted the scroll. That counts.'},
  {id:'mstretch', area:'Morning', name:'Morning stretch',
   identity:'I am someone who cares for her body before the day takes over.',
   cue:'Making coffee', stack:'When I make coffee, I will stretch for five minutes.',
   tiny:'One stretch.', full:'Five to ten minutes of mobility.',
   low:'Stretch while sitting on the edge of the bed.', recovery:'Stretch after shower or before leaving.',
   env:'Leave the stretch mat visible.', done:'Your body gets a say in the morning too.'},
  {id:'stretch', area:'Body care', name:'Evening stretch',
   identity:'I am someone who gives her body something back after work.',
   cue:'Getting home', stack:'When I get home from work, I will change clothes before my phone.',
   tiny:'One hip or hamstring stretch.', full:'Fifteen minutes of stretching.',
   low:'Legs up the wall for two minutes.', recovery:'One stretch before bed.',
   env:'Leave the stretch mat where I can see it from the couch.', done:'This is care, not punishment.'},
  {id:'legsup', area:'Body care', name:'Legs up the wall',
   identity:'I am someone who lets her nervous system land.',
   cue:'Feeling wrung out', stack:'When I feel too tired to stretch, I will do legs up the wall.',
   tiny:'Two minutes.', full:'Ten minutes.',
   low:'Lie down and breathe.', recovery:'Lie down and breathe.',
   env:'Keep a clear patch of wall by the bed.', done:'You are allowed to land.'},
  {id:'swim', area:'Swim & strength', name:'Swim downstairs',
   identity:'I am someone who returns to the water.',
   cue:'Bathers where I can see them', stack:'When I want to swim, I will put bathers on and go downstairs.',
   tiny:'Put bathers on and go downstairs.', full:'Go downstairs and swim.',
   low:'Get in the water for ten minutes.', recovery:'Put towel and bathers where I can see them, and choose the next swim time.',
   env:'Pack the swim bag the night before and leave it by the door.', done:'You got in the water. That counts.'},
  {id:'strength', area:'Swim & strength', name:'Gym downstairs',
   identity:'I am someone who builds strength slowly.',
   cue:'Gym clothes visible', stack:'When I want to use the gym, I will go downstairs and do one set.',
   tiny:'Go downstairs and do one set.', full:'A simple strength session in the building gym.',
   low:'One machine, one exercise, or five minutes.', recovery:'Put gym clothes where I can see them.',
   env:'Leave gym clothes and shoes out where I can see them.', done:'One set is still a vote for strength.'},
  {id:'land', area:'After work', name:'Land after work',
   identity:'I am someone who lets work end.',
   cue:'Walking in the front door', stack:'When I get home from work, I will change clothes and land.',
   tiny:'Change clothes.', full:'Change clothes, drink water, eat or shower, stretch or rest.',
   low:'Sit down without scrolling for two minutes.', recovery:'Choose one kind, useful action.',
   env:'Leave comfortable clothes out before leaving for work.', done:'You are allowed to land.'},
  {id:'close', area:'Evening', name:"Choose tomorrow's top 3",
   identity:'I am someone who parks tomorrow before bed.',
   cue:'Brushing teeth', stack:"After I brush my teeth, I will choose tomorrow's top 3.",
   tiny:'Choose one priority.', full:'Choose top 3 priorities and the first tiny action.',
   low:'Write down what is still in my head.', recovery:"Park everything and choose only tomorrow's first action.",
   env:"Write the first priority where I'll see it in the morning.", done:'Tomorrow is held. You do not have to hold it in bed.'},
  {id:'park', area:'Evening', name:'Parking lot',
   identity:'I am someone who captures thoughts instead of carrying them.',
   cue:'Tomorrow circling in my head', stack:'When tomorrow is circling in my head, I will open the parking lot and park it.',
   tiny:'Add one thought.', full:'Add thoughts and sort them into tomorrow, later, or not urgent.',
   low:'Dump everything without sorting.', recovery:'Add one thing and close the app.',
   env:'Keep the app on the first home-screen page.', done:'Captured means you can stop holding it.'},
  {id:'sketch', area:'Creative', name:'Five-minute sketch',
   identity:'I am someone who sketches ideas before they disappear.',
   cue:'Saving an inspiration image', stack:'When I save an interiors image, I will sketch one detail.',
   tiny:'One line or shape.', full:'Five to twenty minutes sketching.',
   low:'One line. Really.', recovery:'Save one reference and write one note.',
   env:'Leave the sketchbook open on the table, pencil on top.', done:'You are building your eye.'},
  {id:'notice', area:'Creative', name:'Notice beauty',
   identity:'I am someone who notices materials, plants, light and spaces.',
   cue:'Walking anywhere', stack:'When something catches my eye, I will capture it before it disappears.',
   tiny:'Photograph one texture, shadow, tile or plant.', full:'Capture and describe one idea.',
   low:'Just look at it properly for ten seconds.', recovery:'Write one sentence about something you noticed.',
   env:'Keep the camera on the lock screen.', done:'Noticing is part of the work.'},
  {id:'homeidea', area:'Home', name:'Home idea capture',
   identity:'I am someone who makes her home support her life.',
   cue:'Something at home annoys me', stack:'When something at home annoys me, I will note it instead of stewing.',
   tiny:'Note one annoyance or idea.', full:'Sketch or save one apartment improvement.',
   low:'One word is enough to hold it.', recovery:'Add one bathroom, lighting or storage idea.',
   env:'Keep the home ideas list one tap away.', done:'You captured it. You do not have to solve it today.'},
  {id:'money', area:'Money', name:'Money check',
   identity:'I am someone who looks at the number.',
   cue:'Feeling anxious about money', stack:'When I feel anxious about money, I will look at one actual number.',
   tiny:'Open one account and look.', full:'Check bills, mortgage, spending and upcoming payments.',
   low:'Look at the balance. Nothing else.', recovery:'Confirm only the bills and mortgage setup.',
   env:'Keep money notes in one place, not five.', done:'The number is information.'},
  {id:'moneyweek', area:'Money', name:'Weekly money calm',
   identity:'I am someone who chooses clarity over fear.',
   cue:'Weekly reset', stack:'When I do my weekly reset, I will choose one money action.',
   tiny:'Write down one upcoming payment.', full:'Review bills, mortgage, spending and savings.',
   low:'Choose one thing needing attention.', recovery:'Choose one thing needing attention.',
   env:'Put bills in one physical spot.', done:'Clarity first. Decisions second.'},
  {id:'joy', area:'Joy', name:'Plan one good thing',
   identity:'I am someone who puts joy into the week on purpose.',
   cue:'Feeling flat', stack:'When I feel flat, I will plan one small thing to look forward to.',
   tiny:'Write down one thing to look forward to.', full:'Plan one solo, social, creative or beautiful thing.',
   low:'Choose one small pleasure for tomorrow.', recovery:'Choose one small pleasure for tomorrow.',
   env:'Keep a visible joy list.', done:'This is part of having a life.'}
];

/* ---------- categories ---------- */
const PARK_CATS = ['Tomorrow','Later this week','Money','Home','Body','Family','Creative','Work thought','Joy idea','Not urgent'];
const CREATIVE_CATS = ['Interiors','Landscape ideas','Planting combinations','Materials','Colour','Lighting','Bathroom ideas','Storage ideas','Tile ideas','Mirror & light','Gardens to visit','Form & Foliage','Textures','Shadows','Small apartment','Courtyards'];
const HOME_CATS = ['Bathroom','Lighting','Storage','Tiles','Mirrors','Small apartment','Kitchen / dining','Bedroom','Calm home','Repairs','Inspiration','Budget thought','Future home'];
const JOY_CATS = ['Food','Gardens','Interiors','Art','Friends','Family','Home','Beauty','Learning','Nature','Tennis','Swimming','Solo time','Small adventures','Markets','Nurseries','Galleries','Books','Rest'];

/* ---------- seed sample data (first run only) ---------- */
function ensureSeed(){
  if(DB.get('seeded')) return;
  if(!DB.get('parking')) DB.set('parking', [
    {id:uid(), text:'Ring the strata about the bathroom fan', cat:'Home', done:false},
    {id:uid(), text:"Check the date of Mum's next appointment", cat:'Family', done:false},
    {id:uid(), text:'Electricity bill lands this fortnight', cat:'Money', done:false},
    {id:uid(), text:'That rostering thought — it can wait until my shift', cat:'Work thought', done:false},
    {id:uid(), text:'Look up what’s on at the NGV this month', cat:'Joy idea', done:false}
  ]);
  if(!DB.get('ideasCreative')) DB.set('ideasCreative', [
    {id:uid(), text:'Zellige tiles in eucalyptus green — bathroom splashback?', cat:'Tile ideas', date:todayStr()},
    {id:uid(), text:'Planting combo: correa, lomandra, silver spear — takes wind, soft movement', cat:'Planting combinations', date:todayStr()},
    {id:uid(), text:'The shadow the tram wires throw at dusk. Sketch it.', cat:'Shadows', date:todayStr()}
  ]);
  if(!DB.get('ideasHome')) DB.set('ideasHome', [
    {id:uid(), text:'Keep the big mirror — add a slim shelf under it and a warm sconce either side', cat:'Mirrors', date:todayStr()},
    {id:uid(), text:'Baskets under the bench for the linen overflow', cat:'Storage', date:todayStr()},
    {id:uid(), text:'Warm dimmable bulb for the hallway — the white one is hostile at 10pm', cat:'Lighting', date:todayStr()}
  ]);
  if(!DB.get('joyList')) DB.set('joyList', [
    {id:uid(), text:'Morning swim, then a proper coffee on Southbank Boulevard', cat:'Small adventures', done:false},
    {id:uid(), text:'Heide — gallery and the sculpture garden', cat:'Gardens', done:false},
    {id:uid(), text:'Early Saturday at Queen Vic Market', cat:'Markets', done:false},
    {id:uid(), text:'Book a tennis hit', cat:'Tennis', done:false}
  ]);
  if(!DB.get('moneyData')) DB.set('moneyData', {
    upcoming:[
      {id:uid(), name:'Electricity', amount:180, when:'This fortnight'},
      {id:uid(), name:'Council rates', amount:210, when:'Next month'},
      {id:uid(), name:'Phone', amount:49, when:'Monthly'}
    ],
    confirms:{}, looks:[], action:''
  });
  DB.set('seeded', 1);
}

/* ---------- state ---------- */
let S = {};
function loadState(){
  S.settings = Object.assign({
    name:'Megan', tone:'firm',
    workdays:['Wed','Thu','Fri','Sat','Sun'],
    resetDay:'Mon', reviewDay:1,
    bills:530, mortgage:800
  }, DB.get('settings', {}));
  S.habits = DB.get('habits', null) || DEFAULT_HABITS.map(h=>Object.assign({},h));
  S.tracking = DB.get('tracking', {});
  S.parking = DB.get('parking', []);
  S.ideasCreative = DB.get('ideasCreative', []);
  S.ideasHome = DB.get('ideasHome', []);
  S.joyList = DB.get('joyList', []);
  S.money = DB.get('moneyData', {upcoming:[],confirms:{},looks:[],action:''});
  S.weekly = DB.get('weekly', {});
  S.monthly = DB.get('monthly', {});
  S.constitution = DB.get('constitution', DEFAULT_CONSTITUTION.map(a=>Object.assign({},a)));
  S.planToday = DB.get('plan_today', null);
  S.planTomorrow = DB.get('plan_tomorrow', null);
}
function saveHabits(){ DB.set('habits', S.habits); }

/* ---------- day rollover ----------
   New day: last night's plan becomes today's, the day resets gently. */
function rollover(){
  const ds = DB.get('dayState', null);
  const today = todayStr();
  if(!ds || ds.date !== today){
    const plan = DB.get('plan_tomorrow', null);
    if(plan){ DB.set('plan_today', plan); DB.del('plan_tomorrow'); }
    S.day = {date:today, dayType:null, lowEnergy:false, morningDone:false, landed:false, closed:false, returned:false};
    // guess workday from settings
    const wd = new Date().toLocaleDateString('en-AU',{weekday:'short'});
    S.day.dayType = (S.settings.workdays||[]).includes(wd) ? 'work' : 'off';
    S.day.guessed = true;
    DB.set('dayState', S.day);
  } else {
    S.day = ds;
  }
  S.planToday = DB.get('plan_today', null);
  S.planTomorrow = DB.get('plan_tomorrow', null);
}
function saveDay(){ DB.set('dayState', S.day); }

/* ---------- kept promises (the day's collected achievements) ----------
   Every meaningful tick anywhere in the app lands here, so there is one
   place that fills up with evidence of what you did today. */
function keptKey(){ return 'kept:'+todayStr(); }
function keptToday(){ return DB.get(keptKey(), []); }
function markKept(id, label){
  const arr = keptToday();
  if(!arr.some(k=>k.id===id)){ arr.push({id, label: label||id}); DB.set(keptKey(), arr); return true; }
  return false;
}
function unmarkKept(id){ DB.set(keptKey(), keptToday().filter(k=>k.id!==id)); }

/* ---------- habit logging ---------- */
function logHabit(id, label){
  const t = todayStr();
  if(!S.tracking[t]) S.tracking[t] = {};
  S.tracking[t][id] = true;
  DB.set('tracking', S.tracking);
  if(label) markKept(id, label);
}
function loggedToday(id){ const t=S.tracking[todayStr()]; return !!(t && t[id]); }
function habit(id){ return S.habits.find(h=>h.id===id); }
function completeHabit(id, versionLabel){
  const h = habit(id);
  logHabit(id, h ? h.name : 'Kept a promise');
  toast(h ? h.done : 'That counts.');
  render();
}

/* ============================================================
   ROUTER
   ============================================================ */
const ROUTES = {};
function go(id){ location.hash = '#/'+id; }
function currentRoute(){
  const h = location.hash.replace(/^#\/?/, '');
  return ROUTES[h] ? h : 'home';
}
function render(){
  const r = currentRoute();
  document.getElementById('view').innerHTML = ROUTES[r]();
  window.scrollTo(0,0);
  if(r==='home') drawSprig();
}
window.addEventListener('hashchange', render);

function shead(title, intro){
  return `<div class="shead"><button class="back" onclick="go('home')"><span>&lsaquo;</span> Today</button></div>
    <h1 class="stitle">${esc(title)}</h1>
    ${intro?`<p class="sintro">${intro}</p>`:''}`;
}
function tickSvg(){ return '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#F3F5EC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }

/* ============================================================
   1. HOME / TODAY
   ============================================================ */
ROUTES.home = function(){
  const h = hourNow();
  const g = h<12 ? 'Good morning,' : h<17 ? 'Good afternoon,' : 'Good evening,';
  const plan = S.planToday;
  const things = (plan && plan.things || []).filter(t=>t && t.trim());
  const work = S.day.dayType==='work';

  // --- one clear next action ---
  const next = nextAction();

  // --- anchors: three quiet daily promises ---
  const anchors = weekPlanNow().anchors;

  let html = `
    <div class="date">${prettyDate()}${S.day.lowEnergy?' · tired day':''}</div>
    <h1 class="greet">${g} <em>${esc(S.settings.name)}</em></h1>
    <p class="identity" onclick="go('constitution')" style="cursor:pointer">${esc(identityToday())}</p>

    <div class="chips">
      <button class="chip ${work?'on':''}" onclick="setDayType('work')">Workday</button>
      <button class="chip ${!work?'on':''}" onclick="setDayType('off')">Day off</button>
      <button class="chip ${S.day.lowEnergy?'on':''}" onclick="toggleLowEnergy()">Low energy</button>
    </div>

    <div class="next-card">
      <div class="nk">The next small thing</div>
      <div class="nx">${next.text}</div>
      ${next.sub?`<div class="nsub">${next.sub}</div>`:''}
      <div class="btnrow">
        <button class="btn soft" onclick="go('${next.route}')">${esc(next.cta)}</button>
      </div>
    </div>`;

  if(things.length){
    html += `<div class="t-label">You already chose what matters today</div>
      <div class="focus"><ul>${things.map((t,i)=>`<li><span>${i+1}</span>${esc(t)}</li>`).join('')}</ul>
      ${plan.first?`<div class="first-action">First tiny action: <b>${esc(plan.first)}</b></div>`:''}
      </div>`;
  } else {
    html += `<div class="t-label">Today's focus</div>
      <div class="focus"><ul><li class="empty">Nothing chosen yet — tonight's Evening Close will set tomorrow up. For now, just take the next small thing.</li></ul></div>`;
  }

  // anchors
  html += `<div class="t-label">Today's anchors</div><div class="list">` +
    anchors.map((a,i)=>{
      const on = anchorDone(i);
      return `<div class="item ${on?'done':''}" onclick="toggleAnchor(${i})">
        <div class="tick">${tickSvg()}</div>
        <div class="txt"><div class="label">${esc(a)}</div></div>
      </div>`;
    }).join('') + `</div>`;

  // kept promises — the day's collected achievements, growing the sprig
  const keptList = keptToday();
  html += `<div class="sprig-wrap"><svg id="sprig" viewBox="0 0 120 150"></svg></div>`;
  if(keptList.length){
    html += `<p class="kept-count"><b>${keptList.length}</b> kept today · each one is evidence</p>
      <div class="list" style="margin-top:8px">` +
      keptList.map(k=>`<div class="item done"><div class="tick">${tickSvg()}</div><div class="txt"><div class="label">${esc(k.label)}</div></div></div>`).join('') +
      `</div>
      <p class="grid-note">This is how self-trust is built. Nothing here wilts.</p>`;
  } else {
    html += `<p class="grid-note">Tick anything today — an anchor, a stretch, a swim —<br>and it lands here as evidence, and grows the sprig.</p>`;
  }

  // sections hub
  const hub = [
    ['constitution','My Constitution','who I am becoming'],
    ['morning','Morning Start','feet on the floor first'],
    ['body','Body Care','stretch, mobility, recovery'],
    ['move','Swim & Strength','the pool is downstairs'],
    ['recover','After Work','you are allowed to land'],
    ['close','Evening Close','park tomorrow before bed'],
    ['parking','Parking Lot','stop carrying it'],
    ['creative','Creative Practice','sketch and notice'],
    ['homeideas','Home & Ideas','make the apartment yours'],
    ['joy','Joy Plan','plan something good'],
    ['moneycalm','Money Calm','the number is information'],
    ['weekly','Weekly Reset','a kind look at the week'],
    ['monthly','Monthly Review','the bigger picture'],
    ['habits','Habit Design','make it easier'],
    ['settings','Settings','make it yours']
  ];
  html += `<div class="t-label">Everything else</div><div class="hub">` +
    hub.map(x=>`<a href="#/${x[0]}"><div class="hname">${x[1]}</div><div class="hsub">${x[2]}</div></a>`).join('') +
    `</div>
    <button class="btn ghost wide" onclick="openReset()">Reset me — I'm stuck</button>
    <p class="footer-note">This app never asks how far behind you are.<br>Only: what is the next small thing?</p>`;
  return html;
};

function nextAction(){
  const h = hourNow(), work = S.day.dayType==='work', low = S.day.lowEnergy;
  if(h<11 && !S.day.morningDone)
    return {text: low ? 'Sit up. That is all for now.' : 'Feet on the floor. Then water.',
            sub:"Don't negotiate with the scroll.", route:'morning', cta:'Morning Start'};
  if(h<11 && !work && !loggedToday('swim') && !low)
    return {text:'The pool is already downstairs.', sub:'Bathers on. That is the whole first step.', route:'move', cta:'Swim & Strength'};
  if(h>=11 && h<16)
    return {text: work ? 'Two minutes: posture and breath.' : (low ? 'One stretch. Or just lie on the floor.' : 'Twenty minutes for something of yours — a sketch, the pool, a corner of the apartment.'),
            sub: work ? 'Release the shoulders before service takes them.' : 'This is the life part of the day.', route: work?'body':'creative', cta: work?'Body Care':'Creative Practice'};
  if(h>=16 && h<20 && work && !S.day.landed)
    return {text:'Home soon? Change clothes before the phone.', sub:'Landing is the whole job tonight.', route:'recover', cta:'After Work'};
  if(h>=19 && !S.day.closed)
    return {text:'Park tomorrow before bed.', sub:'Three priorities. Then nothing else needs solving tonight.', route:'close', cta:'Evening Close'};
  if(S.day.closed)
    return {text:'Tomorrow is held. You are done.', sub:'Phone away from the bed, if you can.', route:'close', cta:'Review tonight'};
  return {text: low ? 'The tiny version of anything counts today.' : 'Pick one small kept promise.', sub:'', route:'body', cta:'Body Care'};
}

function setDayType(t){ S.day.dayType=t; S.day.guessed=false; saveDay(); render(); }
function toggleLowEnergy(){ S.day.lowEnergy=!S.day.lowEnergy; saveDay(); render(); }

function weekPlanNow(){
  const wk = weekDates(0)[0];
  const p = S.weekly[wk] && S.weekly[wk].plan;
  return {
    anchors: (p && p.anchors && p.anchors.filter(a=>a&&a.trim()).length ? p.anchors.filter(a=>a&&a.trim()) :
      ['Feet on the floor before the phone','One stretch, any time','Park tomorrow before bed']),
    plan: p || null
  };
}
function anchorDone(i){ const t=S.tracking[todayStr()]; return !!(t && t['anchor'+i]); }
function toggleAnchor(i){
  const t=todayStr();
  if(!S.tracking[t]) S.tracking[t]={};
  const key='anchor'+i;
  if(S.tracking[t][key]){ delete S.tracking[t][key]; unmarkKept(key); }
  else { S.tracking[t][key]=true; markKept(key, weekPlanNow().anchors[i]||'Anchor kept'); toast(tone({soft:'Gently done.',direct:'Kept.',firm:'Small, repeated, real.'})); }
  DB.set('tracking', S.tracking);
  render();
}

function drawSprig(){
  const svg=document.getElementById('sprig'); if(!svg) return;
  const kept=keptToday().length;
  const n=Math.max(3, Math.min(kept+1, 8));   // always one more ghost leaf inviting the next tick
  const doneCount=Math.min(kept, 8);
  const allDone=kept>=8;
  const baseX=60, baseY=145, topY=34;
  let html=`<path d="M${baseX} ${baseY} C ${baseX-10} ${baseY-40}, ${baseX+9} ${baseY-70}, ${baseX} ${topY+6}" stroke="var(--moss)" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  for(let i=0;i<n;i++){
    const frac=(i+1)/(n+1), y=baseY-frac*(baseY-topY), side=i%2===0?1:-1, cx=baseX+side*3, grown=i<doneCount, rot=side>0?38:-38;
    html+=`<g class="leaf ${grown?'show':'hide'}" transform="translate(${cx} ${y}) rotate(${rot})">
      <path d="M0 0 C 14 -6, 30 -3, 34 4 C 28 11, 12 11, 0 0 Z" fill="${grown?'var(--leaf-bright)':'var(--sage)'}" transform="scale(${side>0?1:-1},1)"/>
      <path d="M2 1 L 28 5" stroke="rgba(35,54,42,.25)" stroke-width="1" fill="none" transform="scale(${side>0?1:-1},1)"/></g>`;
  }
  html+=`<g class="bud ${allDone?'show':'hide'}" transform="translate(${baseX} ${topY})"><circle r="7" fill="var(--leaf-bright)"/><circle r="3.4" fill="#EDE3B8"/></g>`;
  svg.innerHTML=html;
}

/* ============================================================
   2. MORNING START
   ============================================================ */
let morningStep = -1; // -1 = entry, 0..n = sequence
const MORNING_SEQ = [
  {t:'Sit up.', s:'Just that.'},
  {t:'Feet on the floor.', s:'The day starts when you move.'},
  {t:'Drink water.', s:'Before coffee decides everything.'},
  {t:'Open the curtains or turn on a light.', s:'Let the day in.'},
  {t:'Walk to the bathroom.', s:'You only need the next action.'},
  {t:"Choose today's first anchor.", s:'One. Not the whole list.'}
];
ROUTES.morning = function(){
  const plan=S.planToday;
  const things=(plan&&plan.things||[]).filter(t=>t&&t.trim());
  let html = shead('Morning Start', tone({
    soft:"No rush. Just the next small thing.",
    direct:"Don't negotiate with the scroll.",
    firm:"Don't negotiate with the scroll. Feet on the floor first."}));

  if(morningStep===-1){
    html += `
      <div class="btnrow">
        <button class="btn" onclick="morningStep=0;render()">Still in bed?</button>
        <button class="btn ghost" onclick="morningScrolled()">I already scrolled</button>
      </div>`;
    if(things.length){
      html += `<div class="t-label">Yesterday you chose what matters today</div>
        <div class="focus"><ul>${things.map((t,i)=>`<li><span>${i+1}</span>${esc(t)}</li>`).join('')}</ul>
        ${plan.first?`<div class="first-action">First tiny action: <b>${esc(plan.first)}</b></div>`:''}</div>`;
    }
    html += `<div class="t-label">The sequence, when you're ready</div><div class="list">` +
      MORNING_SEQ.map((s,i)=>`<div class="item"><div class="tick">${tickSvg()}</div><div class="txt"><div class="label">${esc(s.t)}</div><div class="meta">${esc(s.s)}</div></div></div>`).join('') +
      `</div>
      <button class="btn wide" onclick="morningStep=0;render()">Walk me through it</button>
      <p class="footer-note">Scrolled already? That's not failure — noticing is the interruption.<br>Come back to the life you're building.</p>`;
  } else if(morningStep < MORNING_SEQ.length){
    const s = MORNING_SEQ[morningStep];
    html += `<div class="wdots">${MORNING_SEQ.map((x,i)=>`<i class="${i<=morningStep?'on':''}"></i>`).join('')}</div>
      <div class="wq">${esc(s.t)}</div><div class="whint">${esc(s.s)}</div>`;
    if(morningStep===MORNING_SEQ.length-1 && things.length){
      html += `<div class="focus" style="margin-top:16px"><ul>${things.map((t,i)=>`<li><span>${i+1}</span>${esc(t)}</li>`).join('')}</ul></div>`;
    }
    html += `<div class="wnav">
      ${morningStep>0?`<button class="btn ghost" onclick="morningStep--;render()">Back</button>`:''}
      <button class="btn" onclick="morningNext()">${morningStep===MORNING_SEQ.length-1?'Day started':'Done — next'}</button>
    </div>`;
  } else {
    html += `<div class="mantra" style="margin-top:40px">${tone({
        soft:'You are up. That is the whole victory.',
        direct:'You moved. The morning is yours now.',
        firm:'You moved before the phone did. That is evidence.'})}</div>
      <button class="btn wide" onclick="morningStep=-1;go('home')">Into the day</button>`;
  }
  return html;
};
function morningNext(){
  morningStep++;
  if(morningStep>=MORNING_SEQ.length){
    S.day.morningDone=true; saveDay();
    logHabit('noscroll','Got up without scrolling');
  }
  render();
}
function morningScrolled(){
  toast('You noticed. That is the interruption.');
  morningStep=0;
  render();
}

/* ============================================================
   3. BODY CARE
   ============================================================ */
const BODY_HABITS = [
  {id:'mstretch', name:'Morning mobility', why:'Wake the body gently.',
   full:'A ten-minute mobility sequence.', tiny:'One stretch.', low:'Stretch sitting on the edge of the bed.', recovery:'One stretch before showering.'},
  {id:'stretch', name:'Evening stretch', why:'Ease stiffness and leg pain — hips, back, hamstrings.',
   full:'Fifteen to twenty minutes of stretching.', tiny:'Hamstrings or hips only.', low:'Legs up the wall.', recovery:'One stretch before bed.'},
  {id:'reset', name:'Workday body reset', why:'Your body has worked today.',
   full:'A ten-minute stretch after work.', tiny:'Lie on the floor for two minutes.', low:'Legs up the wall.', recovery:'Stretch calves or hips before bed.'},
  {id:'legsup', name:'Legs up the wall', why:'Calm the nervous system.',
   full:'Ten minutes, breathing slowly.', tiny:'Two minutes.', low:'Lie down and breathe.', recovery:'Lie down and breathe.'},
  {id:'hips', name:'Hip & back care', why:'Support the joints hospitality leans on.',
   full:'Hip flexor + glute + lower back sequence.', tiny:'One hip flexor stretch each side.', low:'Child’s pose for one minute.', recovery:'One gentle twist lying in bed.'},
  {id:'winddown', name:'Sleep wind-down', why:'Ease the switch from doing to resting.',
   full:'Stretch, dim lights, phone away, slow breaths.', tiny:'Three deep breaths, lights down.', low:'Phone across the room. That alone.', recovery:'One deep breath before sleep. It still counts.'}
];
ROUTES.body = function(){
  let html = shead('Body Care',
    'You already walk more than 10,000 steps at work. You do not need more steps — you need care. This is recovery, mobility and strength for a body that works hard.');
  html += `<p class="smallprint">Tap the version you did — full, tiny, low-energy or recovery. Something counts.</p>`;
  html += BODY_HABITS.map(b=>versionCard(b)).join('');
  html += `<p class="footer-note">Do the version that helps tomorrow.<br>The tiny version keeps the habit alive.</p>`;
  return html;
};
function versionCard(b){
  const logged = loggedToday(b.id);
  return `<div class="card">
    <h3>${esc(b.name)}${logged?' 🌿':''}</h3>
    <div class="why">${esc(b.why)}</div>
    <div class="versions">
      ${[['Full',b.full],['Tiny',b.tiny],['Low energy',b.low],['Recovery',b.recovery]].map(v=>
        `<div class="vrow ${logged?'logged':''}" onclick="logBody('${b.id}')">
          <span class="vtag">${v[0]}</span><span class="vtxt">${esc(v[1])}</span>
        </div>`).join('')}
    </div>
  </div>`;
}
function logBody(id){
  const bn=(BODY_HABITS.find(x=>x.id===id)||{}).name;
  logHabit(id, bn||'Cared for my body');
  logHabit('stretch_any');
  const msgs = {
    mstretch:'Your body gets a say in the morning too.',
    stretch:'This is care, not punishment.',
    reset:'Your job takes enough from your body. You just gave something back.',
    legsup:'You are allowed to land.',
    hips:'Support for the joints that carry you.',
    winddown:'Sleep is being protected.'
  };
  toast(msgs[id]||'That counts.');
  render();
}

/* ============================================================
   4. SWIM & STRENGTH
   ============================================================ */
ROUTES.move = function(){
  const swimLogged = loggedToday('swim'), strLogged = loggedToday('strength');
  return shead('Swim & Strength', 'The pool is already here. The gym is already here. You only have to get downstairs.') + `

    <div class="card">
      <h3>Swim ${swimLogged?'🌿':''}</h3>
      <div class="why">Bathers on. Towel. Lift down. That is the whole start.</div>
      <div class="versions">
        <div class="vrow ${swimLogged?'logged':''}" onclick="completeHabit('swim')"><span class="vtag">Full</span><span class="vtxt">Go downstairs and swim.</span></div>
        <div class="vrow ${swimLogged?'logged':''}" onclick="completeHabit('swim')"><span class="vtag">Tiny</span><span class="vtxt">Put bathers on and go downstairs.</span></div>
        <div class="vrow ${swimLogged?'logged':''}" onclick="completeHabit('swim')"><span class="vtag">Low energy</span><span class="vtxt">Sit by the pool, walk in the water, or ten minutes in.</span></div>
        <div class="vrow" onclick="recoverMove('swim')"><span class="vtag">Recovery</span><span class="vtxt">Put towel and bathers where you can see them. Choose the next swim time.</span></div>
      </div>
      <p class="smallprint">What is the smallest swim that would still count? Could you just get in the water?</p>
    </div>

    <div class="card">
      <h3>Strength ${strLogged?'🌿':''}</h3>
      <div class="why">One set downstairs counts. You are building muscle by returning.</div>
      <div class="versions">
        <div class="vrow ${strLogged?'logged':''}" onclick="completeHabit('strength')"><span class="vtag">Full</span><span class="vtxt">A simple strength session in the building gym.</span></div>
        <div class="vrow ${strLogged?'logged':''}" onclick="completeHabit('strength')"><span class="vtag">Tiny</span><span class="vtxt">Go downstairs and do one set.</span></div>
        <div class="vrow ${strLogged?'logged':''}" onclick="completeHabit('strength')"><span class="vtag">Low energy</span><span class="vtxt">One machine, one exercise, or five minutes.</span></div>
        <div class="vrow" onclick="recoverMove('strength')"><span class="vtag">Recovery</span><span class="vtxt">Put gym clothes, shoes or headphones somewhere visible.</span></div>
      </div>
      <p class="smallprint">What would make tomorrow's visit obvious? Make it too easy to refuse.</p>
    </div>

    <p class="footer-note">This is not a fitness challenge.<br>It is using what is already built into your life.</p>`;
};
function recoverMove(kind){
  toast(kind==='swim' ? 'The next swim is already easier.' : "Tomorrow's gym visit is now obvious.");
}

/* ============================================================
   5. AFTER WORK RECOVERY
   ============================================================ */
let recoverKind = null;
const RECOVER_KINDS = [
  {id:'body', label:'Body tired', steps:['Legs up the wall','A shower','One gentle stretch','Early night']},
  {id:'brain', label:'Brain tired', steps:['No more decisions tonight','Simple dinner','Phone somewhere else','Quiet']},
  {id:'emotional', label:'Emotionally overloaded', steps:['Write one sentence — just one','Three slow breaths','No fixing anything tonight','Something warm to eat or drink']},
  {id:'wired', label:'Still wired', steps:['One stretch to downshift','Tidy one surface, not the whole flat','Make one thing easier for tomorrow','Then stop']},
  {id:'spark', label:'A little spark left', steps:['Sketch for five minutes','Or ten minutes in the pool','Or one set downstairs','Then land properly']}
];
ROUTES.recover = function(){
  let html = shead('After Work Recovery', 'You are allowed to land. No walking prompts here — your shift already covered the steps.');
  const lsteps=['Put the phone down','Change clothes','Drink water','Eat something simple if needed','Shower if it helps','Five-minute body reset or legs up the wall'];
  html += `<div class="t-label">The landing sequence</div><div class="list">` +
    lsteps.map((s,i)=>`<div class="item ${landStepOn(i)?'done':''}" onclick="toggleLandStep(${i})"><div class="tick">${tickSvg()}</div><div class="txt"><div class="label">${esc(s)}</div></div></div>`).join('') + `</div>`;

  html += `<div class="t-label">What kind of day was it?</div><div class="chips">` +
    RECOVER_KINDS.map(k=>`<button class="chip ${recoverKind===k.id?'on':''}" onclick="recoverKind='${k.id}';render()">${esc(k.label)}</button>`).join('') + `</div>`;

  if(recoverKind){
    const k = RECOVER_KINDS.find(x=>x.id===recoverKind);
    html += `<div class="card"><h3>Tonight, kindly</h3>
      <div class="versions">${k.steps.map(s=>`<div class="vrow"><span class="vtxt">${esc(s)}</span></div>`).join('')}</div>
      <button class="btn wide" onclick="landed()">I've landed</button>
    </div>`;
  }
  html += `<p class="footer-note">Choose the kindest useful action. What can wait until tomorrow — can wait.<br>Do not turn the whole evening into recovery admin.</p>`;
  return html;
};
function landStepOn(i){ const t=S.tracking[todayStr()]; return !!(t && t['ls'+i]); }
function toggleLandStep(i){
  const t=todayStr();
  if(!S.tracking[t]) S.tracking[t]={};
  if(S.tracking[t]['ls'+i]) delete S.tracking[t]['ls'+i]; else S.tracking[t]['ls'+i]=true;
  DB.set('tracking',S.tracking); render();
}
function landed(){
  S.day.landed=true; saveDay();
  logHabit('land','Landed after work');
  recoverKind=null;
  toast('You are allowed to land.');
  go('home');
}

/* ============================================================
   6. EVENING CLOSE (wizard)
   ============================================================ */
let closeStep = 0, closeData = null;
ROUTES.close = function(){
  if(!closeData){ closeData = {head:'', p:['','',''], first:'', parked:[], easier:[]}; closeStep = 0; }
  const steps = 5;
  let html = shead('Evening Close', 'Practical mental unloading. Not journaling homework.');
  html += `<div class="wdots">${Array.from({length:steps},(_,i)=>`<i class="${i<=closeStep?'on':''}"></i>`).join('')}</div>`;

  if(closeStep===0){
    html += `<div class="wq">What is still in your head?</div>
      <div class="whint">Dump it. You do not have to solve any of it tonight.</div>
      <div class="field"><textarea id="cw_head" placeholder="Everything circling — big, small, silly. Out it goes.">${esc(closeData.head)}</textarea></div>
      <div class="wnav"><button class="btn" onclick="closeNext()">Captured</button></div>
      <button class="linklike" onclick="closeStep=1;render()">Nothing circling — skip</button>`;
  }
  else if(closeStep===1){
    html += `<div class="wq">What actually needs attention tomorrow?</div>
      <div class="whint">Three is enough. This is not tomorrow's entire life.</div>
      ${[0,1,2].map(i=>`<div class="field"><input type="text" id="cw_p${i}" maxlength="80" placeholder="${['The one that counts','Then this','And this'][i]}" value="${esc(closeData.p[i])}"></div>`).join('')}
      <div class="wnav"><button class="btn ghost" onclick="closeBack()">Back</button><button class="btn" onclick="closeNext()">These three</button></div>`;
  }
  else if(closeStep===2){
    html += `<div class="wq">What is the first tiny action tomorrow?</div>
      <div class="whint">So the morning starts itself.</div>
      <div class="field"><input type="text" id="cw_first" maxlength="90" placeholder="e.g. Feet on the floor. Drink water." value="${esc(closeData.first)}"></div>
      <div class="chips">${['Feet on the floor. Drink water.','Bathers on, go downstairs.','One stretch before coffee.','Open the sketchbook.','Look at one money number.'].map(c=>
        `<button class="chip" onclick="document.getElementById('cw_first').value='${esc(c)}'">${esc(c)}</button>`).join('')}</div>
      <div class="wnav"><button class="btn ghost" onclick="closeBack()">Back</button><button class="btn" onclick="closeNext()">Set</button></div>`;
  }
  else if(closeStep===3){
    html += `<div class="wq">Park the rest.</div>
      <div class="whint">This belongs to tomorrow, not tonight. Captured means you can stop holding it.</div>
      <div class="addrow"><input type="text" id="cw_park" maxlength="120" placeholder="Park it here"><button class="btn" onclick="closeAddPark()">Park</button></div>
      ${closeData.parked.length?`<div style="margin-top:10px">${closeData.parked.map(p=>`<div class="entry"><div class="etxt">${esc(p)}</div></div>`).join('')}</div>`:''}
      <div class="wnav"><button class="btn ghost" onclick="closeBack()">Back</button><button class="btn" onclick="closeNext()">${closeData.parked.length?'Parked':'Nothing to park'}</button></div>`;
  }
  else if(closeStep===4){
    html += `<div class="wq">Make tomorrow easier.</div>
      <div class="whint">Shape the environment tonight so the morning needs no willpower.</div>
      <div class="chips">${['Phone away from the bed','Bathers and towel out','Gym clothes visible','Stretch mat visible','Sketchbook open on the table','Tomorrow’s clothes out','Keys and bag by the door','Bills in one place'].map(c=>
        `<button class="chip ${closeData.easier.includes(c)?'on':''}" onclick="closeToggleEasier('${esc(c)}')">${esc(c)}</button>`).join('')}</div>
      <div class="wnav"><button class="btn ghost" onclick="closeBack()">Back</button><button class="btn" onclick="closeFinish()">Close the day</button></div>`;
  }
  else {
    const first = closeData.first || 'Feet on the floor. Drink water. Do not negotiate with the scroll.';
    html += `<div class="mantra" style="margin-top:36px">Tomorrow is held.<br>You do not have to hold it in bed.</div>
      <div class="first-action" style="margin-top:20px">Tomorrow's first action: <b>${esc(first)}</b></div>
      <p class="footer-note">Nothing else needs solving tonight.</p>
      <button class="btn wide" onclick="closeData=null;closeStep=0;go('home')">Goodnight</button>`;
  }
  return html;
};
function closeCollect(){
  const g=id=>{ const e=document.getElementById(id); return e?e.value.trim():null; };
  if(g('cw_head')!==null) closeData.head=g('cw_head');
  [0,1,2].forEach(i=>{ if(g('cw_p'+i)!==null) closeData.p[i]=g('cw_p'+i); });
  if(g('cw_first')!==null) closeData.first=g('cw_first');
}
function closeNext(){ closeCollect(); closeStep++; render(); }
function closeBack(){ closeCollect(); closeStep--; render(); }
function closeAddPark(){
  const e=document.getElementById('cw_park');
  if(e.value.trim()){ closeData.parked.push(e.value.trim()); e.value=''; render(); }
}
function closeToggleEasier(c){
  const i=closeData.easier.indexOf(c);
  if(i>=0) closeData.easier.splice(i,1); else closeData.easier.push(c);
  render();
}
function closeFinish(){
  closeCollect();
  // priorities → tomorrow's plan (existing rollover carries them into the morning)
  DB.set('plan_tomorrow', {things:closeData.p, first:closeData.first, note:closeData.head});
  S.planTomorrow = DB.get('plan_tomorrow');
  // parked items → parking lot
  closeData.parked.forEach(t=>S.parking.unshift({id:uid(), text:t, cat:'Tomorrow', done:false}));
  if(closeData.head && closeData.head.trim() && closeData.parked.length===0){
    // a head-dump with nothing sorted still gets held
  }
  DB.set('parking', S.parking);
  S.day.closed=true; saveDay();
  logHabit('close','Closed the day');
  closeStep=5;
  render();
}

/* ============================================================
   7. TOMORROW PARKING LOT
   ============================================================ */
let parkCat = 'Tomorrow';
ROUTES.parking = function(){
  let html = shead('Parking Lot', 'Not every thought is a task. Some things are only loud because you are tired. Capture it — decide later.');
  html += `<div class="chips">${PARK_CATS.map(c=>`<button class="chip ${parkCat===c?'on':''}" onclick="parkCat='${esc(c)}';render()">${esc(c)}</button>`).join('')}</div>
    <div class="addrow"><input type="text" id="parkInput" maxlength="140" placeholder="Park it here"><button class="btn" onclick="addPark()">Park</button></div>`;
  const open = S.parking.filter(p=>!p.done), doneList = S.parking.filter(p=>p.done);
  if(open.length){
    html += `<div class="t-label">Held for you</div>` + open.map(p=>parkEntry(p)).join('');
  } else {
    html += `<p class="sintro" style="margin-top:22px;font-style:italic;color:var(--sage)">Nothing parked. Your head must be quiet — enjoy it.</p>`;
  }
  if(doneList.length){
    html += `<div class="t-label">Let go</div>` + doneList.slice(0,6).map(p=>parkEntry(p)).join('');
  }
  html += `<p class="footer-note">You do not have to solve any of this in bed.<br>The weekly reset will ask what still matters.</p>`;
  return html;
};
function parkEntry(p){
  return `<div class="entry ${p.done?'dim':''}">
    <div class="etxt">${esc(p.text)}<span class="ecat">${esc(p.cat)}</span></div>
    <button class="mini" title="${p.done?'bring back':'done / let go'}" onclick="togglePark('${p.id}')">${p.done?'↺':'✓'}</button>
    <button class="mini" title="delete" onclick="delPark('${p.id}')">×</button>
  </div>`;
}
function addPark(){
  const e=document.getElementById('parkInput');
  const v=e.value.trim(); if(!v) return;
  S.parking.unshift({id:uid(), text:v, cat:parkCat, done:false});
  DB.set('parking', S.parking);
  logHabit('park','Parked a thought');
  e.value='';
  toast('Captured means you can stop holding it.');
  render();
}
function togglePark(id){ const p=S.parking.find(x=>x.id===id); if(p){p.done=!p.done; DB.set('parking',S.parking); render();} }
function delPark(id){ S.parking=S.parking.filter(x=>x.id!==id); DB.set('parking',S.parking); render(); }

/* ============================================================
   8 & 9. CREATIVE PRACTICE + HOME & IDEAS (shared capture)
   ============================================================ */
const CREATIVE_PROMPTS = [
  'Sketch one corner of the room you are in.',
  'Draw one plant shape from memory.',
  'Sketch one tile pattern you would actually use.',
  'Note one planting combination you saw or imagined.',
  'Photograph one texture, tile, colour or shadow.',
  'Draw one thing you noticed today.',
  'Sketch one improvement for the apartment.',
  'One bathroom idea — drawn badly is fine.',
  'One lighting idea for a room you know.',
  'Write one idea for a future Form & Foliage project.'
];
let capCatCreative = null, capCatHome = null;

ROUTES.creative = function(){
  const d=new Date(); const doy=Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);
  const prompt = CREATIVE_PROMPTS[doy % CREATIVE_PROMPTS.length];
  let html = shead('Creative Practice', 'Regular noticing, not polished output. One line counts. This is how you build your eye.');
  html += `<div class="next-card"><div class="nk">Today, if you feel like it</div><div class="nx">${esc(prompt)}</div>
      <div class="btnrow">
        <button class="btn soft" onclick="logCreative('sketch')">I sketched</button>
        <button class="btn soft" onclick="logCreative('notice')">I noticed something</button>
      </div></div>`;
  html += captureBlock('creative', 'What did you notice or want to keep?', CREATIVE_CATS, S.ideasCreative, capCatCreative);
  html += `<p class="footer-note">Collecting ideas is part of the work.<br>Five minutes is still creative practice.</p>`;
  return html;
};
ROUTES.homeideas = function(){
  let html = shead('Home & Ideas', 'Your home is part of the life you are building. Capture the idea — you do not have to solve it today.');
  html += `<div class="card quiet"><h3>Gentle prompts</h3>
    <p class="body-txt" style="margin-top:8px">What is one thing at home that would make life easier?<br>
    What storage problem keeps annoying you?<br>
    What lighting would make a space feel better?<br>
    What could improve the bathroom — keeping that good big mirror?</p></div>`;
  html += captureBlock('home', 'One idea, annoyance or reference', HOME_CATS, S.ideasHome, capCatHome);
  html += `<p class="footer-note">Practical can still be beautiful.<br>Make the apartment support you.</p>`;
  return html;
};
function captureBlock(kind, placeholder, cats, listData, activeCat){
  let html = `<div class="t-label">Capture</div>
    <div class="chips">${cats.map(c=>`<button class="chip ${activeCat===c?'on':''}" onclick="setCapCat('${kind}','${esc(c)}')">${esc(c)}</button>`).join('')}</div>
    <div class="addrow"><input type="text" id="cap_${kind}" maxlength="180" placeholder="${esc(placeholder)}"><button class="btn" onclick="addCapture('${kind}')">Keep</button></div>`;
  if(listData.length){
    html += `<div class="t-label">Kept</div>` + listData.map(e=>
      `<div class="entry"><div class="etxt">${esc(e.text)}<span class="ecat">${esc(e.cat||'')}</span></div>
       <button class="mini" onclick="delCapture('${kind}','${e.id}')">×</button></div>`).join('');
  }
  return html;
}
function setCapCat(kind,c){
  if(kind==='creative') capCatCreative = capCatCreative===c?null:c;
  else capCatHome = capCatHome===c?null:c;
  render();
}
function addCapture(kind){
  const e=document.getElementById('cap_'+kind);
  const v=e.value.trim(); if(!v) return;
  const entry={id:uid(), text:v, cat:(kind==='creative'?capCatCreative:capCatHome)||'', date:todayStr()};
  if(kind==='creative'){ S.ideasCreative.unshift(entry); DB.set('ideasCreative',S.ideasCreative); logHabit('notice','Kept a creative idea'); toast('Noticing is part of the work.'); }
  else { S.ideasHome.unshift(entry); DB.set('ideasHome',S.ideasHome); logHabit('homeidea','Captured a home idea'); toast('You captured it. You do not have to solve it today.'); }
  e.value='';
  render();
}
function delCapture(kind,id){
  if(kind==='creative'){ S.ideasCreative=S.ideasCreative.filter(x=>x.id!==id); DB.set('ideasCreative',S.ideasCreative); }
  else { S.ideasHome=S.ideasHome.filter(x=>x.id!==id); DB.set('ideasHome',S.ideasHome); }
  render();
}
function logCreative(which){
  logHabit(which, which==='sketch'?'Sketched':'Noticed something');
  toast(which==='sketch'?'You are building your eye.':'Noticing is part of the work.');
  render();
}

/* ============================================================
   10. JOY PLAN
   ============================================================ */
let joyCat = null;
ROUTES.joy = function(){
  let html = shead('Joy Plan', 'Joy does not happen by accident. This is not indulgence — it is maintenance.');
  html += `<div class="card quiet"><h3>This week I want to look forward to…</h3>
    <p class="body-txt" style="margin-top:8px">One small pleasure. One beautiful place. One thing just because you like it.<br>
    What would make this week feel more like a life?</p></div>`;
  html += `<div class="chips">${JOY_CATS.map(c=>`<button class="chip ${joyCat===c?'on':''}" onclick="joyCat=joyCat==='${esc(c)}'?null:'${esc(c)}';render()">${esc(c)}</button>`).join('')}</div>
    <div class="addrow"><input type="text" id="joyInput" maxlength="140" placeholder="Put something good in the week"><button class="btn" onclick="addJoy()">Plan it</button></div>`;
  const open=S.joyList.filter(j=>!j.done), had=S.joyList.filter(j=>j.done);
  if(open.length) html += `<div class="t-label">To look forward to</div>` + open.map(j=>joyEntry(j)).join('');
  if(had.length) html += `<div class="t-label">Enjoyed</div>` + had.slice(0,8).map(j=>joyEntry(j)).join('');
  html += `<p class="footer-note">Not everything has to be useful.</p>`;
  return html;
};
function joyEntry(j){
  return `<div class="entry ${j.done?'dim':''}">
    <div class="etxt">${esc(j.text)}<span class="ecat">${esc(j.cat||'')}</span></div>
    <button class="mini" onclick="toggleJoy('${j.id}')">${j.done?'↺':'✓'}</button>
    <button class="mini" onclick="delJoy('${j.id}')">×</button>
  </div>`;
}
function addJoy(){
  const e=document.getElementById('joyInput'); const v=e.value.trim(); if(!v) return;
  S.joyList.unshift({id:uid(), text:v, cat:joyCat||'', done:false});
  DB.set('joyList',S.joyList);
  logHabit('joy','Planned something good');
  e.value='';
  toast('This is part of having a life.');
  render();
}
function toggleJoy(id){ const j=S.joyList.find(x=>x.id===id); if(j){ j.done=!j.done; DB.set('joyList',S.joyList); if(j.done) toast('Enjoyed. That was the point.'); render(); } }
function delJoy(id){ S.joyList=S.joyList.filter(x=>x.id!==id); DB.set('joyList',S.joyList); render(); }

/* ============================================================
   11. MONEY CALM
   ============================================================ */
ROUTES.moneycalm = function(){
  const m=S.money, fk=fortnightKey();
  const conf=m.confirms[fk]||{};
  const lastLook=m.looks[0];
  let html = shead('Money Calm', 'Look at the number. The number is information. Avoiding it makes it scarier.');

  html += `<div class="card"><h3>The setup that already exists</h3>
    <div class="why">Check it — do not spiral. It is already working.</div>
    <div style="margin-top:10px">
      <div class="kv"><span class="k">Bills account</span><span class="v">$${esc(S.settings.bills)} <small>/ fortnight</small></span></div>
      <div class="kv"><span class="k">Mortgage</span><span class="v">$${esc(S.settings.mortgage)} <small>/ fortnight</small></span></div>
    </div>
    <div class="btnrow">
      <button class="btn ${conf.bills?'soft':'ghost'}" onclick="confirmMoney('bills')">${conf.bills?'✓ Bills confirmed':'Confirm bills went'}</button>
      <button class="btn ${conf.mortgage?'soft':'ghost'}" onclick="confirmMoney('mortgage')">${conf.mortgage?'✓ Mortgage confirmed':'Confirm mortgage'}</button>
    </div>
    <p class="smallprint">This fortnight. Two taps and the fear has nowhere to live.</p>
  </div>`;

  html += `<div class="card"><h3>Just look</h3>
    <div class="why">Write down the actual number instead of catastrophising.</div>
    <div class="field" style="display:flex;gap:8px"><input type="text" id="lookNum" placeholder="Balance or number you checked" style="flex:1">
    <button class="btn" onclick="addLook()">Looked</button></div>
    ${lastLook?`<p class="smallprint">Last look: ${esc(lastLook.num)} — ${esc(lastLook.date)}</p>`:''}
  </div>`;

  html += `<div class="card"><h3>Upcoming</h3>
    ${m.upcoming.map(u=>`<div class="kv"><span class="k">${esc(u.name)} <small style="color:var(--sage)">· ${esc(u.when)}</small></span>
      <span class="v">$${esc(u.amount)} <button class="mini" style="display:inline-flex;vertical-align:middle;margin-left:6px" onclick="delUpcoming('${u.id}')">×</button></span></div>`).join('')||'<p class="smallprint">Nothing noted yet.</p>'}
    <div class="addrow"><input type="text" id="upName" placeholder="What" style="flex:2"><input type="number" id="upAmt" placeholder="$" style="flex:1"><button class="btn" onclick="addUpcoming()">Note</button></div>
  </div>`;

  html += `<div class="card"><h3>One small money action</h3>
    <div class="why">You do not need to solve everything today. Clarity first, decisions second.</div>
    <div class="chips">${['Check one balance','Open the bill','Check one subscription','Write down what is actually due','Move a small amount to savings','Choose the week’s one money priority'].map(a=>
      `<button class="chip ${m.action===a?'on':''}" onclick="setMoneyAction('${esc(a)}')">${esc(a)}</button>`).join('')}</div>
    ${m.action?`<div class="first-action" style="margin-top:12px">This week: <b>${esc(m.action)}</b></div>`:''}
    <button class="btn wide" onclick="completeHabit('money')">I looked — done for today</button>
  </div>`;

  html += `<p class="footer-note">Manual only. No banks connected, nothing leaves this phone.<br>This is clarity, not a budgeting app.</p>`;
  return html;
};
function confirmMoney(which){
  const fk=fortnightKey();
  if(!S.money.confirms[fk]) S.money.confirms[fk]={};
  S.money.confirms[fk][which]=!S.money.confirms[fk][which];
  DB.set('moneyData',S.money);
  if(S.money.confirms[fk][which]) toast(which==='bills'?'The bills system is doing its job.':'The mortgage is accounted for.');
  render();
}
function addLook(){
  const e=document.getElementById('lookNum'); const v=e.value.trim(); if(!v) return;
  S.money.looks.unshift({num:v, date:prettyDate()});
  S.money.looks=S.money.looks.slice(0,10);
  DB.set('moneyData',S.money);
  logHabit('money','Looked at the money');
  toast('The number is information.');
  render();
}
function addUpcoming(){
  const n=document.getElementById('upName').value.trim();
  const a=document.getElementById('upAmt').value.trim();
  if(!n) return;
  S.money.upcoming.push({id:uid(), name:n, amount:a||'—', when:'Noted'});
  DB.set('moneyData',S.money);
  render();
}
function delUpcoming(id){ S.money.upcoming=S.money.upcoming.filter(u=>u.id!==id); DB.set('moneyData',S.money); render(); }
function setMoneyAction(a){ S.money.action = S.money.action===a?'':a; DB.set('moneyData',S.money); render(); }

/* ============================================================
   12. WEEKLY RESET (wizard)
   ============================================================ */
let wkStep=0, wkData=null;
const WK_QUESTIONS = [
  {id:'worked', q:'What worked this week?', hint:'Small counts. "I got in the water twice" is an answer.'},
  {id:'harder', q:'What made life harder?', hint:'Information, not judgement.'},
  {id:'energy', q:'What is coming up that will take energy?', hint:'Demanding shifts, family things, anything looming.'},
  {id:'protect', q:'What will you protect this week?', hint:'One swim? One evening? Name it and it is harder to lose.'},
  {id:'no', q:'What do you need to say no to?', hint:'Boundaries are environment design too.'}
];
ROUTES.weekly = function(){
  const wk=weekDates(0)[0];
  const saved=S.weekly[wk];
  if(!wkData) wkData = saved ? JSON.parse(JSON.stringify(saved)) : {answers:{}, keepPark:[], plan:{anchors:['','',''], body:'', move:'', creative:'', money:'', joy:'', home:'', protect:'', easier:''}};
  const totalSteps = WK_QUESTIONS.length + 2; // questions + parking review + plan
  let html = shead('Weekly Reset', 'A kind look at the week — not a performance review.');

  // this week's grid, gently
  html += weekGridHtml();

  html += `<div class="wdots">${Array.from({length:totalSteps},(_,i)=>`<i class="${i<=wkStep?'on':''}"></i>`).join('')}</div>`;

  if(wkStep < WK_QUESTIONS.length){
    const q=WK_QUESTIONS[wkStep];
    html += `<div class="wq">${esc(q.q)}</div><div class="whint">${esc(q.hint)}</div>
      <div class="field"><textarea id="wk_a" placeholder="A sentence is plenty">${esc(wkData.answers[q.id]||'')}</textarea></div>
      <div class="wnav">${wkStep>0?`<button class="btn ghost" onclick="wkNav(-1)">Back</button>`:''}<button class="btn" onclick="wkNav(1)">Next</button></div>`;
  }
  else if(wkStep === WK_QUESTIONS.length){
    const open=S.parking.filter(p=>!p.done);
    html += `<div class="wq">The parking lot.</div>
      <div class="whint">Not everything here deserves to become a task. Some things were only loud because you were tired. Tick = still matters. × = let it go.</div>`;
    html += open.length ? open.map(p=>parkEntry(p)).join('') : '<p class="sintro" style="font-style:italic;color:var(--sage)">Empty. Nothing carried over.</p>';
    html += `<div class="wnav"><button class="btn ghost" onclick="wkNav(-1)">Back</button><button class="btn" onclick="wkNav(1)">Sorted</button></div>`;
  }
  else if(wkStep === WK_QUESTIONS.length+1){
    const p=wkData.plan;
    html += `<div class="wq">The week, simply.</div><div class="whint">Three anchors and one gentle focus each. Attach habits to things you already do.</div>
      <div class="field"><label>Three anchor habits</label>
        ${[0,1,2].map(i=>`<input type="text" id="wk_an${i}" style="margin-bottom:8px" maxlength="80" placeholder="${['After I wake up, I put my feet on the floor','After I make coffee, I stretch for five minutes','After I brush my teeth, I choose tomorrow’s top 3'][i]}" value="${esc(p.anchors[i]||'')}">`).join('')}
      </div>
      ${[['body','Body care focus','e.g. evening stretch on work nights'],
         ['move','Swim or strength to protect','e.g. Wednesday swim before anything else'],
         ['creative','Creative focus','e.g. three five-minute sketches'],
         ['money','One money action','e.g. confirm bills + check electricity'],
         ['joy','One joy plan','e.g. Saturday morning at the market'],
         ['home','One home idea or reset','e.g. sort the hallway light'],
         ['protect','One thing to protect','e.g. Sunday evening — no plans'],
         ['easier','One thing to make easier','e.g. swim bag packed and by the door']
        ].map(f=>`<div class="field"><label>${f[1]}</label><input type="text" id="wk_${f[0]}" maxlength="90" placeholder="${esc(f[2])}" value="${esc(p[f[0]]||'')}"></div>`).join('')}
      <div class="wnav"><button class="btn ghost" onclick="wkNav(-1)">Back</button><button class="btn" onclick="wkFinish()">Set the week</button></div>`;
  }
  else {
    html += `<div class="mantra" style="margin-top:30px">The week has a shape now.<br>Hold it loosely.</div>
      <button class="btn wide" onclick="wkStep=0;wkData=null;go('home')">Done</button>`;
  }
  return html;
};
function weekGridHtml(){
  const dates=weekDates(0), today=todayStr();
  // second key = legacy ids from the earlier version of the app, so old ticks still show
  const rows=[['noscroll|r_morning','No-scroll morning'],['stretch_any|stretch','Stretched'],['swim','Swim'],['strength','Strength'],['land','Landed after work'],['sketch','Sketched'],['notice','Noticed'],['money','Looked at money'],['close','Closed the day']];
  const letters=['M','T','W','T','F','S','S'];
  let h='<div class="grid-scroll"><table class="grid"><thead><tr><th style="text-align:left"></th>';
  dates.forEach((d,i)=>h+=`<th class="${d===today?'col-today':''}">${letters[i]}</th>`);
  h+='</tr></thead><tbody>';
  rows.forEach(r=>{
    h+=`<tr><td class="hlabel">${r[1]}</td>`;
    dates.forEach(d=>{
      const on=S.tracking[d] && r[0].split('|').some(k=>S.tracking[d][k]);
      h+=`<td class="${d===today?'col-today':''}"><div class="cell ${on?'on':''}"><span class="dot"></span></div></td>`;
    });
    h+='</tr>';
  });
  h+='</tbody></table></div><p class="grid-note">Empty is rest, not a miss.</p>';
  return h;
}
function wkNav(dir){
  if(wkStep<WK_QUESTIONS.length){
    const e=document.getElementById('wk_a');
    if(e) wkData.answers[WK_QUESTIONS[wkStep].id]=e.value.trim();
  }
  wkStep+=dir; render();
}
function wkFinish(){
  const p=wkData.plan;
  [0,1,2].forEach(i=>{ const e=document.getElementById('wk_an'+i); if(e) p.anchors[i]=e.value.trim(); });
  ['body','move','creative','money','joy','home','protect','easier'].forEach(f=>{
    const e=document.getElementById('wk_'+f); if(e) p[f]=e.value.trim();
  });
  const wk=weekDates(0)[0];
  S.weekly[wk]=wkData;
  DB.set('weekly',S.weekly);
  logHabit('moneyweek','Did the weekly reset');
  wkStep=WK_QUESTIONS.length+2;
  render();
}

/* ============================================================
   13. MONTHLY REVIEW (wizard)
   ============================================================ */
let moStep=0, moData=null;
const MO_STEPS = [
  {id:'improved', q:'Three things that improved.', hint:'What are you becoming more consistent with?', n:3},
  {id:'attention', q:'Three things asking for attention.', hint:'Not failures — signals.', n:3},
  {id:'stop', q:'One thing to stop doing.', hint:'Where are you still relying on willpower?', n:1},
  {id:'protectt', q:'One thing to protect.', hint:'What helped you feel more like yourself?', n:1},
  {id:'easier', q:'One thing to make easier.', hint:'What environment change would help?', n:1},
  {id:'focus', q:'Next month, gently.', hint:'One creative focus, one body focus, one money focus, one joy focus.', n:4,
   labels:['Creative focus','Body focus','Money focus','Joy focus']}
];
ROUTES.monthly = function(){
  const mk=(new Date()).getFullYear()+'-'+((new Date()).getMonth()+1);
  const saved=S.monthly[mk];
  if(!moData) moData = saved ? JSON.parse(JSON.stringify(saved)) : {};
  let html = shead('Monthly Review', 'The bigger picture — reflective, practical, forward-moving. Not a school report.');
  html += `<div class="wdots">${MO_STEPS.map((x,i)=>`<i class="${i<=moStep?'on':''}"></i>`).join('')}</div>`;
  if(moStep < MO_STEPS.length){
    const s=MO_STEPS[moStep];
    const vals=moData[s.id]||[];
    html += `<div class="wq">${esc(s.q)}</div><div class="whint">${esc(s.hint)}</div>` +
      Array.from({length:s.n},(_,i)=>`<div class="field">${s.labels?`<label>${s.labels[i]}</label>`:''}<input type="text" id="mo_${i}" maxlength="100" value="${esc(vals[i]||'')}"></div>`).join('') +
      `<div class="wnav">${moStep>0?`<button class="btn ghost" onclick="moNav(-1)">Back</button>`:''}<button class="btn" onclick="moNav(1)">${moStep===MO_STEPS.length-1?'Set the month':'Next'}</button></div>`;
  } else {
    html += `<div class="mantra" style="margin-top:26px">Noted, kept, carried forward.</div><div class="review-out">`;
    MO_STEPS.forEach(s=>{
      (moData[s.id]||[]).forEach((v,i)=>{
        if(v) html+=`<div class="ro"><span>${s.labels?esc(s.labels[i]):'·'}</span>${esc(v)}</div>`;
      });
    });
    html += `</div><button class="btn wide" onclick="moStep=0;moData=null;go('home')">Done</button>`;
  }
  return html;
};
function moNav(dir){
  const s=MO_STEPS[moStep];
  if(s && dir>0){
    moData[s.id]=Array.from({length:s.n},(_,i)=>{ const e=document.getElementById('mo_'+i); return e?e.value.trim():''; });
    const mk=(new Date()).getFullYear()+'-'+((new Date()).getMonth()+1);
    S.monthly[mk]=moData; DB.set('monthly',S.monthly);
  }
  moStep+=dir; render();
}

/* ============================================================
   14. HABIT DESIGN
   ============================================================ */
let editHabitId=null;
ROUTES.habits = function(){
  if(editHabitId){
    const h=habit(editHabitId);
    if(!h){ editHabitId=null; return ROUTES.habits(); }
    return shead('Habit Design', '') + `
      <div class="card">
      <h3>${esc(h.name)}</h3>
      ${[['name','Habit name'],['identity','Identity — who this makes you'],['stack','Implementation intention — “When [situation], I will [small action]”'],
         ['full','Full version'],['tiny','Tiny version'],['low','Low-energy version'],['recovery','Recovery version'],
         ['env','Make it easier — environment support'],['done','Completion message']
        ].map(f=>`<div class="field"><label>${f[1]}</label><input type="text" id="hb_${f[0]}" maxlength="160" value="${esc(h[f[0]]||'')}"></div>`).join('')}
      <div class="btnrow">
        <button class="btn ghost" onclick="editHabitId=null;render()">Back</button>
        <button class="btn" onclick="saveHabit('${h.id}')">Save</button>
      </div>
      </div>`;
  }
  let html = shead('Habit Design', 'Cue → reason → response → reward. Every habit has a tiny version, a recovery version, and an identity it feeds. Design the environment; do not rely on willpower.');
  const areas=[...new Set(S.habits.map(h=>h.area))];
  areas.forEach(a=>{
    html+=`<div class="t-label">${esc(a)}</div>`;
    S.habits.filter(h=>h.area===a).forEach(h=>{
      html+=`<div class="card" onclick="editHabitId='${h.id}';render()" style="cursor:pointer">
        <h3>${esc(h.name)}</h3>
        <div class="why">${esc(h.identity)}</div>
        <p class="smallprint" style="margin-top:8px">${esc(h.stack)}</p>
        <p class="smallprint">Tiny: ${esc(h.tiny)} · Easier: ${esc(h.env)}</p>
      </div>`;
    });
  });
  html += `<div class="addrow"><input type="text" id="newHabit" maxlength="60" placeholder="Add a habit"><button class="btn" onclick="addHabit()">Add</button></div>
    <p class="footer-note">Make it obvious. Make it easy. Make it satisfying.<br>Never miss twice — but missing once is normal.</p>`;
  return html;
};
function saveHabit(id){
  const h=habit(id); if(!h) return;
  ['name','identity','stack','full','tiny','low','recovery','env','done'].forEach(f=>{
    const e=document.getElementById('hb_'+f); if(e) h[f]=e.value.trim();
  });
  saveHabits();
  editHabitId=null;
  toast('Habit shaped.');
  render();
}
function addHabit(){
  const e=document.getElementById('newHabit'); const v=e.value.trim(); if(!v) return;
  const h={id:uid(), area:'Mine', name:v, identity:'I am someone who keeps small promises.',
    cue:'', stack:'When ____, I will ____.', tiny:'The two-minute version.', full:'', low:'', recovery:'Come back with the tiny version.',
    env:'What can I put out, remove or prepare?', done:'That counts.'};
  S.habits.push(h); saveHabits();
  editHabitId=h.id;
  render();
}

/* ============================================================
   15. SETTINGS
   ============================================================ */
ROUTES.settings = function(){
  const s=S.settings;
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return shead('Settings', 'Make it yours. Nothing here is complicated.') + `
    <div class="field"><label>Your name</label><input type="text" id="st_name" maxlength="30" value="${esc(s.name)}"></div>
    <div class="field"><label>Tone</label>
      <div class="chips">${[['soft','Soft'],['direct','Direct'],['firm','Firm but kind']].map(t=>
        `<button class="chip ${s.tone===t[0]?'on':''}" onclick="setSetting('tone','${t[0]}')">${t[1]}</button>`).join('')}</div></div>
    <div class="field"><label>Usual workdays</label>
      <div class="chips">${days.map(d=>`<button class="chip ${(s.workdays||[]).includes(d)?'on':''}" onclick="toggleWorkday('${d}')">${d}</button>`).join('')}</div>
      <p class="smallprint">Hospitality weeks move around — you can always correct the day type on the Today screen.</p></div>
    <div class="field"><label>Weekly reset day</label>
      <div class="chips">${days.map(d=>`<button class="chip ${s.resetDay===d?'on':''}" onclick="setSetting('resetDay','${d}')">${d}</button>`).join('')}</div></div>
    <div class="field"><label>Bills — $ per fortnight</label><div class="inline-num"><input type="number" id="st_bills" value="${esc(s.bills)}"></div></div>
    <div class="field"><label>Mortgage — $ per fortnight</label><div class="inline-num"><input type="number" id="st_mortgage" value="${esc(s.mortgage)}"></div></div>
    <button class="btn wide" onclick="saveSettings()">Save</button>
    <p class="footer-note">Everything stays on this phone. No accounts, no servers, nothing shared.</p>`;
};
function setSetting(k,v){ S.settings[k]=v; DB.set('settings',S.settings); render(); }
function toggleWorkday(d){
  const w=S.settings.workdays||[];
  const i=w.indexOf(d);
  if(i>=0) w.splice(i,1); else w.push(d);
  S.settings.workdays=w; DB.set('settings',S.settings); render();
}
function saveSettings(){
  const g=id=>document.getElementById(id);
  if(g('st_name').value.trim()) S.settings.name=g('st_name').value.trim();
  S.settings.bills=Number(g('st_bills').value)||S.settings.bills;
  S.settings.mortgage=Number(g('st_mortgage').value)||S.settings.mortgage;
  DB.set('settings',S.settings);
  toast('Saved.');
  go('home');
}

/* ============================================================
   MY CONSTITUTION — the person being built
   ============================================================ */
let editArtId = null;
function evidenceCount(a, wk){
  if(!a.ev || !a.ev.length){
    // the "self-trust" kind of article: evidence = every kept promise this week
    return wk.reduce((s,d)=> s + DB.get('kept:'+d, []).length, 0);
  }
  return wk.reduce((s,d)=>{ const t=S.tracking[d]||{}; return s + a.ev.filter(id=>t[id]).length; }, 0);
}
ROUTES.constitution = function(){
  const wk = weekDates(0);
  let html = shead('My Constitution', 'The person you are becoming — in your own words. Every kept promise is a quiet vote for one of these.');
  html += S.constitution.map(a=>{
    if(editArtId===a.id){
      return `<div class="card"><div class="field"><textarea id="art_${a.id}" maxlength="200">${esc(a.text)}</textarea></div>
        <div class="btnrow"><button class="btn ghost" onclick="editArtId=null;render()">Cancel</button><button class="btn" onclick="saveArticle('${a.id}')">Save</button></div></div>`;
    }
    const n = evidenceCount(a, wk);
    const ev = n
      ? ('Evidence this week &nbsp; '+'🌿'.repeat(Math.min(n,7))+(n>7?(' +'+(n-7)):''))
      : 'No evidence yet this week — one small action counts.';
    return `<div class="card">
      <div class="const-art">${esc(a.text)}</div>
      <div class="why" style="margin-top:9px">${ev}</div>
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
        <button class="mini" title="edit" onclick="editArtId='${a.id}';render()">&#9998;</button>
        <button class="mini" title="remove" onclick="delArticle('${a.id}')">&times;</button>
      </div>
    </div>`;
  }).join('');
  html += `<div class="addrow"><input type="text" id="artInput" maxlength="200" placeholder="Add an article — “I am someone who…”"><button class="btn" onclick="addArticle()">Add</button></div>
    <p class="footer-note">These are placeholders drawn from our conversation.<br>Edit them — or paste the articles from your own constitution — so this speaks in your voice.</p>`;
  return html;
};
function saveArticle(id){
  const e=document.getElementById('art_'+id);
  const a=S.constitution.find(x=>x.id===id);
  if(a && e && e.value.trim()){ a.text=e.value.trim(); DB.set('constitution',S.constitution); }
  editArtId=null; toast('Written in.'); render();
}
function addArticle(){
  const e=document.getElementById('artInput'); const v=e.value.trim(); if(!v) return;
  S.constitution.push({id:uid(), text:v, ev:[]});
  DB.set('constitution',S.constitution);
  e.value=''; toast('An article of your own.'); render();
}
function delArticle(id){ S.constitution=S.constitution.filter(x=>x.id!==id); DB.set('constitution',S.constitution); render(); }

/* ============================================================
   RESET ME — the return flow
   ============================================================ */
let resetState=null;
const RESET_NAMES = ['I am scrolling','I am avoiding money','I am tired','I am overwhelmed','I am overthinking','I am stuck in bed','I am putting off stretching','I am waiting to feel motivated','I am physically wrecked from work','I am emotionally overloaded','Tomorrow is circling in my head','I am carrying work into bed'];
const RESET_ACTIONS = {
  'I am scrolling':{a:'Put the phone face-down. Stand up. That is the whole move.', r:'morning'},
  'I am avoiding money':{a:'Open Money Calm and confirm just the bills and mortgage. Nothing else.', r:'moneycalm'},
  'I am tired':{a:'Legs up the wall for two minutes. Tired is information, not failure.', r:'body'},
  'I am overwhelmed':{a:'Park everything in your head, then do one tiny thing.', r:'parking'},
  'I am overthinking':{a:'Out of your head, onto the list. Park it.', r:'parking'},
  'I am stuck in bed':{a:'Sit up. Feet on the floor. Nothing else yet.', r:'morning'},
  'I am putting off stretching':{a:'One stretch. The one you like. Sixty seconds.', r:'body'},
  'I am waiting to feel motivated':{a:'Motivation follows movement. Do the two-minute version of anything.', r:'body'},
  'I am physically wrecked from work':{a:'You need recovery, not more output. Land: change clothes, water, legs up the wall.', r:'recover'},
  'I am emotionally overloaded':{a:'One sentence, three breaths, no fixing tonight.', r:'recover'},
  'Tomorrow is circling in my head':{a:'Open Evening Close and park it. Three priorities, then done.', r:'close'},
  'I am carrying work into bed':{a:'Work thoughts go in the parking lot. They will keep until your shift.', r:'parking'}
};
function openReset(){ resetState={step:0, name:null}; drawReset(); }
function drawReset(){
  const o=document.getElementById('overlay');
  o.classList.remove('hidden');
  let inner='';
  if(resetState.step===0){
    inner=`<h2 class="stitle">Name what is happening</h2>
      <p class="sintro">No judgement — this is information.</p>
      <div class="chips">${RESET_NAMES.map(n=>`<button class="chip" onclick="resetPick('${esc(n)}')">${esc(n)}</button>`).join('')}</div>
      <button class="linklike" onclick="closeReset()">Never mind</button>`;
  } else {
    const act=RESET_ACTIONS[resetState.name]||{a:'Do the two-minute version of anything.', r:'home'};
    inner=`<h2 class="stitle">Okay. ${esc(resetState.name.replace('I am','You are'))}.</h2>
      <p class="sintro">Missing once is normal. No catching up — just come back.</p>
      <div class="next-card"><div class="nk">The next two minutes</div><div class="nx">${esc(act.a)}</div></div>
      <div class="field"><label>Remove one obstacle</label><input type="text" id="rs_obstacle" maxlength="90" placeholder="e.g. phone to the other room, mat onto the floor"></div>
      <div class="btnrow">
        <button class="btn" onclick="resetReturned('${act.r}')">Mark today as returned</button>
        <button class="btn ghost" onclick="closeReset()">Close</button>
      </div>`;
  }
  o.innerHTML=`<div class="sheet">${inner}</div>`;
}
function resetPick(n){ resetState.name=n; resetState.step=1; drawReset(); }
function resetReturned(route){
  logHabit('returned','Came back');
  S.day.returned=true; saveDay();
  closeReset();
  toast('You returned. That matters.');
  if(route && route!=='home') go(route); else render();
}
function closeReset(){ document.getElementById('overlay').classList.add('hidden'); resetState=null; }

/* ============================================================
   BOOT
   ============================================================ */
function init(){
  ensureSeed();
  loadState();
  rollover();
  document.getElementById('loading').classList.add('hidden');
  render();
}
init();
