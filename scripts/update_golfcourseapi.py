#!/usr/bin/env python3
"""Build a static, public-safe GolfCourseAPI cache during GitHub Actions deploy.

Auth never enters the published site. Uses only standard-library Python.
Free tier: at most 20 requests per normal build (10 searches + 10 details).
"""
from __future__ import annotations
import datetime as dt
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'site/course-api-cache.js'
SOURCE = ROOT / 'site/courses.js'
BASE = 'https://api.golfcourseapi.com/v1'
KEY = os.environ.get('GOLFCOURSEAPI_KEY', '').strip()


def unwrap(v):
    return v if isinstance(v, dict) else {}


def number(v):
    try:
        if v is None or v == '':
            return None
        n = float(v)
        return n if 0 <= n < 999999 else None
    except (ValueError, TypeError):
        return None


def coordinate(v, limit):
    try:
        n = float(v)
        return n if -limit <= n <= limit else None
    except (ValueError, TypeError):
        return None


def text(v, limit=180):
    return str(v or '').strip()[:limit]


def words(v):
    skip={'golf','club','course','country','the','at','of','and'}
    return [w for w in re.findall(r'[a-z0-9]+', str(v).lower()) if w not in skip]


def valid_match(course, result):
    name = str(result.get('course_name') or result.get('club_name') or result.get('name') or '')
    requested = words(course.get('name',''))
    found = words(name + ' ' + str(result.get('club_name') or ''))
    if not requested or not all(t in found for t in requested):
        return False
    # Coordinates are optional upstream. If returned, use them to reject false matches.
    loc = unwrap(result.get('location'))
    lat = coordinate(loc.get('latitude') if loc.get('latitude') is not None else result.get('latitude'), 90)
    lon = coordinate(loc.get('longitude') if loc.get('longitude') is not None else result.get('longitude'), 180)
    if lat is not None and lon is not None:
        if abs(lat-float(course['lat'])) > .12 or abs(lon-float(course['lng'])) > .18:
            return False
    return True


def api_get(path, params=None):
    url = BASE + path + ('?' + urlencode(params) if params else '')
    req = Request(url, headers={
        'Authorization': 'Key ' + KEY,
        'Accept': 'application/json',
        'User-Agent': 'MyGolfCalendarEducationalPrototype/1.0',
    })
    with urlopen(req, timeout=8) as response:
        return json.loads(response.read(1_000_000).decode('utf-8'))


def normalize_tee(raw, gender):
    if not isinstance(raw, dict):
        return None
    items = raw.get('holes') or []
    holes = []
    if isinstance(items, list):
        for item_index, h in enumerate(items, 1):
            if not isinstance(h, dict):
                continue
            idx = number(h.get('hole') or h.get('hole_number') or h.get('number') or item_index)
            par = number(h.get('par'))
            yards = number(h.get('yardage') or h.get('yards'))
            handicap = number(h.get('handicap') or h.get('handicap_index'))
            if idx is not None and 1 <= idx <= 18 and par is not None:
                holes.append({'hole':int(idx), 'par':int(par), 'yards':int(yards or 0), 'hcp':int(handicap) if handicap is not None else None})
    holes.sort(key=lambda x:x['hole'])
    holes = holes[:18]
    if len(holes) not in (9,18):
        return None
    total_yards = number(raw.get('total_yards')) or sum(h['yards'] for h in holes)
    total_par = number(raw.get('par_total')) or sum(h['par'] for h in holes)
    return {
        'name': text(raw.get('tee_name') or raw.get('name') or gender.title(),40) + (' · Women' if gender=='female' else ''),
        'gender':gender,
        'yards':round(total_yards),
        'par':int(total_par),
        'rating':number(raw.get('course_rating') or raw.get('rating')),
        'slope':number(raw.get('slope_rating') or raw.get('slope')),
        'holes':holes,
    }


def normalize_detail(detail, course):
    detail = unwrap(unwrap(detail).get('course') or detail)
    tees = unwrap(detail.get('tees'))
    out=[]
    for gender in ('male','female'):
        for tee in tees.get(gender,[]) if isinstance(tees.get(gender,[]),list) else []:
            converted=normalize_tee(tee,gender)
            if converted:out.append(converted)
    if not out:return None
    return {'name':text(detail.get('course_name') or detail.get('club_name') or course['name']), 'tees':out[:12]}


def write_cache(data):
    OUTPUT.write_text('window.GOLFCOURSE_API_CACHE = ' + json.dumps(data,ensure_ascii=True,separators=(',',':')) + ';\n',encoding='utf-8')


def run():
    fallback={'updatedAt':None,'courses':{}}
    if not KEY:
        write_cache(fallback)
        print('GolfCourseAPI Secret is not configured. Using bundled public course data.')
        return 0
    raw=SOURCE.read_text(encoding='utf-8').strip()
    bundled=json.loads(raw.removeprefix('window.COURSE_DATA =').rstrip('; \n'))['courses']
    payload={'updatedAt':dt.datetime.now(dt.timezone.utc).date().isoformat(),'courses':{}}
    errors=[]
    for course in bundled[:10]:
        try:
            term=' '.join(words(course['name'])) or course['name']
            result=api_get('/search',{'search_query':term})
            matches=result.get('courses',[]) if isinstance(result,dict) else []
            matches=[m for m in matches if isinstance(m,dict) and valid_match(course,m)]
            if not matches:
                print('No safely matched GolfCourseAPI entry for '+course['id'])
                continue
            chosen=matches[0]
            detail_response=api_get('/courses/'+str(int(chosen['id'])))
            detail=unwrap(unwrap(detail_response).get('course') or detail_response)
            if not valid_match(course,detail):
                # Some detail responses omit names, but search results were matched.
                if detail.get('course_name') or detail.get('club_name'):
                    print('Detail name mismatch for '+course['id']+'; skipped')
                    continue
            norm=normalize_detail(detail,course)
            if norm:
                payload['courses'][course['id']]=norm
                print('Loaded verified scorecards for '+course['id']+': '+str(len(norm['tees']))+' tee sets')
            else:
                print('No valid hole-by-hole scorecard for '+course['id']+'; using bundled')
        except (HTTPError,URLError,TimeoutError,ValueError,KeyError,TypeError, OSError) as ex:
            # Do not print response bodies or the secret.
            if isinstance(ex,HTTPError):
                errors.append(course['id']+': HTTP '+str(ex.code))
                if ex.code in (401,403,429):
                    print('API denied additional calls ('+str(ex.code)+'); stopping. Cached data remains usable.')
                    break
            else:
                errors.append(course['id']+': '+type(ex).__name__)
    if not payload['courses']:
        payload['updatedAt']=None
    write_cache(payload)
    print(f'GolfCourseAPI enrichment complete: {len(payload["courses"])} course(s).')
    if errors:print('Non-fatal API warnings: '+', '.join(errors))
    return 0


if __name__=='__main__':
    sys.exit(run())
