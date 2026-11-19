#!/usr/bin/env python3
"""Apply only the seven requested UI changes to the checked-out golf calendar.

At deployment time this reads the repository's OWN site/app.js, retains
courseBody()/its custom hole-layout markup byte-for-byte, and writes the
updated temporary copy used by GitHub Pages. Idempotent for reruns.
"""
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'site'/'app.js'
HTML=ROOT/'site'/'index.html'
VERSION='/* golf-p6: 2026-11-19 */'


def replace_between(source, start, end, replacement):
    i=source.find(start)
    if i<0: raise ValueError(f'Cannot find start marker: {start!r}')
    j=source.find(end,i+len(start))
    if j<0: raise ValueError(f'Cannot find end marker: {end!r}')
    return source[:i]+replacement.rstrip()+"\n"+source[j:]

def replace_once(source, old, new):
    count=source.count(old)
    if count!=1: raise ValueError(f'Expected one occurrence, got {count}: {old[:110]!r}')
    return source.replace(old,new,1)

FUNCTIONS={
'newDraft': r'''  function newDraft(c){
    const hasRange=c.facilities.includes('Driving range');
    return {id:'',courseId:c.id,date:s.selectedDate,tee:'11:00',drive:driveEstimate(c),checkIn:10,
      warmUp:hasRange?30:15,rangeMinutes:30,puttingMinutes:15,
      firstTee:10,mode:hasRange?'range':'putting',notes:''};
  }''',
'steps': r'''  function steps(p){
    const useRange=p.mode==='range'||p.mode==='both';
    const usePutting=p.mode==='putting'||p.mode==='both';
    const rangeMinutes=useRange?Math.max(0,Number(p.rangeMinutes ?? (p.mode==='range'?p.warmUp:30))||0):0;
    const puttingMinutes=usePutting?Math.max(0,Number(p.puttingMinutes ?? (p.mode==='putting'?p.warmUp:15))||0):0;
    const warm=rangeMinutes+puttingMinutes;
    const leave=offsetTime(p.tee,-p.drive-p.checkIn-warm-p.firstTee);
    const arrival=offsetTime(leave,p.drive);
    const firstWarm=offsetTime(arrival,p.checkIn);
    const toFirstTee=offsetTime(p.tee,-p.firstTee);
    const events=[
      {time:leave,title:'Leave your starting point',desc:`${p.drive}-minute estimated drive`},
      {time:arrival,title:'Arrive and check in',desc:`Allow ${p.checkIn} minutes`}
    ];
    if(useRange&&rangeMinutes){events.push({time:firstWarm,title:'Warm up at the range',desc:`${rangeMinutes} minutes`});}
    if(usePutting&&puttingMinutes){events.push({time:offsetTime(firstWarm,rangeMinutes),title:'Warm up on the putting green',desc:`${puttingMinutes} minutes`});}
    events.push({time:toFirstTee,title:'Head to the first tee',desc:`Allow ${p.firstTee} minutes`});
    events.push({time:p.tee,title:'Target tee time',desc:'Confirm your reservation separately.'});
    return events;
  }''',
'savedPlansOnHome': r'''  function savedPlansOnHome(){
    const plans=[...s.plans].sort((a,b)=>a.date.localeCompare(b.date)||(a.tee||'').localeCompare(b.tee||''));
    const row=p=>{
      const c=findCourse(p.courseId);if(!c)return '';
      const label=dateLabel(p.date,{month:'short',day:'numeric',year:'numeric'});
      return `<button type="button" class="home-saved-row" data-act="viewPlan:${esc(p.id)}" aria-label="View ${esc(c.name)} on ${esc(label)}"><span>${esc(label)} · ${esc(c.shortName||c.name)}</span><span class="home-saved-chevron">${icon('next',19)}</span></button>`;
    };
    const shown=plans.slice(0,2).map(row).join('');
    const peek=plans.length>2?`<div class="saved-plans-peek" aria-hidden="true">${row(plans[2])}</div>`:'';
    return `<section class="home-saved-plans saved-plans-above" aria-labelledby="saved-plans-title"><button type="button" class="saved-plans-heading" data-act="allSavedPlans" aria-label="Open all saved plans"><h2 id="saved-plans-title">Your saved plans</h2><span class="saved-plans-arrow">${icon('next',22)}</span></button>${shown}${peek}${plans.length===0?'<p class="home-saved-empty">No saved plans yet.</p>':''}</section>`;
  }''',
'home': r'''  function home(){return `<section class="home-content month-home"><h1>My Golf Calendar</h1>${savedPlansOnHome()}${calendarControls(true)}${month()}</section>${nav('calendar')}`;}''',
'weekPage': r'''  function weekPage(){
    const todays=s.plans.filter(p=>p.date===s.selectedDate).sort((a,b)=>a.tee.localeCompare(b.tee));
    const suggestion=bestSuggestion(),sample=newDraft(suggestion);
    const mondayStart=monday(parseDay(s.selectedDate));
    const days=Array.from({length:7},(_,i)=>addDay(mondayStart,i));
    return `<section class="home-content week-page"><div class="week-page-top"><button data-act="home" class="back-button" aria-label="Back to month calendar">${icon('back',22)} Calendar</button></div><h1>My Golf Calendar</h1>${calendarControls(false)}<div class="week-grid week-grid-v5">${days.map(d=>{const ds=dateISO(d),has=s.plans.some(p=>p.date===ds);return `<button class="day ${ds===s.selectedDate?'active':''}" data-act="day:${ds}"><span>${d.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${d.getDate()}</b>${has?'<i></i>':''}</button>`;}).join('')}</div><p class="selected-date-label">${dateLabel(s.selectedDate)}</p>${todays.length===0?`<div class="suggest-section first-suggestion">${planCard(sample,true)}</div><div class="empty-state"><h2>No plans</h2>${btn(`${icon('plus',17)} Create a new plan`,'searchPage')}</div>`:`<div class="home-list saved-week-list">${todays.map(p=>planCard(p)).join('')}<div class="add-plan-row">${btn(`${icon('plus',17)} Create another plan`,'searchPage',true)}</div></div>`}</section>${nav('calendar')}`;
  }''',
'searchResults': r'''  function searchResults(){
    const q=s.search.trim().toLowerCase();
    const list=COURSES.filter(c=>(!q||`${c.name} ${c.city} ${c.address}`.toLowerCase().includes(q)) && (!s.searchSavedOnly||s.savedCourseIds.includes(c.id)));
    return list.length?list.map(c=>{
      const saved=s.savedCourseIds.includes(c.id);
      return `<article class="search-course-card"><div class="search-course-thumb"><button type="button" class="search-course-photo-action" data-act="searchCourse:${c.id}" aria-label="View ${esc(c.name)}">${courseImg(c)}</button><button type="button" class="course-save-button ${saved?'saved':''}" data-act="toggleSavedCourse:${c.id}" aria-label="${saved?'Unsave':'Save'} ${esc(c.name)}">${icon(saved?'check':'plus',17)} ${saved?'Saved':'Save'}</button></div><button type="button" class="search-course-row-action" data-act="searchCourse:${c.id}"><div class="search-course-main"><div><h2>${esc(c.name)}</h2><p class="search-pricing">${esc(c.price)} <span>·</span> <span class="rating-star">★ ${displayRating(c).toFixed(1)}</span> <small>demo rating</small></p><p class="search-course-location">${icon('pin',15)} ${esc(c.city)}</p></div><span class="search-chevron">${icon('next',24)}</span></div></button></article>`;
    }).join(''):`<div class="search-no-results">${s.searchSavedOnly?'No saved courses found. Save a course using the button on its photo.':'No courses found. Try a different name.'}</div>`;
  }''',
'searchPage': r'''  function searchPage(){
    return `<section class="search-page"><h1>Search Course</h1><div class="search-top-row"><label class="course-search-input">${icon('search',20)} <input id="searchCourseInput" type="search" placeholder="Enter Course" autocomplete="off" aria-label="Search courses by name" value="${esc(s.search)}" /></label><button class="course-map-round" data-act="map" aria-label="View course map">${icon('map',26)}<span>Map</span></button></div><div class="section-divider"></div><div class="course-results-title"><span>${s.searchSavedOnly?'Saved courses':'Suggested courses'}</span><button type="button" class="saved-course-filter ${s.searchSavedOnly?'active':''}" data-act="toggleSavedOnly" aria-pressed="${s.searchSavedOnly}">${icon('check',16)} Saved</button></div><div id="searchResults">${searchResults()}</div></section>${nav('search')}`;
  }''',
'mapScreen': r'''  function mapScreen(){
    const count=filtered().length;
    return `<section class="map-page"><div id="map" class="map-canvas" aria-label="Interactive map of New Jersey golf courses"><div class="map-loading">${icon('map',28)}<p>Loading map…</p></div></div><div class="map-top"><div class="map-header-row"><button class="map-back-search" type="button" data-act="searchPage" aria-label="Back to Search Course">${icon('back',22)}</button><label class="map-location">${icon('pin',17)}<select aria-label="Starting location" data-field="origin">${ORIGINS.map((o,i)=>`<option value="${i}" ${i===s.originIndex?'selected':''}>${esc(o.name)}</option>`).join('')}</select></label></div><div class="map-filter-row map-filter-v5"><div class="filter-scroll" aria-label="Applied filters">${chip(s.filters.holes==='all'?'All holes':s.filters.holes+' Holes','openFilters')}${chip(`${s.filters.radius}mi radius`,'openFilters')}${chip(s.filters.minRating?'Rating '+s.filters.minRating.toFixed(1)+'+':'Any rating','openFilters')}${chip(s.filters.publicOnly?'Public':'All access','openFilters')}${s.filters.facility!=='Any'?chip(s.filters.facility,'openFilters'):''}</div><button class="filter-icon fixed-filter" data-act="openFilters" aria-label="Filter courses">${icon('filter',22)}</button></div></div>${!s.mapSelectedId?`<div class="map-bottom"><button class="map-list-toggle" data-act="toggleList">${icon('search',16)} ${count} matching courses</button><div class="map-bottom-nav-v5">${nav('search')}</div></div>`:''}${s.mapSelectedId?mapCourseSheet():''}${s.listOpen?`<div class="course-list-sheet"><div class="sheet-heading"><h2>Nearby courses</h2><button data-act="toggleList">${icon('close')}</button></div>${count?filtered().map(c=>`<button class="course-list-item" data-act="course:${c.id}"><b>${esc(c.name)}</b><span>${c.price} · ★ ${displayRating(c).toFixed(1)} · ${distance(currentOrigin(),c).toFixed(1)}mi</span>${icon('next')}</button>`).join(''):'<p>No courses match these filters. Adjust your requirements.</p>'}</div>`:''}${s.filterOpen?filterSheet():''}</section>`;
  }''',
'mapCourseSheet': r'''  function mapCourseSheet(){
    const c=currentCourse();
    return `<div id="mapCourseSheet" class="map-course-sheet expanded full-course-sheet" role="dialog" aria-label="${esc(c.name)} details"><div class="map-course-full-top"><button type="button" data-act="closeMapCourse" class="back-button" aria-label="Back to map">${icon('back',22)} Map</button></div><div class="map-sheet-inner"><div class="map-course-full-heading"><h1>${esc(c.name)}</h1><p class="course-address">${icon('pin',15)} ${esc(c.address)}</p></div>${courseBody(c,true)}</div></div>`;
  }''',
'timing': r'''  function timing(){
    const p=s.draft,c=findCourse(p.courseId);
    const hasRange=!!c?.facilities?.includes('Driving range');
    if(!hasRange&&(p.mode==='range'||p.mode==='both')){p.mode=p.mode==='both'?'putting':'none';}
    const rangeOn=p.mode==='range'||p.mode==='both';
    const puttingOn=p.mode==='putting'||p.mode==='both';
    const hour=Math.floor(Math.max(0,Number(p.drive)||0)/60),minute=(Math.max(0,Number(p.drive)||0))%60;
    const driveInput=`<div class="field drive-field"><span>Driving time to the course</span><div class="drive-duration-input"><label><input type="number" inputmode="numeric" min="0" max="9" step="1" data-drive-part="hours" value="${hour}" aria-label="Driving hours"/><span>hr</span></label><label><input type="number" inputmode="numeric" min="0" max="59" step="1" data-drive-part="minutes" value="${minute}" aria-label="Driving minutes"/><span>min</span></label></div><small>Enter your estimated driving time (hours and minutes).</small></div>`;
    const warmButtons=`<fieldset class="warm-mode-field"><legend>Warm-up type</legend><div class="warm-mode-buttons">${hasRange?`<button type="button" class="warm-mode-button ${rangeOn?'active':''}" aria-pressed="${rangeOn}" data-act="warmMode:range">Driving range</button>`:''}<button type="button" class="warm-mode-button ${puttingOn?'active':''}" aria-pressed="${puttingOn}" data-act="warmMode:putting">Putting green</button><button type="button" class="warm-mode-button ${p.mode==='none'?'active':''}" aria-pressed="${p.mode==='none'}" data-act="warmMode:none">No practice</button></div><small>Select both Driving range and Putting green if you want to do both.</small></fieldset>`;
    const rangeTime=rangeOn?field('Driving range time',options('rangeMinutes',[0,5,10,15,20,25,30,40,45,60],p.rangeMinutes ?? (p.mode==='range'?p.warmUp:30),' min')):'';
    const puttingTime=puttingOn?field('Putting green time',options('puttingMinutes',[0,5,10,15,20,25,30,40,45,60],p.puttingMinutes ?? (p.mode==='putting'?p.warmUp:15),' min')):'';
    return `${topbar('Choose course')}<section class="form-content"><h1>Build around<br> your tee time.</h1>${field('Planned date',`<input class="input" type="date" data-draft="date" value="${p.date}"/>`)}${field('Target tee time',`<input class="input" type="time" data-draft="tee" value="${p.tee}"/>`,'A time you’re considering or have booked elsewhere.')}${driveInput}<div class="form-two">${field('Check-in buffer',options('checkIn',[5,10,15,20,25,30],p.checkIn,' min'))}${field('Get to first tee',options('firstTee',[5,10,15,20,25],p.firstTee,' min'))}</div>${warmButtons}${rangeTime}${puttingTime}<div class="arrival-summary"><b>Suggested arrival: ${prettyTime(steps(p)[1].time)}</b><p>Leave at ${prettyTime(steps(p)[0].time)}. Allow for check-in${p.mode==='none'?'': ' and warm-up'}.</p></div>${btn('Preview my day '+icon('next',17),'preview')}</section>`;
  }''',
'allSavedPlans': r'''  function allSavedPlans(){
    const plans=[...s.plans].sort((a,b)=>a.date.localeCompare(b.date)||(a.tee||'').localeCompare(b.tee||''));
    return `<section class="home-content all-saved-page"><div class="week-page-top"><button class="back-button" type="button" data-act="home">${icon('back',22)} Calendar</button></div><h1>Your saved plans</h1><div class="all-saved-list">${plans.length?plans.map(p=>{const c=findCourse(p.courseId);if(!c)return '';const date=dateLabel(p.date,{month:'short',day:'numeric',year:'numeric'});return `<button type="button" class="home-saved-row" data-act="viewPlan:${esc(p.id)}"><span>${esc(date)} · ${esc(c.shortName||c.name)}</span><span class="home-saved-chevron">${icon('next',19)}</span></button>`;}).join(''):'<p class="home-saved-empty">No saved plans yet.</p>'}</div></section>${nav('calendar')}`;
  }'''
}


def update_app(src):
    if VERSION in src:
        return src
    src=VERSION+'\n'+src
    src=replace_once(src,"screen:'home', selectedDate:","screen:'week', selectedDate:")
    # Course preferences stay in browser storage; no new API required.
    src=replace_once(src,'  let map=null, toastHandle=null;', '''  const SAVED_COURSES_KEY='my-golf-calendar-saved-courses-v1';
  try {const saved=JSON.parse(localStorage.getItem(SAVED_COURSES_KEY)||'[]');s.savedCourseIds=Array.isArray(saved)?saved:[];}catch{s.savedCourseIds=[];}
  s.searchSavedOnly=false;
  let map=null, toastHandle=null;''')
    # Replace ONLY named functions. Crucially courseBody (custom Preview layout) is NEVER touched.
    ordered=[('newDraft','steps'),('steps','timeline'),('savedPlansOnHome','home'),('home','weekPage'),('weekPage','searchResults'),('searchResults','searchPage'),('searchPage','courseImg'),('mapScreen','mapCourseSheet'),('mapCourseSheet','filterSheet'),('timing','preview')]
    for name,following in ordered:
        src=replace_between(src,f'  function {name}(',f'  function {following}(',FUNCTIONS[name])
    src=replace_once(src,'  function profile(){',FUNCTIONS['allSavedPlans']+'\n  function profile(){')
    src=replace_once(src,"case 'home':content=home();break;", "case 'home':content=home();break;case 'allPlans':content=allSavedPlans();break;")
    src=replace_once(src,"if(act==='home'){navigate('home');return;}",'''if(act==='home'){navigate('home');return;}
    if(act==='allSavedPlans'){navigate('allPlans');return;}
    if(act==='toggleSavedOnly'){s.searchSavedOnly=!s.searchSavedOnly;render();return;}
    if(act.startsWith('toggleSavedCourse:')){const id=act.split(':')[1];const saved=new Set(s.savedCourseIds);if(saved.has(id))saved.delete(id);else saved.add(id);s.savedCourseIds=[...saved];try{localStorage.setItem(SAVED_COURSES_KEY,JSON.stringify(s.savedCourseIds));}catch{}render();return;}
    if(act.startsWith('warmMode:')){if(!s.draft)return;const v=act.slice(9);const c=findCourse(s.draft.courseId);const availableRange=!!c?.facilities?.includes('Driving range');const chosen=new Set(s.draft.mode==='both'?['range','putting']:s.draft.mode==='none'?[]:[s.draft.mode]);if(v==='none'){chosen.clear();}else if(v==='range'&&availableRange||v==='putting'){if(chosen.has(v))chosen.delete(v);else chosen.add(v);}s.draft.mode=chosen.has('range')&&chosen.has('putting')?'both':chosen.has('range')?'range':chosen.has('putting')?'putting':'none';s.draft.warmUp=(chosen.has('range')?Number(s.draft.rangeMinutes??30):0)+(chosen.has('putting')?Number(s.draft.puttingMinutes??15):0);render();return;}''')
    src=replace_once(src,"if(act.startsWith('course:')){s.courseId=act.split(':')[1];s.mapSelectedId=s.courseId;s.courseFrom='map';s.detailTab='info';s.mapSheetExpanded=false;", "if(act.startsWith('course:')){s.courseId=act.split(':')[1];s.mapSelectedId=s.courseId;s.courseFrom='map';s.detailTab='info';s.mapSheetExpanded=true;")
    src=replace_once(src,"if(act==='suggestionPlan'){const c=bestSuggestion();s.courseId=c.id;s.draft=newDraft(c);s.timingBack='course';navigate('timing');return;}", "if(act==='suggestionPlan'){const c=bestSuggestion();s.courseId=c.id;s.courseFrom='search';s.detailTab='info';s.teeIndex=0;navigate('course');return;}")
    src=replace_once(src,"ROOT.addEventListener('change',ev=>{const el=ev.target;if(el.dataset.draft&&s.draft){",'''ROOT.addEventListener('change',ev=>{const el=ev.target;
    if(el.dataset.drivePart&&s.draft){const group=el.closest('.drive-duration-input');const hours=Math.min(9,Math.max(0,Number(group?.querySelector('[data-drive-part="hours"]')?.value)||0));const minutes=Math.min(59,Math.max(0,Number(group?.querySelector('[data-drive-part="minutes"]')?.value)||0));s.draft.drive=hours*60+minutes;const summary=ROOT.querySelector('.arrival-summary');if(summary){const title=summary.querySelector('b'),detail=summary.querySelector('p'),times=steps(s.draft);if(title)title.textContent='Suggested arrival: '+prettyTime(times[1].time);if(detail)detail.textContent='Leave at '+prettyTime(times[0].time)+'. Allow for check-in'+(s.draft.mode==='none'?'':' and warm-up')+'.';}return;}
    if(el.dataset.draft&&s.draft){''')
    src=replace_once(src,"['drive','checkIn','warmUp','firstTee'].includes(key)","['drive','checkIn','warmUp','firstTee','rangeMinutes','puttingMinutes'].includes(key)")
    src=replace_once(src,"if(key==='mode'){if(el.value==='none')s.draft.warmUp=0;else if(s.draft.warmUp===0)s.draft.warmUp=el.value==='range'?30:15;}render();return;",'''if(key==='mode'){if(el.value==='none')s.draft.warmUp=0;else if(s.draft.warmUp===0)s.draft.warmUp=el.value==='range'?30:15;}
      if(key==='rangeMinutes'||key==='puttingMinutes'){const range=s.draft.mode==='range'||s.draft.mode==='both';const putting=s.draft.mode==='putting'||s.draft.mode==='both';s.draft.warmUp=(range?Number(s.draft.rangeMinutes??30):0)+(putting?Number(s.draft.puttingMinutes??15):0);}render();return;''')
    return src


# Added edit-in-place support on top of the earlier seven UI changes.
# Only targets the saved plan actions, the preview save label, and navigation.
EDIT_PLAN_VERSION='/* golf-p7: edit-existing-plan-only */'


def update_saved_plan_edit(src):
    if EDIT_PLAN_VERSION in src:
        return src
    # Keep the user's existing courseBody(), course previews, photos and CSS untouched.
    src=replace_once(src, "btn('Use as new plan','duplicatePlan',true)", "btn('Edit plan','editPlan',true)")
    src=replace_once(src, "btn('Save to My Golf Calendar','savePlan')",
        "btn(s.draft?.id?'Save changes':'Save to My Golf Calendar','savePlan')")
    # Back from the edit form returns to the existing itinerary.
    src=replace_once(src,
        "else if(s.screen==='timing')navigate(s.timingBack==='map'?'map':'course');",
        "else if(s.screen==='timing')navigate(s.draft?.id?'plan':s.timingBack==='map'?'map':'course');")
    src=replace_between(src,
        "    if(act==='savePlan'){",
        "    if(act.startsWith('viewPlan:'))",
        r'''    if(act==='savePlan'){
      if(!s.draft?.date||!s.draft?.tee){showToast('Select a date and tee time.');return;}
      // Keep the original ID while editing. Do not create a second plan.
      if(s.draft.id){
        const i=s.plans.findIndex(plan=>plan.id===s.draft.id);
        if(i<0){showToast('Saved plan no longer exists.');navigate('week');return;}
        const original=s.plans[i];
        const updated={...s.draft,id:original.id,createdAt:original.createdAt,updatedAt:Date.now()};
        s.plans[i]=updated;
        persist();
        s.viewingId=updated.id;
        s.selectedDate=updated.date;
        s.calendarYear=parseDay(updated.date).getFullYear();
        s.calendarMonth=parseDay(updated.date).getMonth();
        navigate('plan');
        showToast('Plan updated');
        return;
      }
      const p={...s.draft,id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:Date.now()};
      s.plans.push(p);
      persist();
      s.selectedDate=p.date;
      s.calendarYear=parseDay(p.date).getFullYear();
      s.calendarMonth=parseDay(p.date).getMonth();
      navigate('week');
      showToast('Plan saved');
      return;
    }''')
    src=replace_between(src,
        "    if(act==='duplicatePlan'){",
        "    if(act==='suggestionPlan'){",
        r'''    if(act==='editPlan'){
      const p=s.plans.find(x=>x.id===s.viewingId);
      if(!p){showToast('Saved plan not found.');return;}
      // Copy fields for editing; only Save changes updates localStorage.
      s.draft={...p};
      s.courseId=p.courseId;
      s.timingBack='plan';
      navigate('timing');
      return;
    }''')
    return EDIT_PLAN_VERSION+'\n'+src


def main():
    if not APP.is_file() or not HTML.is_file():
        sys.exit('Missing site/app.js or site/index.html')
    original=APP.read_text(encoding='utf-8')
    try: patched=update_saved_plan_edit(update_app(original))
    except ValueError as exc:sys.exit('Safe patch aborted without altering any files: '+str(exc))
    page=HTML.read_text(encoding='utf-8')
    if './v6.css' not in page:
        if '</head>' not in page:sys.exit('Cannot find </head>; no files changed')
        page=page.replace('</head>','  <link rel="stylesheet" href="./v6.css" />\n</head>',1)
    if not (ROOT/'site'/'v6.css').is_file():sys.exit('Missing site/v6.css; no files changed')
    APP.write_text(patched,encoding='utf-8')
    HTML.write_text(page,encoding='utf-8')
    print('Applied v6 plus edit-existing-plan feature. Custom Course Preview was not changed.')

if __name__=='__main__':main()
