/**
 * Real NJ golf course reference dataset, curated 2026-11-06.
 * No API key or database. Prices are tiers / published examples, not live quotes.
 * Review scores are public directory snapshots (different from USGA course ratings).
 * Coordinates are approximate center points suitable for map display, not tee-box GPS.
 */
export type Facility = 'Driving range' | 'Putting green' | 'Golf carts' | 'Club rentals' | 'Restaurant' | 'Lessons' | 'Pro shop';
export type ScoreHole = { hole: number; par: number; yards: number; hcp?: number };
export type Scorecard = { tee: string; note: string; source: string; holes: ScoreHole[] };
export type Course = {
  id: string; name: string; shortName: string; city: string; address: string;
  lat: number; lng: number; access: 'Public' | 'Private'; holes: 9 | 18;
  par: number; yards: number; slope: number | null; courseRating: number | null;
  rating: number | null; ratingNote: string; price: '$' | '$$' | '$$$' | 'Private';
  priceNote: string; facilities: Facility[]; facilitiesNote: string;
  website: string; scorecardUrl: string; phone: string; image?: string; imageCredit?: string;
  description: string; highlight: string; scorecard?: Scorecard;
};

function holes(par: number[], yards: number[], hcp: number[] = []): ScoreHole[] {
  return par.map((p,i)=>({hole:i+1,par:p,yards:yards[i],...(hcp[i] ? {hcp:hcp[i]} : {})}));
}

export const COURSES: Course[] = [
  {
    id:'skyway', name:'Skyway Golf Course', shortName:'Skyway', city:'Jersey City, NJ',
    address:'515 Duncan Ave, Jersey City, NJ 07306', lat:40.73326,lng:-74.09182,
    access:'Public', holes:9, par:36, yards:3247, slope:142, courseRating:35.7,
    rating:4.0, ratingNote:'Public review-directory snapshot; not a course/slope rating.',
    price:'$$', priceNote:'2025 posted non-resident 9-hole walk: $44 weekday / $48 weekend. Not a live quote.',
    facilities:['Golf carts','Pro shop','Lessons','Putting green'],
    facilitiesNote:'Cart and instructional offerings confirmed; driving range and club rentals not verified.',
    website:'https://skywaygolfcourse.com/',
    scorecardUrl:'https://skywaygolfcourse.com/course-information/', phone:'201-763-7520',
    image:'https://www.skywaygolfcourse.com/wp-content/uploads/2021/02/unspecified6.jpg',
    imageCredit:'Image: Skyway Golf Course website',
    description:'A public nine-hole course alongside the Hackensack River, with generous fairways, fescue dunes and skyline views.',
    highlight:'Nine holes with an urban skyline view.',
    scorecard:{tee:'Black tees',note:'9-hole scorecard; published black-tee distances.',source:'https://skywaygolfcourse.com/course-information/',
      holes:holes([4,3,5,3,4,5,4,5,3],[346,200,517,130,459,532,365,523,175])}
  },
  {
    id:'weequahic',name:'Weequahic Golf Course',shortName:'Weequahic',city:'Newark, NJ',
    address:'1 Thomas Carmichael Dr, Newark, NJ 07112',lat:40.69687,lng:-74.20656,
    access:'Public',holes:18,par:70,yards:5436,slope:114,courseRating:66.4,
    rating:3.2,ratingNote:'Public review-directory snapshot, not a current condition assessment.',
    price:'$$',priceNote:'2026 non-cardholder adult fee: $55 weekday / $65 weekend; cart extra.',
    facilities:['Golf carts','Putting green'],facilitiesNote:'Check amenities with the course after the 2025 renovation.',
    website:'https://essexcountyparks.org/golf/weequahic-golf-course',scorecardUrl:'https://www.golfcore.org/courses/weequahic-golf-course/',
    phone:'973-926-2520',
    description:'New Jersey’s oldest public course, redesigned and reopened after a major renovation in 2025.',
    highlight:'Recently renovated classic public course.',
    // No inline hole data: sources disagree on some hole pars/yardages after renovation.
  },
  {
    id:'galloping',name:'Galloping Hill Golf Course',shortName:'Galloping Hill',city:'Kenilworth, NJ',
    address:'3 Golf Dr, Kenilworth, NJ 07033',lat:40.685078,lng:-74.276726,
    access:'Public',holes:18,par:71,yards:5570,slope:121,courseRating:67.3,
    rating:3.4,ratingNote:'Public review-directory snapshot; not a course/slope rating.',
    price:'$$',priceNote:'Price tier is illustrative; confirm current greens fees with the course.',
    facilities:['Driving range','Golf carts','Pro shop','Restaurant','Lessons','Putting green'],
    facilitiesNote:'Public golf facility with practice center, clubhouse and restaurant.',
    website:'https://www.gallopinghillgolfcourse.com/',scorecardUrl:'https://www.golfcore.org/courses/galloping-hill-golf-course/',
    phone:'908-241-8700',description:'A large public golf facility with rolling hills, a practice center and an 18-hole championship layout.',
    highlight:'A complete golf day with practice facilities.',
    scorecard:{tee:'White tees',note:'18-hole white-tee published reference.',source:'https://www.golfcore.org/courses/galloping-hill-golf-course/',
      holes:holes([4,4,4,4,3,5,4,4,4,4,3,4,4,4,3,4,4,5],
        [311,316,415,333,116,460,344,335,339,373,136,272,353,369,167,328,228,375],
        [15,11,1,9,17,7,3,13,5,10,18,8,6,2,14,4,16,12])}
  },
  {
    id:'rock',name:'Rock Spring Golf Club',shortName:'Rock Spring',city:'West Orange, NJ',
    address:'90 Rock Spring Rd, West Orange, NJ 07052',lat:40.7678,lng:-74.26799,
    access:'Public',holes:18,par:71,yards:6420,slope:134,courseRating:71.2,
    rating:4.2,ratingNote:'Public review-directory snapshot; not a course/slope rating.',
    price:'$$$',priceNote:'Variable daily-fee public golf; $$$ is an indicative price tier, not a current fee.',
    facilities:['Golf carts','Pro shop','Putting green','Restaurant'],
    facilitiesNote:'Public daily-fee course with a clubhouse; check equipment and range availability.',
    website:'https://rockspringgolf.com/',scorecardUrl:'https://www.golfcore.org/courses/rock-spring-golf-club-at-west-orange/',
    phone:'973-731-6464',
    image:'https://golf-pass.brightspotcdn.com/a9/2e/e71104a4eb028b0da399c34067d7/125875.jpg',
    imageCredit:'Image: GolfPass course gallery',
    description:'A classic Seth Raynor-designed public course with strategic green complexes and Manhattan skyline views.',
    highlight:'Classic design, longer round, memorable greens.',
    scorecard:{tee:'White tees',note:'18-hole white-tee published reference.',source:'https://www.golfcore.org/courses/rock-spring-golf-club-at-west-orange/',
      holes:holes([4,4,3,4,4,3,4,4,5,4,4,4,4,5,4,3,4,4],
        [350,380,193,434,398,136,370,408,471,320,418,321,408,521,373,177,405,337],
        [15,3,9,1,7,17,13,5,11,14,6,16,2,8,10,18,4,12])}
  },
  {
    id:'hendricks',name:'Hendricks Field Golf Course',shortName:'Hendricks Field',city:'Belleville, NJ',
    address:'220 Franklin Ave, Belleville, NJ 07109',lat:40.7951,lng:-74.16764,
    access:'Public',holes:18,par:70,yards:6150,slope:123,courseRating:69.2,
    rating:null,ratingNote:'No comparable current community review rating verified.',
    price:'$$',priceNote:'2026 non-cardholder adult fee: $55 weekday / $65 weekend; cart extra.',
    facilities:['Golf carts','Putting green'],facilitiesNote:'Golf carts available; confirm remaining facilities directly.',
    website:'https://essexcountyparks.org/golf/hendricks-field-golf-course',
    scorecardUrl:'https://essexcountyparks.org/golf/hendricks-field-golf-course',phone:'973-751-0178',
    description:'An historic public parkland course in Belleville, with mature trees and a mix of par threes and fives.',
    highlight:'Traditional parkland golf close to Newark.'
  },
  {
    id:'byrne',name:'Francis A. Byrne Golf Course',shortName:'Francis Byrne',city:'West Orange, NJ',
    address:'1100 Pleasant Valley Way, West Orange, NJ 07052',lat:40.78781,lng:-74.26874,
    access:'Public',holes:18,par:70,yards:6173,slope:132,courseRating:70.7,
    rating:null,ratingNote:'No comparable current community review rating verified.',
    price:'$$',priceNote:'2026 non-cardholder adult fee: $65 weekday / $85 weekend; cart extra.',
    facilities:['Golf carts','Putting green'],facilitiesNote:'Confirm practice facilities with Essex County Parks.',
    website:'https://essexcountyparks.org/golf/francis-byrne-golf-course',
    scorecardUrl:'https://www.golfcore.org/courses/francis-byrne-gc/',phone:'973-736-2306',
    description:'A restored Charles Banks / Seth Raynor classic with template holes including the Biarritz and Eden.',
    highlight:'Historic architectural holes and a demanding layout.',
    scorecard:{tee:'White tees',note:'18-hole white-tee published reference.',source:'https://www.golfcore.org/courses/francis-byrne-gc/',
      holes:holes([4,3,4,4,3,4,4,4,4,4,4,4,4,3,5,4,3,5],
        [385,209,398,334,144,407,337,380,421,382,395,356,378,137,460,326,193,531],
        [5,11,7,13,17,1,15,9,3,10,8,2,6,18,16,4,14,12])}
  },
  {
    id:'liberty',name:'Liberty National Golf Club',shortName:'Liberty National',city:'Jersey City, NJ',
    address:'100 Caven Point Rd, Jersey City, NJ 07305',lat:40.694,lng:-74.07446,
    access:'Private',holes:18,par:72,yards:6690,slope:146,courseRating:76.4,
    rating:4.5,ratingNote:'Public review-directory snapshot; course rating/slope refer to different tees.',
    price:'Private',priceNote:'Private, invitation-based membership/guest access. No public green fee.',
    facilities:['Driving range','Pro shop','Putting green','Restaurant','Lessons'],
    facilitiesNote:'Private club facilities are for eligible members and guests.',
    website:'https://www.libertynationalgc.com/',scorecardUrl:'https://mizuhoamericasopen.com/wp-content/uploads/2025/04/course-map-2025.pdf',
    phone:'201-333-4105',
    image:'https://res.cloudinary.com/pgatour-prod/w_1200%2Ch_628%2Cc_fill%2Cf_auto/pgatour/news/editorial/2021/08/16/liberty-national-1694-kk.jpg',
    imageCredit:'Image: PGA TOUR editorial',
    description:'A private championship course on the Jersey City waterfront, with panoramic views of Manhattan and the Statue of Liberty.',
    highlight:'Waterfront championship course — private access.',
    scorecard:{tee:'2025 LPGA tournament setup',note:'2025 Mizuho Americas Open published yardage; not the standard member tees.',
      source:'https://mizuhoamericasopen.com/wp-content/uploads/2025/04/course-map-2025.pdf',
      holes:holes([4,3,4,3,4,5,4,5,4,5,3,4,5,3,4,4,4,4],
        [399,176,370,160,406,506,418,542,423,497,193,373,505,152,427,328,395,420])}
  },
];

export const DEFAULT_ORIGIN = {name:'Jersey City, NJ', lat:40.7282, lng:-74.0776};
export const PRESET_ORIGINS = [DEFAULT_ORIGIN,
  {name:'Newark, NJ',lat:40.7357,lng:-74.1724},
  {name:'Manhattan, NY',lat:40.7411,lng:-73.9897},
  {name:'West Orange, NJ',lat:40.7986,lng:-74.2390}];

export function milesBetween(a:{lat:number;lng:number},b:{lat:number;lng:number}):number{
  const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
  return 3958.76*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function estimatedDrivingMinutes(miles:number):number{
  // Editable sample estimate, NOT live road routing or traffic.
  return Math.max(15,Math.round((miles*2.4+10)/5)*5);
}
