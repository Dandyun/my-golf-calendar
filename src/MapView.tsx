import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Course } from './data';

type Props = {
  courses: Course[];
  origin: { lat: number; lng: number; name: string };
  radius: number;
  onSelect: (id: string) => void;
};

// Map tiles are loaded from OpenStreetMap on the user's device. Course markers
// are read from the bundled data.ts file; no database or API key is required.
export default function MapView({ courses, origin, radius, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const ring = useRef<L.Circle | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!container.current) return;
    const m = L.map(container.current, { zoomControl: false, attributionControl: true }).setView([origin.lat, origin.lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    const layer = L.layerGroup().addTo(m);
    map.current = m;
    markers.current = layer;
    const resize = window.setTimeout(() => m.invalidateSize(), 180);
    return () => {
      window.clearTimeout(resize);
      m.remove();
      map.current = null;
      markers.current = null;
      ring.current = null;
    };
    // Initialize once per mount. Other effects update map state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.flyTo([origin.lat, origin.lng], radius <= 15 ? 12 : radius <= 35 ? 11 : 10, { duration: 0.5 });
    ring.current?.remove();
    ring.current = L.circle([origin.lat, origin.lng], {
      radius: radius * 1609.344, color: '#285e41', weight: 1,
      fillColor: '#65856e', fillOpacity: 0.08, opacity: 0.45, interactive: false,
    }).addTo(m);
  }, [origin, radius]);

  useEffect(() => {
    const layer = markers.current;
    if (!layer) return;
    layer.clearLayers();
    const homeIcon = L.divIcon({
      className: 'my-location-wrapper',
      html: '<span class="my-location-dot"></span>', iconSize: [18,18], iconAnchor: [9,9],
    });
    L.marker([origin.lat, origin.lng], { icon: homeIcon, interactive: false }).addTo(layer);
    courses.forEach(course => {
      const label = course.rating === null ? 'No rating' : `★ ${course.rating.toFixed(1)}`;
      const el = document.createElement('div');
      el.className = `golf-marker ${course.access === 'Private' ? 'private-marker' : ''}`;
      const nm = document.createElement('strong');
      nm.textContent = course.shortName;
      const sub = document.createElement('span');
      sub.textContent = `${course.price}   ${label}`;
      el.append(nm, sub);
      // Construct DOM nodes instead of interpolating data into HTML.
      const icon = L.divIcon({ className: 'golf-pin-wrapper', html: el, iconSize: [134, 58], iconAnchor: [67, 58] });
      L.marker([course.lat, course.lng], { icon, title: course.name })
        .on('click', () => onSelectRef.current(course.id)).addTo(layer);
    });
  }, [courses, origin]);

  return <div ref={container} className="map-container" aria-label="Interactive map of golf courses near the selected location" />;
}
