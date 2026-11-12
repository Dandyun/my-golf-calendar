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
  const DEMO_PHOTO = 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80';
  const DEMO_PHOTO_CREDIT = 'Illustrative Unsplash image — not necessarily this course';
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
      flag:'<path d="M5 3v18M5 4c4-2 7 2 13 0v10c-6 2-9-2-13 0"/>',
      expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
      spark:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>'
    };
    return `<svg aria-hidden="true" width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[key]||''}</svg>`;
  };
  function initialPlans() {try {const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v.filter(p=>p?.date&&p?.courseId):[];}catch{return []}}
  const today = new Date();
  const s = {
    screen:'home', selectedDate:dateISO(today), weekOffset:0, expanded:false, calendarMonth:today.getMonth(),calendarYear:today.getFullYear(), mapSelectedId:null,mapSheetExpanded:false,courseFrom:'search',timingBack:'course',
    originIndex:0, courseId:'skyway', detailTab:'info',
    filterOpen:false, listOpen:false, search:'', teeIndex:0,
    filters:{radius:15,holes:'all',minRating:0,publicOnly:true,facility:'Any',price:'Any'},
    plans:initialPlans(), viewingId:null, suggested:false, toast:'',
    draft:null
  };
  let map=null, toastHandle=null;
  const currentOrigin = () => ORIGINS[s.originIndex] || {name:'Jersey City, NJ',lat:40.7282,lng:-74.0776};
  const currentCourse = () => COURSES.find(c=>c.id===s.courseId)||COURSES[0];
  const displayRating = c => c.rating === null ? 4.1 : c.rating;
  const demoScore = c => {const patterns=[4,4,3,5,4,4,3,5,4,4,4,3,5,4,4,3,5,4];const count=c.holes===9?9:18,par=c.par||count*4;let vals=patterns.slice(0,count);let delta=par-vals.reduce((a,b)=>a+b,0);let j=0;while(delta!==0&&j<90){const k=j%count;if(delta>0&&vals[k]<5){vals[k]++;delta--}else if(delta<0&&vals[k]>3){vals[k]--;delta++}j++}const avg=(c.yards||count*350)/count;return {tee:'Demo tees',note:'Illustrative sample for interaction testing — NOT an official scorecard.',source:'',holes:vals.map((pr,i)=>({hole:i+1,par:pr,yards:Math.max(115,Math.round((avg + (i%4-1.5)*35)/5)*5),hcp:i+1}))};};
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
  function nav(active){const tab=active||((s.screen==='home'||s.screen==='week')?'calendar':s.screen==='profile'?'profile':'search');return `<nav class="bottom-nav bottom-nav-v5" aria-label="Main navigation"><button type="button" data-act="home" class="${tab==='calendar'?'active':''}" aria-label="Calendar">${icon('calendar',27)}</button><button type="button" data-act="searchPage" class="${tab==='search'?'active':''}" aria-label="Search courses">${icon('flag',27)}</button><button type="button" data-act="profile" class="${tab==='profile'?'active':''}" aria-label="Profile">${icon('profile',27)}</button></nav>`;}
  const btn=(label,act,outline=false)=>`<button class="btn ${outline?'outline':''}" data-act="${act}">${label}</button>`;
  function week(){const mon=monday(today),days=Array.from({length:7},(_,i)=>addDay(addDay(mon,s.weekOffset*7),i));return `<div class="calendar-caption"><h2>${dateLabel(s.selectedDate,{month:'long',year:'numeric'})}</h2><div class="week-controls"><button data-act="prevWeek" aria-label="Previous week">${icon('back',16)}</button><button data-act="toggleMonth" aria-label="Expand calendar">${icon('calendar',17)}</button><button data-act="nextWeek" aria-label="Next week">${icon('next',16)}</button></div></div><div class="week-grid">${days.map(d=>{const ds=dateISO(d),has=s.plans.some(p=>p.date===ds);return `<button class="day ${ds===s.selectedDate?'active':''}" data-act="day:${ds}"><span>${d.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${d.getDate()}</b>${has?'<i aria-label="Has plan"></i>':''}</button>`;}).join('')}</div>`;}
  function month(){const year=s.calendarYear,m=s.calendarMonth;const first=new Date(year,m,1),last=new Date(year,m+1,0).getDate(),offset=(first.getDay()+6)%7;let cells=Array.from({length:offset},()=>'<span class="month-blank" aria-hidden="true"></span>');for(let i=1;i<=last;i++){const d=new Date(year,m,i),iso=dateISO(d),has=s.plans.some(p=>p.date===iso);cells.push(`<button type="button" class="day month-square ${has?'with-plan':''} ${iso===dateISO(today)?'today':''}" data-act="day:${iso}" aria-label="${dateLabel(iso)}${has?', saved plan':''}"><span>${d.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${i}</b>${has?'<i></i>':''}</button>`);}return `<div class="month-grid-v5">${cells.join('')}</div>`;}
  function planCard(p,suggested=false){const c=findCourse(p.courseId)||COURSES[0],ts=steps(p);return `<div class="plan-card ${suggested?'suggested':''}"><div class="plan-card-top"><span class="card-tag">${suggested?'Suggested':'Plan saved'}</span>${suggested?`<button data-act="addSuggestion" class="suggest-add" type="button" aria-label="Add suggested plan">${icon('plus',15)} Add</button>`:''}</div><button type="button" class="plan-card-link" data-act="${suggested?'suggestionPlan':'viewPlan:'+p.id}"><h3>${esc(c.name)}</h3><p>${p.mode==='none'?'No practice':p.mode==='range'?'On-site range warm-up':'Warm-up'} + ${c.holes} holes</p><dl><div><dt>Leave</dt><dd>${prettyTime(ts[0].time)}</dd></div><div><dt>Arrive</dt><dd>${prettyTime(ts[1].time)}</dd></div><div><dt>Target tee time</dt><dd>${prettyTime(p.tee)}</dd></div></dl></button></div>`;}
  function calendarControls(monthly=false){const yr=monthly?s.calendarYear:parseDay(s.selectedDate).getFullYear(),mo=monthly?s.calendarMonth:parseDay(s.selectedDate).getMonth();return `<div class="calendar-caption calendar-caption-v5"><h2>${new Date(yr,mo,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h2><div class="week-controls"><button data-act="${monthly?'prevMonth':'prevWeek'}" aria-label="Previous">${icon('back',18)}</button><button data-act="${monthly?'goCurrentMonth':'home'}" aria-label="Current month">${icon('calendar',19)}</button><button data-act="${monthly?'nextMonth':'nextWeek'}" aria-label="Next">${icon('next',18)}</button></div></div>`;}
  function home(){return `<section class="home-content month-home"><h1>My Golf Calendar</h1>${calendarControls(true)}${month()}</section>${nav('calendar')}`;}
  function weekPage(){const todays=s.plans.filter(p=>p.date===s.selectedDate).sort((a,b)=>a.tee.localeCompare(b.tee));const suggestion=bestSuggestion(),sample=newDraft(suggestion);const mondayStart=monday(parseDay(s.selectedDate));let days=Array.from({length:7},(_,i)=>addDay(mondayStart,i));return `<section class="home-content week-page"><div class="week-page-top"><button data-act="home" class="back-button" aria-label="Back to calendar">${icon('back',22)} Calendar</button></div><h1>My Golf Calendar</h1>${calendarControls(false)}<div class="week-grid week-grid-v5">${days.map(d=>{const ds=dateISO(d),has=s.plans.some(p=>p.date===ds);return `<button class="day ${ds===s.selectedDate?'active':''}" data-act="day:${ds}"><span>${d.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${d.getDate()}</b>${has?'<i></i>':''}</button>`;}).join('')}</div><p class="selected-date-label">${dateLabel(s.selectedDate)}</p>${todays.length===0?`<div class="suggest-section first-suggestion"><div class="suggest-heading"><h2>${icon('spark',20)} Smart suggestion</h2><span>Rule-based example</span></div><p>Based on nearby public courses and practice facilities.</p>${planCard(sample,true)}</div><div class="empty-state"><h2>No plans</h2>${btn(`${icon('plus',17)} Create a new plan`,'map')}</div>`:`<div class="home-list saved-week-list">${todays.map(p=>planCard(p)).join('')}<div class="add-plan-row">${btn(`${icon('plus',17)} Create another plan`,'map',true)}</div></div>`}</section>${nav('calendar')}`;}
  function searchResults(){const q=s.search.trim().toLowerCase();const list=COURSES.filter(c=>!q||(`${c.name} ${c.city} ${c.address}`).toLowerCase().includes(q));return list.length?list.map((c,i)=>`<button class="search-course-card" data-act="searchCourse:${c.id}" type="button"><div class="search-course-thumb">${courseImg(c)}<span class="search-suggest-tag">${q?'Course':'Suggested'}</span></div><div class="search-course-main"><div><h2>${esc(c.name)}</h2><p class="search-pricing">${esc(c.price)} <span>·</span> <span class="rating-star">★ ${displayRating(c).toFixed(1)}</span> <small>demo rating</small></p><p class="search-course-location">${icon('pin',15)} ${esc(c.city)}</p></div><span class="search-chevron">${icon('next',24)}</span></div></button>`).join(''):`<div class="search-no-results">No courses found. Try a different name.</div>`;}
  function searchPage(){return `<section class="search-page"><h1>Search Course</h1><div class="search-top-row"><label class="course-search-input">${icon('search',20)} <input id="searchCourseInput" type="search" placeholder="Enter Course" autocomplete="off" aria-label="Search courses by name" value="${esc(s.search)}" /></label><button class="course-map-round" data-act="map" aria-label="View course map">${icon('map',26)}<span>Map</span></button></div><div class="section-divider"></div><div class="course-results-title">Suggested courses <span>${COURSES.length} courses</span></div><div id="searchResults">${searchResults()}</div></section>${nav('search')}`;}
  function courseImg(c){const url=c.image||DEMO_PHOTO;return `<img class="course-img" src="${esc(url)}" alt="Illustrative golf course photograph" loading="lazy" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='${DEMO_PHOTO}';}else{this.style.display='none';}"/><span class="course-image-fallback" aria-hidden="true"><img src="./assets/demo-golf-landscape.svg" alt="" /></span>`;}

  function chip(txt,act){return `<button class="chip" data-act="${act}">${txt}</button>`;}
  function mapScreen(){const count=filtered().length;return `<section class="map-page"><div id="map" class="map-canvas" aria-label="Interactive map of New Jersey golf courses"><div class="map-loading">${icon('map',28)}<p>Loading map…</p></div></div><div class="map-top"><label class="map-location">${icon('pin',17)}<select aria-label="Starting location" data-field="origin">${ORIGINS.map((o,i)=>`<option value="${i}" ${i===s.originIndex?'selected':''}>${esc(o.name)}</option>`).join('')}</select></label><div class="map-filter-row map-filter-v5"><div class="filter-scroll" aria-label="Applied filters">${chip(s.filters.holes==='all'?'All holes':s.filters.holes+' Holes','openFilters')}${chip(`${s.filters.radius}mi radius`,'openFilters')}${chip(s.filters.minRating?'Rating '+s.filters.minRating.toFixed(1)+'+':'Any rating','openFilters')}${chip(s.filters.publicOnly?'Public':'All access','openFilters')}${s.filters.facility!=='Any'?chip(s.filters.facility,'openFilters'):''}</div><button class="filter-icon fixed-filter" data-act="openFilters" aria-label="Filter courses">${icon('filter',22)}</button></div></div>${!s.mapSelectedId?`<div class="map-bottom"><button class="map-list-toggle" data-act="toggleList">${icon('search',16)} ${count} matching courses</button><div class="map-bottom-nav-v5">${nav('search')}</div></div>`:''}${s.mapSelectedId?mapCourseSheet():''}${s.listOpen?`<div class="course-list-sheet"><div class="sheet-heading"><h2>Nearby courses</h2><button data-act="toggleList">${icon('close')}</button></div>${count?filtered().map(c=>`<button class="course-list-item" data-act="course:${c.id}"><b>${esc(c.name)}</b><span>${c.price} · ★ ${displayRating(c).toFixed(1)} · ${distance(currentOrigin(),c).toFixed(1)}mi</span>${icon('next')}</button>`).join(''):'<p>No courses match these filters. Adjust your requirements.</p>'}</div>`:''}${s.filterOpen?filterSheet():''}</section>`;}
  function mapCourseSheet(){const c=currentCourse();return `<div id="mapCourseSheet" class="map-course-sheet ${s.mapSheetExpanded?'expanded':''}" role="dialog" aria-label="${esc(c.name)} details"><button class="sheet-grip" data-act="toggleMapSheet" aria-label="Expand or collapse course details"><span></span></button><div class="map-sheet-header"><div><p class="eyebrow">Course details</p><h2>${esc(c.name)}</h2><span>${icon('pin',14)} ${esc(c.city)}</span></div><div class="map-sheet-header-actions"><button data-act="toggleMapSheet" aria-label="Expand details">${icon('expand',19)}</button><button data-act="closeMapCourse" aria-label="Close details">${icon('close',22)}</button></div></div><div class="map-sheet-inner">${courseBody(c,true)}</div></div>`;}

  function filterSheet(){const f=s.filters;return `<div class="sheet-backdrop" data-act="closeFilters"></div><section class="filter-sheet" role="dialog" aria-modal="true" aria-label="Set my needs"><div class="sheet-heading"><button data-act="closeFilters">Cancel</button><h2>Must keep</h2><button data-act="resetFilters">Clear all</button></div><div class="sheet-scroll"><h3>Number of holes</h3><div class="choice-grid">${[['all','Any'],['9','9 holes'],['18','18 holes']].map(([v,t])=>`<button class="choice ${f.holes===v?'active':''}" data-act="holes:${v}">${t}</button>`).join('')}</div><h3>Access</h3><div class="choice-grid two"><button class="choice ${f.publicOnly?'active':''}" data-act="access:public">Public only</button><button class="choice ${!f.publicOnly?'active':''}" data-act="access:all">Include private</button></div><h3>Distance</h3><div class="slider-label"><span>Radius from starting point</span><strong>${f.radius} mi</strong></div><input type="range" data-field="radius" min="5" max="50" step="5" value="${f.radius}"/><h3>Community review rating</h3><div class="slider-label"><span>Minimum score</span><strong>${f.minRating?f.minRating.toFixed(1)+'+':'Any'}</strong></div><input type="range" data-field="minRating" min="0" max="4.5" step="0.5" value="${f.minRating}"/><h3>Estimated price tier</h3><div class="choice-grid four">${['Any','$','$$','$$$'].map(v=>`<button class="choice ${f.price===v?'active':''}" data-act="price:${v}">${v}</button>`).join('')}</div><h3>Facility</h3><select data-field="facility" class="input">${['Any','Driving range','Putting green','Golf carts','Club rentals','Restaurant','Lessons','Pro shop'].map(v=>`<option ${f.facility===v?'selected':''}>${v}</option>`).join('')}</select><p class="muted small">Radius is measured in straight-line miles, not driving distance. Distances are straight-line estimates. Course fees, reviews and amenities may change.</p></div><div class="sheet-foot"><span>${filtered().length} courses</span>${btn('Show courses','closeFilters')}</div></section>`;}
  function photo(c){return `<div class="course-photo photo-v5">${courseImg(c)}<span class="photo-credit">${c.image?'Course image / site preview':'Illustrative course photo'}</span></div>`;}
  function scorecard(c){const chosen=c.apiTees?.[s.teeIndex];const card=chosen?.holes?.length?{tee:chosen.name,note:`${chosen.yards||'—'} yards · Par ${chosen.par||'—'} · Course rating ${chosen.rating||'—'} · Slope ${chosen.slope||'—'} (tee-specific)`,source:'https://golfcourseapi.com/',holes:chosen.holes}:(c.scorecard||demoScore(c));if(!card)return `<div class="no-score"><h3>Scorecard</h3><p>A verified hole-by-hole scorecard isn't included for this course.</p><a class="inline-link" href="${esc(c.scorecardUrl)}" target="_blank" rel="noopener noreferrer">Visit course scorecard source ${icon('external',15)}</a></div>`;
    const holes=card.holes;return `<div class="scorecard">${c.apiTees?.length?`<div class="tee-picker"><strong>Choose tee</strong><div class="tee-scroll">${c.apiTees.map((t,i)=>`<button type="button" data-act="tee:${i}" class="tee-chip ${s.teeIndex===i?'active':''}">${esc(t.name)}</button>`).join('')}</div></div>`:''}<h3>${esc(card.tee)} · ${holes.length} holes</h3><p class="muted">${esc(card.note)}</p><div class="table-wrap"><table><thead><tr><th>Hole</th>${holes.map(h=>`<th>${h.hole}</th>`).join('')}<th>Σ</th></tr></thead><tbody><tr><th>Par</th>${holes.map(h=>`<td>${h.par}</td>`).join('')}<th>${holes.reduce((a,b)=>a+b.par,0)}</th></tr><tr><th>Yards</th>${holes.map(h=>`<td>${h.yards}</td>`).join('')}<th>${holes.reduce((a,b)=>a+b.yards,0)}</th></tr>${holes.some(h=>h.hcp)?`<tr><th>HCP</th>${holes.map(h=>`<td>${h.hcp||'—'}</td>`).join('')}<th>—</th></tr>`:''}</tbody></table></div>${card.source?`<a class="inline-link" href="${esc(card.source)}" target="_blank" rel="noopener noreferrer">Published source ${icon('external',15)}</a>`:`<p class="scorecard-demo-note">Demo scorecard for testing navigation; numbers are illustrative.</p>`}</div>`;}
  function courseBody(c,embedded=false){return `${photo(c)}<div class="course-buttons">${btn(`${icon('plus',20)} Create a plan`,'startPlan')}</div><div class="course-tabs">${[['info','Details'],['scorecard','Scorecard'],['preview','Preview']].map(([id,t])=>`<button class="${s.detailTab===id?'active':''}" data-act="tab:${id}">${t}</button>`).join('')}</div>${s.detailTab==='scorecard'?scorecard(c):s.detailTab==='preview'?`<div class="course-text course-preview-body"><h3>Course preview</h3><p>${esc(c.highlight)}</p><div class="course-hole-layout"><img src="./assets/hole-layout.png" alt="Illustrative sample of golf course layout"/><div class="map-illustration-label">Illustrative sample · not actual course geometry</div></div><p>${esc(c.description)}</p><a class="inline-link" href="${esc(c.website)}" target="_blank" rel="noopener noreferrer">Official course photos and details ${icon('external',15)}</a><a class="inline-link" href="https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=15/${c.lat}/${c.lng}" target="_blank" rel="noopener noreferrer">View course location ${icon('external',15)}</a></div>`:`<div class="course-facts">${[['Access',c.access],['Holes',c.holes],['Par',c.par],['Length',c.yards.toLocaleString()+' yd'],['Slope',c.slope||'—'],['Course rating',c.courseRating||'—']].map(([l,v])=>`<div><small>${l}</small><b>${esc(v)}</b></div>`).join('')}</div><div class="rating-card"><b>${icon('star',19)} ${displayRating(c).toFixed(1)}</b><span>Illustrative community rating (prototype)</span></div>${c.operatingNote?`<p class="notice">${icon('info',16)} ${esc(c.operatingNote)}</p>`:''}<div class="course-text"><h3>About this course</h3><p>${esc(c.description)}</p><h3>Facilities</h3><div class="facility-list">${c.facilities.map(x=>`<span>${icon('check',14)} ${esc(x)}</span>`).join('')}</div><p class="muted">${esc(c.facilitiesNote)}</p><h3>Price</h3><p><strong>${esc(c.price)}</strong> · ${esc(c.priceNote)}</p><h3>Facility information</h3><a class="inline-link" href="${esc(c.website)}" target="_blank" rel="noopener noreferrer">Official website ${icon('external',15)}</a>${c.phone?`<a class="inline-link" href="tel:${esc(c.phone)}">Call ${esc(c.phone)}</a>`:''}</div>`}`;}
  function courseScreen(){const c=currentCourse();return `${topbar('Search course')}<section class="details-content"><h1>${esc(c.name)}</h1><p class="course-address">${icon('pin',15)} ${esc(c.address)}</p>${courseBody(c)}</section>`;}
  function field(label,html,hint=''){return `<label class="field"><span>${label}</span>${html}${hint?`<small>${hint}</small>`:''}</label>`;}
  function options(name,values,selected,suffix=''){return `<select class="input" data-draft="${name}">${values.map(v=>`<option value="${v}" ${String(selected)===String(v)?'selected':''}>${v}${suffix}</option>`).join('')}</select>`;}
  function timing(){const p=s.draft,c=findCourse(p.courseId);return `${topbar('Choose course')}<section class="form-content"><h1>Build around<br> your tee time.</h1>${field('Planned date',`<input class="input" type="date" data-draft="date" value="${p.date}"/>`)}${field('Target tee time',`<input class="input" type="time" data-draft="tee" value="${p.tee}"/>`,'A time you’re considering or have booked elsewhere.')}${field('Driving time to the course',options('drive',[10,15,20,25,30,35,40,45,50,60,75,90,120],p.drive,' minutes'),'Sample estimate; adjust for your starting point and traffic.')}<div class="form-two">${field('Check-in buffer',options('checkIn',[5,10,15,20,25,30],p.checkIn,' min'))}${field('Get to first tee',options('firstTee',[5,10,15,20,25],p.firstTee,' min'))}</div>${field('Warm-up type',`<select class="input" data-draft="mode"><option value="range" ${p.mode==='range'?'selected':''}>Driving range</option><option value="putting" ${p.mode==='putting'?'selected':''}>Putting green</option><option value="none" ${p.mode==='none'?'selected':''}>No practice</option></select>`)}${p.mode==='none'?'':field('Warm-up time',options('warmUp',[0,10,15,20,30,40,45,60],p.warmUp,' minutes'))}${p.mode==='range'&&!c.facilities.includes('Driving range')?'<p class="notice">A driving range is not verified at this course. Check with the facility.</p>':''}<div class="arrival-summary"><b>Suggested arrival: ${prettyTime(steps(p)[1].time)}</b><p>Leave at ${prettyTime(steps(p)[0].time)}. Allow for check-in${p.mode==='none'?'': ' and warm-up'}.</p></div>${btn('Preview my day '+icon('next',17),'preview')}</section>`;}
  function preview(){const p=s.draft,c=findCourse(p.courseId);return `${topbar('Edit timing')}<section class="preview-content"><h1>${esc(c.name)}<br>planned.</h1><p class="date-subtitle">${dateLabel(p.date)}</p><div class="arrival-summary"><h3>Arrive at ${prettyTime(steps(p)[1].time)}</h3><p>Check-in${p.mode==='none'?'': ' and warm-up'} included before your target tee time.</p></div>${timeline(p)}${btn('Save to My Golf Calendar','savePlan')}</section>`;}
  function savedPlan(){const p=s.plans.find(x=>x.id===s.viewingId);if(!p){s.screen='home';return home();}const c=findCourse(p.courseId)||COURSES[0];return `${topbar('My Golf Calendar')}<section class="saved-content"><div class="saved-heading"><div><h1>${esc(c.name)}</h1><h2>${dateLabel(p.date,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</h2></div><button data-act="invite" class="share-round" aria-label="Share itinerary">${icon('share',23)}</button></div>${photo(c)}${timeline(p)}<div class="saved-actions">${btn('Use as new plan','duplicatePlan',true)}<button data-act="deletePlan" class="danger-button">${icon('trash',17)} Delete saved plan</button></div></section>`;}
  function profile(){return `${topbar('Plans')}<section class="profile-content"><div class="profile-icon">${icon('profile',34)}</div><h1>My Golf Calendar</h1><p class="muted">Plan golf days, not reservations.</p><div class="profile-summary">${icon('calendar',22)}<div><b>${s.plans.length} saved plans</b><small>Stored in this browser only</small></div></div><div class="profile-summary">${icon('pin',22)}<div><b>${esc(currentOrigin().name)}</b><small>Sample starting location</small></div></div><h2>Your saved plans</h2>${s.plans.length?s.plans.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(p=>`<button class="profile-plan" data-act="viewPlan:${p.id}">${dateLabel(p.date,{month:'short',day:'numeric',year:'numeric'})} · ${esc(findCourse(p.courseId)?.shortName||'Golf')} ${icon('next',17)}</button>`).join(''):'<p class="muted">No saved plans yet.</p>'}<p class="notice">No account or database. Plans are lost if this browser’s site data is cleared. Map tiles require internet.</p>${btn('Create a new plan','map')}</section>${nav('profile')}`;}
  function render(){if(map){map.destroy();map=null;}
    let content='';switch(s.screen){case 'home':content=home();break;case 'week':content=weekPage();break;case 'search':content=searchPage();break;case 'map':content=mapScreen();break;case 'course':content=courseScreen();break;case 'timing':content=timing();break;case 'preview':content=preview();break;case 'plan':content=savedPlan();break;case 'profile':content=profile();break;default:content=home();}
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
          node.setAttribute('aria-label',`${c.name}, ${c.price}, ${'demo rating '+displayRating(c).toFixed(1)}`);
          const rating='★ '+displayRating(c).toFixed(1);
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
    if(act==='home'){navigate('home');return;}
    if(act==='searchPage'){s.mapSelectedId=null;s.search='';navigate('search');return;}
    if(act==='map'){s.mapSelectedId=null;s.mapSheetExpanded=false;s.listOpen=false;s.search='';navigate('map');return;}
    if(act==='profile'){navigate('profile');return;}
    if(act==='preview'){navigate('preview');return;}
    if(act==='back'){
      if(s.screen==='course')navigate(s.courseFrom==='map'?'map':'search');
      else if(s.screen==='timing')navigate(s.timingBack==='map'?'map':'course');
      else if(s.screen==='preview')navigate('timing');
      else if(s.screen==='plan')navigate('week');
      else if(s.screen==='week')navigate('home');
      else navigate('home');return;
    }
    if(act==='prevMonth'||act==='nextMonth'){let d=new Date(s.calendarYear,s.calendarMonth+(act==='prevMonth'?-1:1),1);s.calendarYear=d.getFullYear();s.calendarMonth=d.getMonth();render();return;}
    if(act==='goCurrentMonth'){s.calendarMonth=today.getMonth();s.calendarYear=today.getFullYear();render();return;}
    if(act==='prevWeek'||act==='nextWeek'){s.selectedDate=dateISO(addDay(parseDay(s.selectedDate),act==='prevWeek'?-7:7));render();return;}
    if(act.startsWith('day:')){const iso=act.slice(4),changed=s.selectedDate!==iso;s.selectedDate=iso;if(s.screen==='home'){navigate('week');}else if(s.screen==='week'){render();}else{navigate('week');}return;}
    if(act==='openFilters'){s.filterOpen=true;s.listOpen=false;render();return;}
    if(act==='closeFilters'){s.filterOpen=false;render();return;}
    if(act==='resetFilters'){s.filters={radius:15,holes:'all',minRating:0,publicOnly:true,facility:'Any',price:'Any'};render();return;}
    if(act==='toggleList'){s.listOpen=!s.listOpen;s.filterOpen=false;render();return;}
    if(act.startsWith('holes:')){s.filters.holes=act.slice(6);render();return;}
    if(act.startsWith('access:')){s.filters.publicOnly=act==='access:public';render();return;}
    if(act.startsWith('price:')){s.filters.price=act.slice(6);render();return;}
    if(act.startsWith('searchCourse:')){s.courseId=act.split(':')[1];s.courseFrom='search';s.detailTab='info';s.teeIndex=0;navigate('course');return;}
    if(act.startsWith('course:')){s.courseId=act.split(':')[1];s.mapSelectedId=s.courseId;s.courseFrom='map';s.detailTab='info';s.mapSheetExpanded=false;s.listOpen=false;s.teeIndex=0;render();return;}
    if(act==='closeMapCourse'){s.mapSelectedId=null;s.mapSheetExpanded=false;render();return;}
    if(act==='toggleMapSheet'){s.mapSheetExpanded=!s.mapSheetExpanded;render();return;}
    if(act.startsWith('tab:')){s.detailTab=act.slice(4);render();return;}
    if(act.startsWith('tee:')){s.teeIndex=Number(act.slice(4))||0;render();return;}
    if(act==='startPlan'){s.draft=newDraft(currentCourse());s.timingBack=s.screen==='map'?'map':'course';navigate('timing');return;}
    if(act==='savePlan'){if(!s.draft?.date||!s.draft?.tee){showToast('Select a date and tee time.');return;}const p={...s.draft,id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:Date.now()};s.plans.push(p);persist();s.selectedDate=p.date;s.calendarYear=parseDay(p.date).getFullYear();s.calendarMonth=parseDay(p.date).getMonth();navigate('week');showToast('Plan saved');return;}
    if(act.startsWith('viewPlan:')){s.viewingId=act.slice(9);navigate('plan');return;}
    if(act==='deletePlan'){if(!window.confirm('Delete this saved plan?'))return;s.plans=s.plans.filter(p=>p.id!==s.viewingId);persist();navigate('week');showToast('Plan deleted');return;}
    if(act==='duplicatePlan'){const p=s.plans.find(x=>x.id===s.viewingId);if(!p)return;s.draft={...p,id:''};s.courseId=p.courseId;s.timingBack='course';navigate('timing');return;}
    if(act==='suggestionPlan'){const c=bestSuggestion();s.courseId=c.id;s.draft=newDraft(c);s.timingBack='course';navigate('timing');return;}
    if(act==='addSuggestion'){if(s.plans.some(p=>p.date===s.selectedDate))return;const c=bestSuggestion(),p={...newDraft(c),id:`${Date.now()}-suggest`,createdAt:Date.now()};s.plans.push(p);persist();render();showToast('Suggested plan added');return;}
    if(act==='invite'){const p=s.plans.find(x=>x.id===s.viewingId),c=p&&findCourse(p.courseId);if(!p||!c)return;const txt=`Golf day: ${c.name}, ${dateLabel(p.date)}, target tee time ${prettyTime(p.tee)}.`;if(navigator.share){navigator.share({text:txt}).catch(()=>{});}else if(navigator.clipboard){navigator.clipboard.writeText(txt).then(()=>showToast('Itinerary copied')).catch(()=>showToast('Sharing unavailable'));}else{showToast('Sharing unavailable')}return;}
  }

  ROOT.addEventListener('click',ev=>{const el=ev.target.closest('[data-act]');if(el){ev.preventDefault();handle(el.dataset.act);}});
  ROOT.addEventListener('change',ev=>{const el=ev.target;if(el.dataset.draft&&s.draft){const key=el.dataset.draft;s.draft[key]=['drive','checkIn','warmUp','firstTee'].includes(key)?Number(el.value):el.value;if(key==='mode'){if(el.value==='none')s.draft.warmUp=0;else if(s.draft.warmUp===0)s.draft.warmUp=el.value==='range'?30:15;}render();return;}if(el.dataset.field==='origin'){s.originIndex=Number(el.value);render();return;}if(el.dataset.field==='radius'||el.dataset.field==='minRating'){s.filters[el.dataset.field]=Number(el.value);render();return;}if(el.dataset.field==='facility'){s.filters.facility=el.value;render();return;}});
  ROOT.addEventListener('input',ev=>{if(ev.target.id==='searchCourseInput'){s.search=ev.target.value;const results=document.getElementById('searchResults');if(results)results.innerHTML=searchResults();}});
  let sheetStartY=null;
  ROOT.addEventListener('touchstart',ev=>{const grip=ev.target.closest('#mapCourseSheet .sheet-grip, #mapCourseSheet .map-sheet-header');if(grip)sheetStartY=ev.touches[0]?.clientY??null;},{passive:true});
  ROOT.addEventListener('touchend',ev=>{if(sheetStartY===null)return;const y=ev.changedTouches[0]?.clientY??sheetStartY,dy=y-sheetStartY;sheetStartY=null;if(dy<-55&&!s.mapSheetExpanded){s.mapSheetExpanded=true;render();}else if(dy>55&&s.mapSheetExpanded){s.mapSheetExpanded=false;render();}else if(dy>100&&!s.mapSheetExpanded){s.mapSelectedId=null;render();}},{passive:true});
  render();
})();
