/* My Golf Calendar — static GitHub Pages edition. No build step or database. */
(() => {
  'use strict';
  const ROOT = document.getElementById('app');
  const DATA = window.COURSE_DATA || {courses:[],origins:[]};
  const API = window.GOLFCOURSE_API_CACHE || {courses:{}};
  // API enrichment is fetched at deployment, never by the public browser.
  const COURSES = DATA.courses.map(original => {
    const enriched = API.courses?.[original.id];
    if (!enriched || !Array.isArray(enriched.tees) || !enriched.tees.length) return original;
    const first = enriched.tees.find(t => t.holes?.length) || enriched.tees[0];
    return {...original,
      apiSource: 'GolfCourseAPI.com', apiUpdated: API.updatedAt || null,
      apiTees: enriched.tees, apiCourseName: enriched.name || original.name,
      yards: Number(first.yards) || original.yards,
      par: Number(first.par) || original.par,
      slope: Number(first.slope) || original.slope,
      courseRating: Number(first.rating) || original.courseRating,
      scorecard: first.holes?.length ? {tee:first.name || 'Selected tees', note:'GolfCourseAPI course data snapshot; tee-specific distances and ratings.', source:'https://golfcourseapi.com/', holes:first.holes} : original.scorecard
    };
  });
  const ORIGINS = DATA.origins;
  const STORAGE_KEY = 'my-golf-calendar-plans-v1';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2,'0');
  const dateISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseDay = s => new Date(`${s}T12:00:00`);
  const addDay = (d,n) => {const v=new Date(d);v.setDate(v.getDate()+n);return v;};
  const monday = d => addDay(d,-((d.getDay()+6)%7));
  const dateLabel = (iso,opts={weekday:'long',month:'long',day:'numeric'}) => parseDay(iso).toLocaleDateString('en-US',opts);
  const minuteToTime = n => `${pad(((Math.floor(n/60)%24)+24)%24)}:${pad(((n%60)+60)%60)}`;
  const timeToMinute = time => {const [h,m]=String(time).split(':').map(Number);return (h||0)*60+(m||0);};
  const offsetTime = (time,off) => minuteToTime(timeToMinute(time)+off);
  const prettyTime = time => {const [h,m]=time.split(':').map(Number);return `${h%12||12}:${pad(m)} ${h>=12?'PM':'AM'}`;};
  const icon = (key,n=19) => {
    const paths = {
      back:'<path d="m15 18-6-6 6-6"/>', next:'<path d="m9 18 6-6-6-6"/>',
      map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
      filter:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
      plus:'<path d="M12 5v14M5 12h14"/>', star:'<path d="m12 2 3.2 6.6 7.3 1-5.3 5.2 1.3 7.2L12 18.5 5.5 22l1.3-7.2L1.5 9.6l7.3-1Z"/>',
      close:'<path d="M18 6 6 18M6 6l12 12"/>',
      share:'<path d="M12 15V3m-4 4 4-4 4 4"/><rect x="4" y="12" width="16" height="9" rx="2"/>',
      trash:'<path d="M3 6h18m-2 0-1 14H6L5 6m3 0V4h8v2M10 10v6m4-6v6"/>',
      info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
      external:'<path d="M13 5h6v6M19 5l-9 9"/><path d="M19 13v6H5V5h6"/>',
      check:'<path d="m4 12 5 5L20 6"/>',
      profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
      spark:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>'
    };
    return `<svg aria-hidden="true" width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[key]||''}</svg>`;
  };
  function initialPlans() {try {const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v.filter(p=>p?.date&&p?.courseId):[];}catch{return []}}
  const today = new Date();
  const s = {
    screen:'home', selectedDate:dateISO(today), weekOffset:0, expanded:false,
    originIndex:0, courseId:'skyway', detailTab:'info',
    filterOpen:false, listOpen:false, search:'', teeIndex:0,
    filters:{radius:15,holes:'all',minRating:0,publicOnly:true,facility:'Any',price:'Any'},
    plans:initialPlans(), viewingId:null, suggested:false, toast:'',
    draft:null
  };
  let map=null, toastHandle=null;
  const currentOrigin = () => ORIGINS[s.originIndex] || {name:'Jersey City, NJ',lat:40.7282,lng:-74.0776};
  const currentCourse = () => COURSES.find(c=>c.id===s.courseId)||COURSES[0];
  const findCourse = id => COURSES.find(c=>c.id===id);
  const distance = (a,b) => {const r=Math.PI/180,dl=(b.lat-a.lat)*r,dg=(b.lng-a.lng)*r,h=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dg/2)**2;return 3958.76*2*Math.asin(Math.min(1,Math.sqrt(h)));};
  const driveEstimate = c => Math.max(15,Math.round((distance(currentOrigin(),c)*2.4+10)/5)*5);
  function filtered() {return COURSES.filter(c=> distance(currentOrigin(),c)<=s.filters.radius &&
    (s.filters.holes==='all'||String(c.holes)===s.filters.holes) &&
    (c.rating===null?s.filters.minRating===0:c.rating>=s.filters.minRating) &&
    (!s.filters.publicOnly||c.access==='Public') &&
    (s.filters.facility==='Any'||c.facilities.includes(s.filters.facility)) &&
    (s.filters.price==='Any'||s.filters.price===c.price) &&
    (!s.search||`${c.name} ${c.city}`.toLowerCase().includes(s.search.toLowerCase())));}
  function bestSuggestion(){return [...COURSES].filter(c=>c.access==='Public').sort((a,b)=>{
    const score=c=>(c.facilities.includes('Driving range')?3:0)+(c.holes===18?2:0)+(c.rating||3)-distance(currentOrigin(),c)*0.08;
    return score(b)-score(a);
  })[0]||COURSES[0];}
  function newDraft(c){const hasRange=c.facilities.includes('Driving range');return {id:'',courseId:c.id,date:s.selectedDate,tee:'11:00',drive:driveEstimate(c),checkIn:10,warmUp:hasRange?30:15,firstTee:10,mode:hasRange?'range':'putting',notes:''};}
  function steps(p){const leave=offsetTime(p.tee,-p.drive-p.checkIn-(p.mode==='none'?0:p.warmUp)-p.firstTee);
    const arrival=offsetTime(leave,p.drive),warm=offsetTime(arrival,p.checkIn),teeWalk=offsetTime(p.tee,-p.firstTee);
    return [{time:leave,title:'Leave your starting point',desc:`${p.drive}-minute estimated drive`},
      {time:arrival,title:'Arrive and check in',desc:`Allow ${p.checkIn} minutes`},
      ...(p.mode!=='none'&&p.warmUp?[{time:warm,title:p.mode==='range'?'Warm up at the range':p.mode==='putting'?'Warm up on the putting green':'Prepare for your round',desc:`${p.warmUp} minutes`}]:[]),
      {time:teeWalk,title:'Head to the first tee',desc:`Allow ${p.firstTee} minutes`},
      {time:p.tee,title:'Target tee time',desc:'Confirm your reservation separately.'}];
  }
  function timeline(p){return `<div class="timeline">${steps(p).map(x=>`<div class="time-row"><span class="time-hour">${prettyTime(x.time)}</span><div class="time-line"></div><div><b>${esc(x.title)}</b><small>${esc(x.desc)}</small></div></div>`).join('')}</div>`;}
  function persist(){try {localStorage.setItem(STORAGE_KEY,JSON.stringify(s.plans));}catch{showToast('Device storage is unavailable.')}}
  function showToast(t){s.toast=t;clearTimeout(toastHandle);let el=document.getElementById('toast');if(el){el.textContent=t;el.classList.add('show')}toastHandle=setTimeout(()=>{s.toast='';el=document.getElementById('toast');if(el)el.classList.remove('show')},3300);}
  function navigate(screen){s.screen=screen;s.filterOpen=false;s.listOpen=false;render();window.scrollTo(0,0);}
  function topbar(sub='', title='') {return `<header class="topbar">${sub?`<button class="back-button" data-act="back" aria-label="Go back">${icon('back',22)}<span>${esc(sub)}</span></button>`:`<span class="logo-small">${icon('calendar',19)} CourseFit</span>`}${title?`<h1>${esc(title)}</h1>`:''}</header>`;}
  function nav(){return `<nav class="bottom-nav"><button data-act="home" class="${s.screen==='home'?'active':''}">${icon('calendar',17)}<span>Plans</span></button><button data-act="profile">${icon('profile',17)}<span>Profile</span></button></nav>`;}
  const btn=(label,act,outline=false)=>`<button class="btn ${outline?'outline':''}" data-act="${act}">${label}</button>`;
  function week(){const mon=monday(today),days=Array.from({length:7},(_,i)=>addDay(addDay(mon,s.weekOffset*7),i));return `<div class="calendar-caption"><h2>${dateLabel(s.selectedDate,{month:'long',year:'numeric'})}</h2><div class="week-controls"><button data-act="prevWeek" aria-label="Previous week">${icon('back',16)}</button><button data-act="toggleMonth" aria-label="Expand calendar">${icon('calendar',17)}</button><button data-act="nextWeek" aria-label="Next week">${icon('next',16)}</button></div></div><div class="week-grid">${days.map(d=>{const ds=dateISO(d),has=s.plans.some(p=>p.date===ds);return `<button class="day ${ds===s.selectedDate?'active':''}" data-act="day:${ds}"><span>${d.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${d.getDate()}</b>${has?'<i aria-label="Has plan"></i>':''}</button>`;}).join('')}</div>`;}
  function month(){const d=parseDay(s.selectedDate),first=new Date(d.getFullYear(),d.getMonth(),1),last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),offset=(first.getDay()+6)%7;return `<div class="month-grid">${Array(offset).fill('<span></span>').join('')}${Array.from({length:last},(_,i)=>{const iso=dateISO(new Date(d.getFullYear(),d.getMonth(),i+1));return `<button class="month-day ${s.selectedDate===iso?'active':''}" data-act="day:${iso}">${i+1}${s.plans.some(p=>p.date===iso)?'<i></i>':''}</button>`;}).join('')}</div>`;}
  function planCard(p, suggested=false){const c=findCourse(p.courseId)||COURSES[0],ts=steps(p);return `<button class="plan-card ${suggested?'suggested':''}" data-act="${suggested?'suggestionPlan':'viewPlan:'+p.id}"><span class="card-tag">${suggested?'Suggested':'Plan saved'}</span><h3>${esc(c.name)}</h3><p>${p.mode==='range'?'On-site range warm-up':'Warm-up'} + ${c.holes} holes</p><dl><div><dt>Leave</dt><dd>${prettyTime(ts[0].time)}</dd></div><div><dt>Arrive</dt><dd>${prettyTime(ts[1].time)}</dd></div><div><dt>Target tee time</dt><dd>${prettyTime(p.tee)}</dd></div></dl>${suggested?'<small class="suggested-note">Example timing · Not a real tee-time availability check</small>':''}</button>`;}
  function home(){const todays=s.plans.filter(p=>p.date===s.selectedDate).sort((a,b)=>a.tee.localeCompare(b.tee)),suggested=bestSuggestion(),p=newDraft(suggested);return `<section class="home-content"><h1>My Golf Calendar</h1>${week()}${s.expanded?month():''}<div class="home-list">${todays.length===0?`<div class="empty-state"><h2>No plans</h2><p>Nothing scheduled for ${dateLabel(s.selectedDate,{month:'short',day:'numeric'})}.</p>${btn(`${icon('plus',17)} Create a new plan`,'map')}</div>`:todays.map(x=>planCard(x)).join('')+`<div class="add-plan-row">${btn(`${icon('plus',17)} Create another plan`,'map',true)}</div>`}<div class="suggest-section"><div class="suggest-heading"><h2>${icon('spark',18)} Smart suggestion</h2><span>Rule-based example</span></div><p>Based on nearby public courses and listed practice facilities.</p>${planCard(p,true)}</div></div></section>${nav()}`;}
  function chip(txt,act){return `<button class="chip" data-act="${act}">${txt}</button>`;}
  function mapScreen(){const count=filtered().length;return `<section class="map-page"><div id="map" class="map-canvas" aria-label="Map of New Jersey golf courses"><div class="map-loading">${icon('map',28)}<p>Loading map…</p></div></div><div class="map-top"><label class="map-location">${icon('pin',17)}<select aria-label="Starting location" data-field="origin">${ORIGINS.map((o,i)=>`<option value="${i}" ${i===s.originIndex?'selected':''}>${esc(o.name)}</option>`).join('')}</select></label><div class="map-filter-row">${chip(s.filters.holes==='all'?'All holes':s.filters.holes+' Holes','openFilters')}${chip(`${s.filters.radius}mi radius`,'openFilters')}${chip(s.filters.minRating?'Rating '+s.filters.minRating.toFixed(1)+'+':'Any rating','openFilters')}${chip(s.filters.publicOnly?'Public':'All access','openFilters')}<button class="filter-icon" data-act="openFilters" aria-label="Filter courses">${icon('filter',21)}</button></div></div><div class="map-bottom"><button class="map-list-toggle" data-act="toggleList">${icon('search',16)} ${count} nearby · ${COURSES.length} total courses</button><div class="map-bottom-nav"><button class="map-nav-icon" data-act="home" aria-label="Go to plans" title="Plans">${icon('calendar',25)}</button><button class="map-nav-icon" data-act="profile" aria-label="Open profile" title="Profile">${icon('profile',25)}</button></div></div>${s.listOpen?`<div class="course-list-sheet"><div class="sheet-heading"><h2>Nearby courses</h2><button data-act="toggleList">${icon('close')}</button></div>${count?filtered().map(c=>`<button class="course-list-item" data-act="course:${c.id}"><b>${esc(c.name)}</b><span>${c.price} · ${esc(c.access)} · ${c.rating===null?'Unrated':'★ '+c.rating.toFixed(1)} · ${distance(currentOrigin(),c).toFixed(1)}mi</span>${icon('next')}</button>`).join(''):'<p>No courses match these filters. Adjust your requirements.</p>'}</div>`:''}${s.filterOpen?filterSheet():''}</section>`;}
  function filterSheet(){const f=s.filters;return `<div class="sheet-backdrop" data-act="closeFilters"></div><section class="filter-sheet" role="dialog" aria-modal="true" aria-label="Set my needs"><div class="sheet-heading"><button data-act="closeFilters">Cancel</button><h2>Must keep</h2><button data-act="resetFilters">Clear all</button></div><div class="sheet-scroll"><h3>Number of holes</h3><div class="choice-grid">${[['all','Any'],['9','9 holes'],['18','18 holes']].map(([v,t])=>`<button class="choice ${f.holes===v?'active':''}" data-act="holes:${v}">${t}</button>`).join('')}</div><h3>Access</h3><div class="choice-grid two"><button class="choice ${f.publicOnly?'active':''}" data-act="access:public">Public only</button><button class="choice ${!f.publicOnly?'active':''}" data-act="access:all">Include private</button></div><h3>Distance</h3><div class="slider-label"><span>Radius from starting point</span><strong>${f.radius} mi</strong></div><input type="range" data-field="radius" min="5" max="50" step="5" value="${f.radius}"/><h3>Community review rating</h3><div class="slider-label"><span>Minimum score</span><strong>${f.minRating?f.minRating.toFixed(1)+'+':'Any'}</strong></div><input type="range" data-field="minRating" min="0" max="4.5" step="0.5" value="${f.minRating}"/><h3>Estimated price tier</h3><div class="choice-grid four">${['Any','$','$$','$$$'].map(v=>`<button class="choice ${f.price===v?'active':''}" data-act="price:${v}">${v}</button>`).join('')}</div><h3>Facility</h3><select data-field="facility" class="input">${['Any','Driving range','Putting green','Golf carts','Club rentals','Restaurant','Lessons','Pro shop'].map(v=>`<option ${f.facility===v?'selected':''}>${v}</option>`).join('')}</select><p class="muted small">Radius is measured in straight-line miles, not driving distance. Distances are straight-line estimates. Course fees, reviews and amenities may change.</p></div><div class="sheet-foot"><span>${filtered().length} courses</span>${btn('Show courses','closeFilters')}</div></section>`;}
  function photo(c){return `<div class="course-photo">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)} course" onerror="this.remove()" loading="lazy"/>`:''}<div class="photo-fallback">${icon('map',42)} <span>${esc(c.city)} · Golf course</span></div></div>`;}
  function scorecard(c){const chosen=c.apiTees?.[s.teeIndex];const card=chosen?.holes?.length?{tee:chosen.name,note:`${chosen.yards||'—'} yards · Par ${chosen.par||'—'} · Course rating ${chosen.rating||'—'} · Slope ${chosen.slope||'—'} (tee-specific)`,source:'https://golfcourseapi.com/',holes:chosen.holes}:c.scorecard;if(!card)return `<div class="no-score"><h3>Scorecard</h3><p>A verified hole-by-hole scorecard isn't included for this course.</p><a class="inline-link" href="${esc(c.scorecardUrl)}" target="_blank" rel="noopener noreferrer">Visit course scorecard source ${icon('external',15)}</a></div>`;
    const holes=card.holes;return `<div class="scorecard">${c.apiTees?.length?`<div class="tee-picker"><strong>Choose tee</strong><div class="tee-scroll">${c.apiTees.map((t,i)=>`<button type="button" data-act="tee:${i}" class="tee-chip ${s.teeIndex===i?'active':''}">${esc(t.name)}</button>`).join('')}</div></div>`:''}<h3>${esc(card.tee)} · ${holes.length} holes</h3><p class="muted">${esc(card.note)}</p><div class="table-wrap"><table><thead><tr><th>Hole</th>${holes.map(h=>`<th>${h.hole}</th>`).join('')}<th>Σ</th></tr></thead><tbody><tr><th>Par</th>${holes.map(h=>`<td>${h.par}</td>`).join('')}<th>${holes.reduce((a,b)=>a+b.par,0)}</th></tr><tr><th>Yards</th>${holes.map(h=>`<td>${h.yards}</td>`).join('')}<th>${holes.reduce((a,b)=>a+b.yards,0)}</th></tr>${holes.some(h=>h.hcp)?`<tr><th>HCP</th>${holes.map(h=>`<td>${h.hcp||'—'}</td>`).join('')}<th>—</th></tr>`:''}</tbody></table></div><a class="inline-link" href="${esc(card.source)}" target="_blank" rel="noopener noreferrer">Published source ${icon('external',15)}</a></div>`;}
  function courseScreen(){const c=currentCourse();return `${topbar('Choose course')}<section class="details-content"><h1>${esc(c.name)}</h1><p class="course-address">${icon('pin',15)} ${esc(c.address)}</p>${c.apiSource?`<p class="api-snapshot">${icon('check',15)} Scorecard: GolfCourseAPI snapshot · ${esc(c.apiUpdated||'recent build')}</p>`:''}${photo(c)}<div class="course-buttons">${btn(`${icon('plus',19)} Create a plan`,'startPlan')}</div><div class="course-tabs">${[['info','Details'],['scorecard','Scorecard'],['preview','Preview']].map(([id,t])=>`<button class="${s.detailTab===id?'active':''}" data-act="tab:${id}">${t}</button>`).join('')}</div>${s.detailTab==='scorecard'?scorecard(c):s.detailTab==='preview'?`<div class="course-text"><h3>Course preview</h3><p>${esc(c.highlight)}</p><p>${esc(c.description)}</p><a class="inline-link" href="${esc(c.website)}" target="_blank" rel="noopener noreferrer">Official course photos and details ${icon('external',15)}</a><a class="inline-link" href="https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=15/${c.lat}/${c.lng}" target="_blank" rel="noopener noreferrer">View course location ${icon('external',15)}</a></div>`:`<div class="course-facts">${[['Access',c.access],['Holes',c.holes],['Par',c.par],['Length',c.yards.toLocaleString()+' yd'],['Slope',c.slope||'—'],['Course rating',c.courseRating||'—']].map(([l,v])=>`<div><small>${l}</small><b>${esc(v)}</b></div>`).join('')}</div>${c.apiTees?.length?`<p class="tee-explainer">Course rating, slope and length above are for <b>${esc(c.apiTees[0].name)}</b> tees. Choose another tee in Scorecard.</p>`:''}<div class="rating-card"><b>${icon('star',19)} ${c.rating===null?'Unverified':c.rating.toFixed(1)}</b><span>Community review snapshot · not a live score</span><p>${esc(c.ratingNote)}</p></div>${c.operatingNote?`<p class="notice">${icon('info',16)} ${esc(c.operatingNote)}</p>`:''}<div class="course-text"><h3>About this course</h3><p>${esc(c.description)}</p><h3>Facilities</h3><div class="facility-list">${c.facilities.map(x=>`<span>${icon('check',14)} ${esc(x)}</span>`).join('')}</div><p class="muted">${esc(c.facilitiesNote)}</p><h3>Price</h3><p><strong>${esc(c.price)}</strong> · ${esc(c.priceNote)}</p><h3>Course facility information</h3><a class="inline-link" href="${esc(c.website)}" target="_blank" rel="noopener noreferrer">Official website ${icon('external',15)}</a><a class="inline-link" href="tel:${esc(c.phone)}">Call ${esc(c.phone)}</a><p class="notice">${icon('info',16)} Prices, rating snapshots, playing conditions and amenities are not updated live.</p></div>`}</section>`;}
  function field(label,html,hint=''){return `<label class="field"><span>${label}</span>${html}${hint?`<small>${hint}</small>`:''}</label>`;}
  function options(name,values,selected,suffix=''){return `<select class="input" data-draft="${name}">${values.map(v=>`<option value="${v}" ${String(selected)===String(v)?'selected':''}>${v}${suffix}</option>`).join('')}</select>`;}
  function timing(){const p=s.draft,c=findCourse(p.courseId);return `${topbar('Choose course')}<section class="form-content"><h1>Build around<br> your tee time.</h1>${field('Planned date',`<input class="input" type="date" data-draft="date" value="${p.date}"/>`)}${field('Target tee time',`<input class="input" type="time" data-draft="tee" value="${p.tee}"/>`,'A time you’re considering or have booked elsewhere.')}${field('Driving time to the course',options('drive',[10,15,20,25,30,35,40,45,50,60,75,90,120],p.drive,' minutes'),'Sample estimate; adjust for your starting point and traffic.')}<div class="form-two">${field('Check-in buffer',options('checkIn',[5,10,15,20,25,30],p.checkIn,' min'))}${field('Get to first tee',options('firstTee',[5,10,15,20,25],p.firstTee,' min'))}</div>${field('Warm-up type',`<select class="input" data-draft="mode"><option value="range" ${p.mode==='range'?'selected':''}>Driving range</option><option value="putting" ${p.mode==='putting'?'selected':''}>Putting green</option><option value="none" ${p.mode==='none'?'selected':''}>No practice</option></select>`)}${p.mode==='none'?'':field('Warm-up time',options('warmUp',[0,10,15,20,30,40,45,60],p.warmUp,' minutes'))}${p.mode==='range'&&!c.facilities.includes('Driving range')?'<p class="notice">A driving range is not verified at this course. Check with the facility.</p>':''}<div class="arrival-summary"><b>Suggested arrival: ${prettyTime(steps(p)[1].time)}</b><p>Leave at ${prettyTime(steps(p)[0].time)}. Allow for check-in${p.mode==='none'?'': ' and warm-up'}.</p></div>${btn('Preview my day '+icon('next',17),'preview')}</section>`;}
  function preview(){const p=s.draft,c=findCourse(p.courseId);return `${topbar('Edit timing')}<section class="preview-content"><h1>${esc(c.name)}<br>planned.</h1><p class="date-subtitle">${dateLabel(p.date)}</p><div class="arrival-summary"><h3>Arrive at ${prettyTime(steps(p)[1].time)}</h3><p>Check-in${p.mode==='none'?'': ' and warm-up'} included before your target tee time.</p></div>${timeline(p)}<p class="disclaimer">This saves your plan, not a reservation. Range access, tee-time availability and travel estimates are not confirmed.</p>${btn('Save to My Golf Calendar','savePlan')}</section>`;}
  function savedPlan(){const p=s.plans.find(x=>x.id===s.viewingId);if(!p){s.screen='home';return home();}const c=findCourse(p.courseId)||COURSES[0];return `${topbar('My Golf Calendar')}<section class="saved-content"><div class="saved-heading"><div><h1>${esc(c.name)}</h1><h2>${dateLabel(p.date,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</h2></div><button data-act="invite" class="btn outline invite">${icon('share',16)} Invite</button></div>${photo(c)}${timeline(p)}<div class="saved-actions">${btn('Use as new plan','duplicatePlan',true)}<button data-act="deletePlan" class="danger-button">${icon('trash',17)} Delete saved plan</button></div><p class="notice">This is an itinerary only. It does not book a tee time.</p></section>`;}
  function profile(){return `${topbar('Plans')}<section class="profile-content"><div class="profile-icon">${icon('profile',34)}</div><h1>My Golf Calendar</h1><p class="muted">Plan golf days, not reservations.</p><div class="profile-summary">${icon('calendar',22)}<div><b>${s.plans.length} saved plans</b><small>Stored in this browser only</small></div></div><div class="profile-summary">${icon('pin',22)}<div><b>${esc(currentOrigin().name)}</b><small>Sample starting location</small></div></div><h2>Your saved plans</h2>${s.plans.length?s.plans.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(p=>`<button class="profile-plan" data-act="viewPlan:${p.id}">${dateLabel(p.date,{month:'short',day:'numeric',year:'numeric'})} · ${esc(findCourse(p.courseId)?.shortName||'Golf')} ${icon('next',17)}</button>`).join(''):'<p class="muted">No saved plans yet.</p>'}<p class="notice">No account or database. Plans are lost if this browser’s site data is cleared. Map tiles require internet.</p>${btn('Create a new plan','map')}</section>`;}
  function render(){if(map){map.destroy();map=null;}
    let content='';switch(s.screen){case 'home':content=home();break;case 'map':content=mapScreen();break;case 'course':content=courseScreen();break;case 'timing':content=timing();break;case 'preview':content=preview();break;case 'plan':content=savedPlan();break;case 'profile':content=profile();break;default:content=home();}
    ROOT.innerHTML=`<div class="app-shell ${s.screen==='map'?'full-map':''}">${content}<div id="toast" class="toast ${s.toast?'show':''}" role="status">${esc(s.toast)}</div></div>`;
    if(s.screen==='map'){setTimeout(initMap,30);}
  }
  // Dependency-free slippy map: official OpenStreetMap tiles + coordinate-accurate markers.
  // It keeps course markers visible even if third-party map tile requests fail.
  function initMap() {
    const target=document.getElementById('map');
    if(!target)return;
    target.innerHTML='';
    target.setAttribute('role','application');
    target.setAttribute('aria-label','Interactive map: drag to pan, use plus and minus to zoom, select a golf course');
    // Real OpenStreetMap tiles do not require a CARTO basemap API key.
    // A coordinate-accurate grid remains if a phone's in-app browser blocks external images.
    const fallback=document.createElement('div');fallback.className='map-fallback-grid';
    fallback.innerHTML='<span class="map-grid-head">LOCATION MAP</span><span class="map-grid-sub">Course markers reflect geographic coordinates</span>';
    const geoLabels=document.createElement('div');geoLabels.className='map-geo-labels';
    const tiles=document.createElement('div');tiles.className='map-tile-layer';
    const radius=document.createElementNS('http://www.w3.org/2000/svg','svg');radius.classList.add('map-radius-svg');radius.setAttribute('aria-hidden','true');const radiusPath=document.createElementNS('http://www.w3.org/2000/svg','path');radiusPath.classList.add('map-radius-polygon');radius.appendChild(radiusPath);
    const pins=document.createElement('div');pins.className='map-pin-layer';
    const mapAlert=document.createElement('div');mapAlert.className='map-fallback-alert';
    mapAlert.innerHTML='Map imagery unavailable here · course positions are still accurate. <a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/#map=11/40.7282/-74.0776">Open real map ↗</a>';
    const controls=document.createElement('div');controls.className='map-zoom-controls';
    controls.innerHTML='<button type="button" aria-label="Zoom in" data-mapzoom="1">+</button><button type="button" aria-label="Zoom out" data-mapzoom="-1">−</button><button type="button" aria-label="Center map on courses" data-mapzoom="fit" title="Show all courses">⌖</button>';
    const attribution=document.createElement('div');attribution.className='map-attribution';
    attribution.innerHTML='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
    target.append(fallback,geoLabels,tiles,radius,pins,controls,mapAlert,attribution);

    const size=256;
    const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
    const project=(lat,lng,z)=>{
      const l=clamp(lat,-85.0511,85.0511)*Math.PI/180;
      const world=size*Math.pow(2,z);
      return {x:(lng+180)/360*world,y:(1-Math.asinh(Math.tan(l))/Math.PI)/2*world};
    };
    const unproject=(x,y,z)=>{
      const world=size*Math.pow(2,z);
      return {lat:Math.atan(Math.sinh(Math.PI*(1-2*y/world)))*180/Math.PI,lng:x/world*360-180};
    };
    const origin=currentOrigin(), visible=filtered();
    let z=10, center={lat:origin.lat,lng:origin.lng};
    let points=new Map(), activePointer=null, lastX=0, lastY=0, animation=0, isDragging=false;
    const tileImages=new Map();
    let loadedTiles=0, failedTiles=0;
    const fallbackTimer=setTimeout(()=>{if(!loadedTiles && target.isConnected)target.classList.add('map-tiles-unavailable')},6500);
    const geoCities=[['JERSEY CITY',40.7282,-74.0776],['NEWARK',40.7357,-74.1724],['HOBOKEN',40.744,-74.033],['MANHATTAN',40.765,-73.987],['ELIZABETH',40.664,-74.211],['TEANECK',40.889,-74.006],['WEST ORANGE',40.796,-74.239],['STATEN ISLAND',40.602,-74.15]];

    // Points on a geodesic circle, rather than a pixel-sized circle, ensure
    // that the radius reflects true great-circle mileage at this latitude.
    function circlePoints(radiusMiles){
      const lat=origin.lat*Math.PI/180,lon=origin.lng*Math.PI/180;
      const angular=radiusMiles/3958.7613;
      return Array.from({length:72},(_,i)=>{
        const bearing=2*Math.PI*i/72;
        const endLat=Math.asin(Math.sin(lat)*Math.cos(angular)+Math.cos(lat)*Math.sin(angular)*Math.cos(bearing));
        const endLon=lon+Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(lat), Math.cos(angular)-Math.sin(lat)*Math.sin(endLat));
        return {lat:endLat*180/Math.PI,lng:(endLon*180/Math.PI+540)%360-180};
      });
    }
    function fitCourses(){
      const places=[origin,...visible,...circlePoints(s.filters.radius)];
      if(places.length===1){z=11;center={lat:origin.lat,lng:origin.lng};return;}
      const minLat=Math.min(...places.map(p=>p.lat)),maxLat=Math.max(...places.map(p=>p.lat));
      const minLng=Math.min(...places.map(p=>p.lng)),maxLng=Math.max(...places.map(p=>p.lng));
      center={lat:(minLat+maxLat)/2,lng:(minLng+maxLng)/2};
      const w=target.clientWidth||390,h=target.clientHeight||740;
      const usableW=Math.max(150,w-105),usableH=Math.max(160,h-340);
      for(z=12;z>7;z--){const a=project(maxLat,minLng,z),b=project(minLat,maxLng,z);if((b.x-a.x)<=usableW&&(b.y-a.y)<=usableH)break;}
    }
    fitCourses();

    function paint(){
      animation=0;
      if(!target.isConnected)return;
      const w=target.clientWidth,h=target.clientHeight;
      if(!w||!h)return;
      const cp=project(center.lat,center.lng,z),offsetX=w/2-cp.x,offsetY=h/2-cp.y;
      const worldTiles=Math.pow(2,z), minX=Math.floor(-offsetX/size)-1, maxX=Math.ceil((w-offsetX)/size)+1;
      const minY=Math.max(0,Math.floor(-offsetY/size)-1), maxY=Math.min(worldTiles-1,Math.ceil((h-offsetY)/size)+1);
      const valid=new Set();
      // Use an accurate geolocation grid as a fallback, never a fake street map.
      geoLabels.replaceChildren();
      if(!target.classList.contains('map-tiles-ready')){
        for(const [name,lat,lng] of geoCities){
          const pt=project(lat,lng,z),xx=pt.x+offsetX,yy=pt.y+offsetY;
          if(xx>-60 && xx<w+60 && yy>175 && yy<h-100){
            const label=document.createElement('span');label.className='map-geo-city';label.textContent=name;
            label.style.left=xx+'px';label.style.top=yy+'px';geoLabels.appendChild(label);
          }
        }
      }
      for(let x=minX;x<=maxX;x++){
        for(let y=minY;y<=maxY;y++){
          const normalizedX=((x%worldTiles)+worldTiles)%worldTiles;
          const key=`${z}/${normalizedX}/${y}`;
          valid.add(key);
          let img=tileImages.get(key);
          if(!img){
            img=document.createElement('img');img.className='map-tile';img.alt='';
            img.decoding='async';img.loading='eager';
            img.referrerPolicy='no-referrer-when-downgrade';
            // OSM standard map tiles: no secret, no CARTO API key, proper attribution.
            img.onload=()=>{if(img.naturalWidth){loadedTiles++;target.classList.add('map-tiles-ready');target.classList.remove('map-tiles-unavailable')}};
            img.onerror=()=>{failedTiles++;img.style.visibility='hidden';if(!loadedTiles && failedTiles>=3)target.classList.add('map-tiles-unavailable')};
            img.src=`https://tile.openstreetmap.org/${key}.png`;
            tileImages.set(key,img);tiles.appendChild(img);
          }
          img.style.left=`${Math.round(x*size+offsetX)}px`;
          img.style.top=`${Math.round(y*size+offsetY)}px`;
        }
      }
      for(const [k,img] of tileImages){if(!valid.has(k)){img.remove();tileImages.delete(k);}}
      const current=project(origin.lat,origin.lng,z), rx=current.x+offsetX,ry=current.y+offsetY;
      radius.setAttribute('viewBox',`0 0 ${w} ${h}`);
      const outline=circlePoints(s.filters.radius).map((p,i)=>{
        const pt=project(p.lat,p.lng,z);
        return `${i?'L':'M'}${(pt.x+offsetX).toFixed(2)},${(pt.y+offsetY).toFixed(2)}`;
      }).join(' ')+' Z';
      radiusPath.setAttribute('d',outline);

      const currentIds=new Set(visible.map(c=>c.id));
      for(const [id,node] of points){if(!currentIds.has(id)){node.remove();points.delete(id);}}
      for(const c of visible){
        let node=points.get(c.id);
        if(!node){
          node=document.createElement('button');node.type='button';node.className='map-course-pin';node.dataset.act=`course:${c.id}`;
          node.setAttribute('aria-label',`${c.name}, ${c.price}, ${c.rating===null?'rating unavailable':'rated '+c.rating.toFixed(1)}`);
          const rating=c.rating===null?'Unrated':'★ '+c.rating.toFixed(1);
          node.innerHTML=`<strong>${esc(c.shortName)}</strong><span>${esc(c.price)} &nbsp; <b>${esc(rating)}</b></span>`;
          pins.appendChild(node);points.set(c.id,node);
        }
        const pos=project(c.lat,c.lng,z);
        node.style.left=`${pos.x+offsetX}px`;
        node.style.top=`${pos.y+offsetY}px`;
        const onscreen=pos.x+offsetX > -120 && pos.x+offsetX < w+120 && pos.y+offsetY > -100 && pos.y+offsetY < h+100;
        node.style.display=onscreen?'block':'none';
      }
      let originNode=pins.querySelector('.map-origin-dot');
      if(!originNode){originNode=document.createElement('div');originNode.className='map-origin-dot';originNode.title='Your starting location';pins.appendChild(originNode);}
      originNode.style.left=`${rx}px`;originNode.style.top=`${ry}px`;
    }
    function schedule(){if(!animation)animation=requestAnimationFrame(paint);}
    function zoom(delta){z=clamp(z+delta,7,14);schedule();}
    controls.addEventListener('click',e=>{
      const b=e.target.closest('[data-mapzoom]');if(!b)return;
      e.stopPropagation();
      if(b.dataset.mapzoom==='fit')fitCourses();else zoom(Number(b.dataset.mapzoom));
      schedule();
    });
    // Pointer-based dragging works for mouse and touch, and does not interfere with marker taps.
    function pointerDown(e){
      if(e.target.closest('button,a,.map-attribution'))return;
      activePointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;isDragging=false;
      try{target.setPointerCapture(e.pointerId)}catch{}
    }
    function pointerMove(e){
      if(e.pointerId!==activePointer)return;
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      if(dx*dx+dy*dy>0){isDragging=true;const cp=project(center.lat,center.lng,z);center=unproject(cp.x-dx,cp.y-dy,z);schedule();}
      lastX=e.clientX;lastY=e.clientY;
    }
    function pointerUp(e){if(e.pointerId!==activePointer)return;activePointer=null;}
    function onWheel(e){e.preventDefault();zoom(e.deltaY<0?1:-1);}
    target.addEventListener('pointerdown',pointerDown);
    target.addEventListener('pointermove',pointerMove);
    target.addEventListener('pointerup',pointerUp);
    target.addEventListener('pointercancel',pointerUp);
    target.addEventListener('wheel',onWheel,{passive:false});
    const onResize=()=>schedule();window.addEventListener('resize',onResize);
    map={destroy(){clearTimeout(fallbackTimer);cancelAnimationFrame(animation);window.removeEventListener('resize',onResize);tileImages.clear();points.clear();}};
    paint();
  }
  function handle(act){if(!act)return;
    if(act==='home'||act==='profile'||act==='map'||act==='preview'){navigate(act);return;}
    if(act==='back'){navigate(s.screen==='course'?'map':s.screen==='timing'?'course':s.screen==='preview'?'timing':'home');return;}
    if(act==='prevWeek'||act==='nextWeek'){s.weekOffset+=act==='prevWeek'?-1:1;const d=addDay(monday(today),s.weekOffset*7);s.selectedDate=dateISO(d);render();return;}
    if(act==='toggleMonth'){s.expanded=!s.expanded;render();return;}
    if(act.startsWith('day:')){s.selectedDate=act.slice(4);s.weekOffset=Math.round((monday(parseDay(s.selectedDate))-monday(today))/(7*86400000));render();return;}
    if(act==='openFilters'){s.filterOpen=true;s.listOpen=false;render();return;}
    if(act==='closeFilters'){s.filterOpen=false;render();return;}
    if(act==='resetFilters'){s.filters={radius:15,holes:'all',minRating:0,publicOnly:true,facility:'Any',price:'Any'};render();return;}
    if(act==='toggleList'){s.listOpen=!s.listOpen;s.filterOpen=false;render();return;}
    if(act.startsWith('holes:')){s.filters.holes=act.slice(6);render();return;}
    if(act.startsWith('access:')){s.filters.publicOnly=act==='access:public';render();return;}
    if(act.startsWith('price:')){s.filters.price=act.slice(6);render();return;}
    if(act.startsWith('course:')){s.courseId=act.slice(7);s.detailTab='info';s.teeIndex=0;navigate('course');return;}
    if(act.startsWith('tab:')){s.detailTab=act.slice(4);render();return;}
    if(act.startsWith('tee:')){s.teeIndex=Number(act.slice(4))||0;render();return;}
    if(act==='startPlan'){s.draft=newDraft(currentCourse());navigate('timing');return;}
    if(act==='savePlan'){if(!s.draft?.date||!s.draft?.tee){showToast('Select a date and tee time.');return;}const p={...s.draft,id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:Date.now()};s.plans.push(p);persist();s.selectedDate=p.date;s.weekOffset=Math.round((monday(parseDay(p.date))-monday(today))/(7*86400000));navigate('home');showToast('Plan saved to My Golf Calendar');return;}
    if(act.startsWith('viewPlan:')){s.viewingId=act.slice(9);navigate('plan');return;}
    if(act==='deletePlan'){if(!window.confirm('Delete this saved plan?'))return;s.plans=s.plans.filter(p=>p.id!==s.viewingId);persist();navigate('home');showToast('Plan deleted');return;}
    if(act==='duplicatePlan'){const p=s.plans.find(x=>x.id===s.viewingId);if(!p)return;s.draft={...p,id:''};s.courseId=p.courseId;navigate('timing');return;}
    if(act==='suggestionPlan'){const c=bestSuggestion();s.courseId=c.id;s.draft=newDraft(c);navigate('timing');return;}
    if(act==='invite'){const p=s.plans.find(x=>x.id===s.viewingId),c=p&&findCourse(p.courseId);if(!p||!c)return;const txt=`Golf day: ${c.name}, ${dateLabel(p.date)}, target tee time ${prettyTime(p.tee)}. Please book the tee time separately.`;if(navigator.share){navigator.share({text:txt}).catch(()=>{});}else if(navigator.clipboard){navigator.clipboard.writeText(txt).then(()=>showToast('Plan copied')).catch(()=>showToast('Sharing unavailable'));}else{showToast('Sharing unavailable')}return;}
  }
  ROOT.addEventListener('click',ev=>{const el=ev.target.closest('[data-act]');if(el){ev.preventDefault();handle(el.dataset.act);}});
  ROOT.addEventListener('change',ev=>{const el=ev.target;if(el.dataset.draft&&s.draft){const key=el.dataset.draft;s.draft[key]=['drive','checkIn','warmUp','firstTee'].includes(key)?Number(el.value):el.value;if(key==='mode'){if(el.value==='none')s.draft.warmUp=0;else if(s.draft.warmUp===0)s.draft.warmUp=el.value==='range'?30:15;}render();return;}if(el.dataset.field==='origin'){s.originIndex=Number(el.value);render();return;}if(el.dataset.field==='radius'||el.dataset.field==='minRating'){s.filters[el.dataset.field]=Number(el.value);render();return;}if(el.dataset.field==='facility'){s.filters.facility=el.value;render();return;}});
  render();
})();
