export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

/** OpenStreetMap Nominatim lookup (India only). Max 1 request/second per usage policy. */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', countrycodes: 'in' }).toString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('GEOCODE_HTTP');
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const round = (n: number) => Math.round(n * 1000) / 1000; // ~100 m: approximate on purpose
    return {
      label: data[0].display_name as string,
      latitude: round(+data[0].lat),
      longitude: round(+data[0].lon),
    };
  } finally {
    clearTimeout(timer);
  }
}
