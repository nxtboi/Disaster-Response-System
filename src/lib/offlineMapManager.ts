// Offline Map Manager for DRS Tactical GIS Command Center
// Provides offline tile caching, offline vector GIS layers, tactical grid generation, and offline geocoding.

export interface OfflineCacheStats {
  tileCount: number;
  estimatedSizeMB: number;
  lastUpdated?: string;
}

export interface OfflineLocation {
  id: string;
  name: string;
  category: 'Disaster Hub' | 'Preset Sector' | 'City' | 'Mountain SAR' | 'Coastal' | 'Military/Base';
  lat: number;
  lng: number;
  description: string;
  country: string;
  elevationMeters: number;
}

const CACHE_NAME = 'drs-offline-map-tiles-v1';

// Check if browser supports Cache Storage
export function isCacheStorageSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

// Check network status
export function getNetworkStatus(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true;
}

// Cache a tile blob into CacheStorage
export async function cacheTileBlob(url: string, blob: Blob): Promise<void> {
  if (!isCacheStorageSupported()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(blob, {
      headers: {
        'Content-Type': blob.type || 'image/png',
        'X-DRS-Cached-At': new Date().toISOString(),
      },
    });
    await cache.put(url, response);
  } catch (err) {
    console.warn('[OfflineManager] Error caching tile:', err);
  }
}

// Retrieve cached tile as an object URL or Blob
export async function getCachedTileBlob(url: string): Promise<Blob | null> {
  if (!isCacheStorageSupported()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      return await response.blob();
    }
  } catch (err) {
    console.warn('[OfflineManager] Error reading cached tile:', err);
  }
  return null;
}

// Get statistics on cached tiles
export async function getCacheStats(): Promise<OfflineCacheStats> {
  if (!isCacheStorageSupported()) {
    return { tileCount: 0, estimatedSizeMB: 0 };
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const count = keys.length;
    // Average tile is ~15-25 KB
    const estimatedSizeMB = Number(((count * 20) / 1024).toFixed(2));
    return {
      tileCount: count,
      estimatedSizeMB,
      lastUpdated: count > 0 ? new Date().toLocaleTimeString() : undefined,
    };
  } catch {
    return { tileCount: 0, estimatedSizeMB: 0 };
  }
}

// Clear all cached tiles
export async function clearOfflineTileCache(): Promise<boolean> {
  if (!isCacheStorageSupported()) return false;
  try {
    await caches.delete(CACHE_NAME);
    return true;
  } catch (err) {
    console.error('[OfflineManager] Failed to delete cache:', err);
    return false;
  }
}

// Convert Lat/Lng to Slippy Map Tile Coordinates
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const rad = (lat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

// Download and cache tiles for a bounding radius at specified zoom levels
export async function downloadSectorTiles({
  centerLat,
  centerLng,
  radiusKm = 3,
  zoomLevels = [13, 14, 15],
  tileUrlPattern = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  subdomains = ['a', 'b', 'c', 'd'],
  onProgress,
  signal,
}: {
  centerLat: number;
  centerLng: number;
  radiusKm?: number;
  zoomLevels?: number[];
  tileUrlPattern?: string;
  subdomains?: string[];
  onProgress?: (progress: number, total: number, status: string) => void;
  signal?: AbortSignal;
}): Promise<{ success: boolean; downloaded: number; failed: number }> {
  if (!isCacheStorageSupported()) {
    throw new Error('CacheStorage API is not supported in this browser.');
  }

  // Rough degree offset for radiusKm (1 deg latitude ~ 111 km)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180) || 1);

  const minLat = centerLat - latDelta;
  const maxLat = centerLat + latDelta;
  const minLng = centerLng - lngDelta;
  const maxLng = centerLng + lngDelta;

  // Collect tile coordinates
  const tileList: Array<{ x: number; y: number; z: number; url: string }> = [];

  for (const z of zoomLevels) {
    const topLeft = latLngToTile(maxLat, minLng, z);
    const bottomRight = latLngToTile(minLat, maxLng, z);

    const minX = Math.min(topLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, bottomRight.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const sub = subdomains[(x + y) % subdomains.length] || 'a';
        const url = tileUrlPattern
          .replace('{s}', sub)
          .replace('{z}', String(z))
          .replace('{x}', String(x))
          .replace('{y}', String(y))
          .replace('{r}', '');

        tileList.push({ x, y, z, url });
      }
    }
  }

  const total = tileList.length;
  let downloaded = 0;
  let failed = 0;

  if (onProgress) {
    onProgress(0, total, `Preparing to download ${total} tiles...`);
  }

  const cache = await caches.open(CACHE_NAME);

  // Download with concurrency limit to avoid overwhelming browser
  const CONCURRENCY = 6;
  const queue = [...tileList];

  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (queue.length > 0) {
      if (signal?.aborted) return;
      const item = queue.shift();
      if (!item) break;

      try {
        // Check if already in cache
        const match = await cache.match(item.url);
        if (!match) {
          const res = await fetch(item.url, {
            mode: 'cors',
            signal,
          });
          if (res.ok) {
            await cache.put(item.url, res.clone());
            downloaded++;
          } else {
            failed++;
          }
        } else {
          downloaded++;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        failed++;
      }

      const currentDone = downloaded + failed;
      if (onProgress) {
        onProgress(
          currentDone,
          total,
          `Cached ${currentDone}/${total} tiles (Zoom ${item.z})`
        );
      }
    }
  });

  await Promise.all(workers);

  if (onProgress) {
    onProgress(total, total, `Finished caching ${downloaded} tiles successfully.`);
  }

  return { success: !signal?.aborted, downloaded, failed };
}

// ---------------------------------------------------------
// Procedural Synthetic Elevation & Topo Contours (Deterministic)
// Used when drawing 100% offline topographic vector map
// ---------------------------------------------------------
function pseudoNoise(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothNoise(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;

  // Smoothstep
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const n00 = pseudoNoise(i, j);
  const n10 = pseudoNoise(i + 1, j);
  const n01 = pseudoNoise(i, j + 1);
  const n11 = pseudoNoise(i + 1, j + 1);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;

  return nx0 * (1 - v) + nx1 * v;
}

export function getOfflineElevationMeters(lat: number, lng: number): number {
  // Multi-octave synthetic elevation for seamless worldwide contour generation
  const n1 = smoothNoise(lat * 0.25, lng * 0.25);
  const n2 = smoothNoise(lat * 0.8, lng * 0.8) * 0.5;
  const n3 = smoothNoise(lat * 2.5, lng * 2.5) * 0.25;
  const raw = (n1 + n2 + n3) / 1.75;
  // Map to 50m - 3400m
  return Math.round(50 + raw * 3350);
}

// ---------------------------------------------------------
// Global Offline Tactical Directory (Searchable without internet)
// ---------------------------------------------------------
export const OFFLINE_TACTICAL_DIRECTORY: OfflineLocation[] = [
  // Preset Operational Sectors
  {
    id: 'base-drs',
    name: 'Disaster Grid (Command Base & Airfield)',
    category: 'Preset Sector',
    lat: 28.4595,
    lng: 77.0266,
    country: 'Global Command Base',
    description: 'Primary UAV deployment hub, rapid triage runway & sensor command.',
    elevationMeters: 218,
  },
  {
    id: 'seismic-zone',
    name: 'Earthquake SAR Sector (Kahramanmaraş Fault)',
    category: 'Disaster Hub',
    lat: 37.5753,
    lng: 36.9228,
    country: 'Turkey',
    description: 'High-magnitude structural collapse & survivor search grid.',
    elevationMeters: 568,
  },
  {
    id: 'flood-zone',
    name: 'Coastal Flood Relief (Kerala Inundation Corridor)',
    category: 'Disaster Hub',
    lat: 9.9312,
    lng: 76.2673,
    country: 'India',
    description: 'Monsoon flash-flood rescue, stranded rooftop evac & medical drops.',
    elevationMeters: 4,
  },
  {
    id: 'alpine-sar',
    name: 'Alpine High-Altitude SAR (Mont Blanc Chamonix)',
    category: 'Mountain SAR',
    lat: 45.9237,
    lng: 6.8694,
    country: 'France / Alps',
    description: 'Crevasse rescue, avalanche beacon tracking & thermal scanning.',
    elevationMeters: 1035,
  },
  {
    id: 'urban-response',
    name: 'Urban Megacity Relief (Tokyo Bay Tsunami Sector)',
    category: 'Preset Sector',
    lat: 35.6762,
    lng: 139.7503,
    country: 'Japan',
    description: 'Autonomous harbor sweeps, high-rise evac & civil defense net.',
    elevationMeters: 12,
  },

  // Major Global Centers (Searchable 100% offline)
  {
    id: 'loc-ny',
    name: 'New York City (Atlantic Coastal Hub)',
    category: 'City',
    lat: 40.7128,
    lng: -74.006,
    country: 'United States',
    description: 'Metro SAR & coastal storm surge staging area.',
    elevationMeters: 10,
  },
  {
    id: 'loc-london',
    name: 'London (Thames Flood Barrier)',
    category: 'City',
    lat: 51.5074,
    lng: -0.1278,
    country: 'United Kingdom',
    description: 'Urban civil contingency emergency network.',
    elevationMeters: 14,
  },
  {
    id: 'loc-paris',
    name: 'Paris (Seine Valley Operations)',
    category: 'City',
    lat: 48.8566,
    lng: 2.3522,
    country: 'France',
    description: 'European disaster management coordination.',
    elevationMeters: 35,
  },
  {
    id: 'loc-berlin',
    name: 'Berlin (Spree Tactical Center)',
    category: 'City',
    lat: 52.52,
    lng: 13.405,
    country: 'Germany',
    description: 'Central European emergency response hub.',
    elevationMeters: 34,
  },
  {
    id: 'loc-delhi',
    name: 'New Delhi (National Disaster Management Hub)',
    category: 'City',
    lat: 28.6139,
    lng: 77.209,
    country: 'India',
    description: 'NDRF central command & multi-rotor fleet depot.',
    elevationMeters: 216,
  },
  {
    id: 'loc-sydney',
    name: 'Sydney (Bushfire Rapid Response Hub)',
    category: 'City',
    lat: -33.8688,
    lng: 151.2093,
    country: 'Australia',
    description: 'Wildfire perimeter monitoring & coastal patrol.',
    elevationMeters: 19,
  },
  {
    id: 'loc-singapore',
    name: 'Singapore (Malacca Strait Maritime SAR)',
    category: 'City',
    lat: 1.3521,
    lng: 103.8198,
    country: 'Singapore',
    description: 'Maritime vessel distress & equatorial radar beacon.',
    elevationMeters: 15,
  },
  {
    id: 'loc-dubai',
    name: 'Dubai (Gulf SAR Headquarters)',
    category: 'City',
    lat: 25.2048,
    lng: 55.2708,
    country: 'United Arab Emirates',
    description: 'Desert survival telemetry & port security fleet.',
    elevationMeters: 5,
  },
  {
    id: 'loc-sf',
    name: 'San Francisco (San Andreas Fault Observatory)',
    category: 'City',
    lat: 37.7749,
    lng: -122.4194,
    country: 'United States',
    description: 'Earthquake readiness & Pacific seismic monitoring.',
    elevationMeters: 16,
  },
  {
    id: 'loc-everest',
    name: 'Mount Everest (South Col High-Altitude SAR)',
    category: 'Mountain SAR',
    lat: 27.9881,
    lng: 86.925,
    country: 'Nepal',
    description: 'Extreme altitude UAV search & mountaineer rescue.',
    elevationMeters: 8848,
  },
  {
    id: 'loc-geneva',
    name: 'Geneva (UN Disaster Coordination OCHA)',
    category: 'City',
    lat: 46.2044,
    lng: 6.1432,
    country: 'Switzerland',
    description: 'Global humanitarian relief deployment center.',
    elevationMeters: 375,
  },
  {
    id: 'loc-nairobi',
    name: 'Nairobi (East Africa Humanitarian Hub)',
    category: 'City',
    lat: -1.2921,
    lng: 36.8219,
    country: 'Kenya',
    description: 'Drought & wildlife telemetry staging ground.',
    elevationMeters: 1661,
  },
  {
    id: 'loc-jakarta',
    name: 'Jakarta (Java Trench Volcanic & Tsunami Net)',
    category: 'Coastal',
    lat: -6.2088,
    lng: 106.8456,
    country: 'Indonesia',
    description: 'Ring of fire volcanic monitoring & tidal sensors.',
    elevationMeters: 8,
  },
  {
    id: 'loc-reykjavik',
    name: 'Reykjavik (Iceland Volcanic Observatory)',
    category: 'Coastal',
    lat: 64.1466,
    lng: -21.9426,
    country: 'Iceland',
    description: 'Geothermal rift & ash plume UAV surveillance.',
    elevationMeters: 18,
  },
  {
    id: 'loc-cairo',
    name: 'Cairo (Nile Valley Crisis Center)',
    category: 'City',
    lat: 30.0444,
    lng: 31.2357,
    country: 'Egypt',
    description: 'North African disaster logistics and desert SAR.',
    elevationMeters: 23,
  },
  {
    id: 'loc-rio',
    name: 'Rio de Janeiro (Serra do Mar Landslide Zone)',
    category: 'City',
    lat: -22.9068,
    lng: -43.1729,
    country: 'Brazil',
    description: 'Heavy rain mudslide detection & hillside monitoring.',
    elevationMeters: 6,
  },
  {
    id: 'loc-seoul',
    name: 'Seoul (Han River Civil Defense Center)',
    category: 'City',
    lat: 37.5665,
    lng: 126.978,
    country: 'South Korea',
    description: 'Urban emergency management & autonomous drone relay.',
    elevationMeters: 38,
  },
  {
    id: 'loc-cape-town',
    name: 'Cape Town (Cape Peninsula Maritime SAR)',
    category: 'Coastal',
    lat: -33.9249,
    lng: 18.4241,
    country: 'South Africa',
    description: 'Atlantic/Indian Ocean convergence rescue outpost.',
    elevationMeters: 20,
  },
];

// Offline Search Function
export function searchOfflineDirectory(query: string): OfflineLocation[] {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  return OFFLINE_TACTICAL_DIRECTORY.filter(
    (loc) =>
      loc.name.toLowerCase().includes(q) ||
      loc.country.toLowerCase().includes(q) ||
      loc.category.toLowerCase().includes(q) ||
      loc.description.toLowerCase().includes(q)
  );
}
