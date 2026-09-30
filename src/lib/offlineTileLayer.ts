import L from 'leaflet';
import { getOfflineElevationMeters, getCachedTileBlob } from './offlineMapManager';

export type OfflineTheme = 'tactical-dark' | 'tactical-topo' | 'emergency-amber';

export interface OfflineGridLayerOptions extends L.GridLayerOptions {
  theme?: OfflineTheme;
  showContours?: boolean;
  showMGRSGrid?: boolean;
  showTileCoords?: boolean;
  preferCache?: boolean;
  tileUrlPattern?: string;
  subdomains?: string[];
}

// Convert tile x, y, z to latitude and longitude bounds
export function tileToLng(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

export function tileToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// Simplified continent bounds for world land vs ocean shading offline
const LAND_REGIONS = [
  // North America
  { minLat: 15, maxLat: 72, minLng: -168, maxLng: -52 },
  // Central America
  { minLat: 7, maxLat: 22, minLng: -95, maxLng: -77 },
  // South America
  { minLat: -56, maxLat: 13, minLng: -82, maxLng: -34 },
  // Europe
  { minLat: 36, maxLat: 71, minLng: -10, maxLng: 40 },
  // Africa
  { minLat: -35, maxLat: 37, minLng: -18, maxLng: 52 },
  // Asia
  { minLat: -11, maxLat: 75, minLng: 40, maxLng: 170 },
  // Australia & NZ
  { minLat: -47, maxLat: -10, minLng: 112, maxLng: 178 },
  // India Subcontinent
  { minLat: 6, maxLat: 36, minLng: 68, maxLng: 97 },
  // Japan
  { minLat: 30, maxLat: 46, minLng: 129, maxLng: 146 },
  // UK & Ireland
  { minLat: 50, maxLat: 60, minLng: -11, maxLng: 2 },
];

function isLikelyLand(lat: number, lng: number): boolean {
  for (const reg of LAND_REGIONS) {
    if (lat >= reg.minLat && lat <= reg.maxLat && lng >= reg.minLng && lng <= reg.maxLng) {
      return true;
    }
  }
  return false;
}

export class OfflineTacticalGridLayer extends L.GridLayer {
  theme: OfflineTheme;
  showContours: boolean;
  showMGRSGrid: boolean;
  showTileCoords: boolean;
  preferCache: boolean;
  tileUrlPattern?: string;
  subdomains: string[];

  constructor(options?: OfflineGridLayerOptions) {
    super(options);
    this.theme = options?.theme || 'tactical-dark';
    this.showContours = options?.showContours ?? true;
    this.showMGRSGrid = options?.showMGRSGrid ?? true;
    this.showTileCoords = options?.showTileCoords ?? true;
    this.preferCache = options?.preferCache ?? true;
    this.tileUrlPattern = options?.tileUrlPattern;
    this.subdomains = options?.subdomains || ['a', 'b', 'c', 'd'];
  }

  setTheme(newTheme: OfflineTheme) {
    this.theme = newTheme;
    this.redraw();
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('canvas');
    const tileSize = this.getTileSize();
    tile.width = tileSize.x;
    tile.height = tileSize.y;

    const ctx = tile.getContext('2d');
    if (!ctx) {
      setTimeout(() => done(null, tile), 0);
      return tile;
    }

    const { x, y, z } = coords;

    // Check if tile can be resolved from Offline CacheStorage first
    if (this.preferCache && this.tileUrlPattern) {
      const sub = this.subdomains[(x + y) % this.subdomains.length] || 'a';
      const url = this.tileUrlPattern
        .replace('{s}', sub)
        .replace('{z}', String(z))
        .replace('{x}', String(x))
        .replace('{y}', String(y))
        .replace('{r}', '');

      getCachedTileBlob(url)
        .then((blob) => {
          if (blob) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, tileSize.x, tileSize.y);
              // Draw subtle cached offline watermark badge in corner
              ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
              ctx.font = '8px monospace';
              ctx.fillText('⚡ CACHED', 6, 12);
              done(null, tile);
            };
            img.onerror = () => {
              this.renderVectorTile(ctx, coords, tileSize);
              done(null, tile);
            };
            img.src = URL.createObjectURL(blob);
          } else {
            this.renderVectorTile(ctx, coords, tileSize);
            done(null, tile);
          }
        })
        .catch(() => {
          this.renderVectorTile(ctx, coords, tileSize);
          done(null, tile);
        });

      return tile;
    }

    // Default: Render 100% Vector Tactical GIS on Canvas
    this.renderVectorTile(ctx, coords, tileSize);
    setTimeout(() => done(null, tile), 0);
    return tile;
  }

  private renderVectorTile(
    ctx: CanvasRenderingContext2D,
    coords: L.Coords,
    tileSize: L.Point
  ) {
    const { x, y, z } = coords;
    const w = tileSize.x;
    const h = tileSize.y;

    // Calculate Lat/Lng boundaries
    const nwLat = tileToLat(y, z);
    const nwLng = tileToLng(x, z);
    const seLat = tileToLat(y + 1, z);
    const seLng = tileToLng(x + 1, z);
    const centerLat = (nwLat + seLat) / 2;
    const centerLng = (nwLng + seLng) / 2;

    const land = isLikelyLand(centerLat, centerLng);
    const elevation = getOfflineElevationMeters(centerLat, centerLng);

    // Color Palettes based on theme
    let bgFill = '#070b12';
    let landFill = '#0d1522';
    let oceanFill = '#04070d';
    let gridStroke = 'rgba(6, 182, 212, 0.12)';
    let subGridStroke = 'rgba(6, 182, 212, 0.04)';
    let contourStroke = 'rgba(16, 185, 129, 0.22)';
    let indexContourStroke = 'rgba(16, 185, 129, 0.45)';
    let textFill = 'rgba(6, 182, 212, 0.6)';
    let crosshairStroke = 'rgba(6, 182, 212, 0.35)';

    if (this.theme === 'tactical-topo') {
      bgFill = '#11171d';
      landFill = '#19222b';
      oceanFill = '#0c1217';
      gridStroke = 'rgba(148, 163, 184, 0.15)';
      subGridStroke = 'rgba(148, 163, 184, 0.05)';
      contourStroke = 'rgba(217, 119, 6, 0.28)';
      indexContourStroke = 'rgba(217, 119, 6, 0.55)';
      textFill = 'rgba(226, 232, 240, 0.65)';
      crosshairStroke = 'rgba(217, 119, 6, 0.4)';
    } else if (this.theme === 'emergency-amber') {
      bgFill = '#120f0a';
      landFill = '#1c160c';
      oceanFill = '#0a0805';
      gridStroke = 'rgba(245, 158, 11, 0.14)';
      subGridStroke = 'rgba(245, 158, 11, 0.04)';
      contourStroke = 'rgba(239, 68, 68, 0.24)';
      indexContourStroke = 'rgba(245, 158, 11, 0.45)';
      textFill = 'rgba(251, 191, 36, 0.7)';
      crosshairStroke = 'rgba(245, 158, 11, 0.4)';
    }

    // 1. Draw base land/water distinction
    ctx.fillStyle = land ? landFill : oceanFill;
    ctx.fillRect(0, 0, w, h);

    // Subtle gradient hillshade if on land
    if (land) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      const elevRatio = Math.min(1, Math.max(0, (elevation - 100) / 2500));
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.02 + elevRatio * 0.05})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Draw Sub-grid & MGRS tactical lines
    if (this.showMGRSGrid) {
      const step = 64;
      ctx.lineWidth = 1;

      // Fine sub-grid
      ctx.strokeStyle = subGridStroke;
      ctx.beginPath();
      for (let p = step / 2; p < w; p += step) {
        ctx.moveTo(p, 0);
        ctx.lineTo(p, h);
        ctx.moveTo(0, p);
        ctx.lineTo(w, p);
      }
      ctx.stroke();

      // Main grid lines
      ctx.strokeStyle = gridStroke;
      ctx.beginPath();
      for (let p = step; p < w; p += step) {
        ctx.moveTo(p, 0);
        ctx.lineTo(p, h);
        ctx.moveTo(0, p);
        ctx.lineTo(w, p);
      }
      ctx.stroke();

      // Tactical Crosshairs at 4 corners
      ctx.strokeStyle = crosshairStroke;
      ctx.lineWidth = 1.2;
      const cornerSize = 8;
      // NW
      ctx.beginPath();
      ctx.moveTo(0, cornerSize);
      ctx.lineTo(0, 0);
      ctx.lineTo(cornerSize, 0);
      // NE
      ctx.moveTo(w - cornerSize, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, cornerSize);
      // SE
      ctx.moveTo(w, h - cornerSize);
      ctx.lineTo(w, h);
      ctx.lineTo(w - cornerSize, h);
      // SW
      ctx.moveTo(cornerSize, h);
      ctx.lineTo(0, h);
      ctx.lineTo(0, h - cornerSize);
      ctx.stroke();
    }

    // 3. Draw Synthetic Topo Contours
    if (this.showContours && land && z >= 9) {
      const gridSize = 4;
      const cellW = w / gridSize;
      const cellH = h / gridSize;

      ctx.lineWidth = 1;

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const ptLat = nwLat + ((j + 0.5) / gridSize) * (seLat - nwLat);
          const ptLng = nwLng + ((i + 0.5) / gridSize) * (seLng - nwLng);
          const ptElev = getOfflineElevationMeters(ptLat, ptLng);

          // If multiple of 200m or 500m, draw contour rings
          const isIndex = ptElev % 500 < 60;
          ctx.strokeStyle = isIndex ? indexContourStroke : contourStroke;
          ctx.beginPath();

          const cx = (i + 0.5) * cellW;
          const cy = (j + 0.5) * cellH;
          const radius = (cellW * 0.45) * ((ptElev % 300) / 300 || 0.5);

          ctx.arc(cx, cy, Math.max(8, radius), 0, Math.PI * 2);
          ctx.stroke();

          // Labeled contour height on high zoom
          if (z >= 13 && isIndex && i === 1 && j === 1) {
            ctx.fillStyle = textFill;
            ctx.font = '8px monospace';
            ctx.fillText(`${ptElev}m`, cx - 12, cy - 2);
          }
        }
      }
    }

    // 4. Tactical Tile Telemetry Coordinates
    if (this.showTileCoords) {
      ctx.fillStyle = textFill;
      ctx.font = '9px monospace';

      // Top-Left corner: Lat / Lng & Offline status
      const latStr = `${Math.abs(centerLat).toFixed(3)}°${centerLat >= 0 ? 'N' : 'S'}`;
      const lngStr = `${Math.abs(centerLng).toFixed(3)}°${centerLng >= 0 ? 'E' : 'W'}`;
      ctx.fillText(`${latStr} ${lngStr}`, 10, 18);

      // Bottom-Left corner: Elevation & Offline tag
      ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.font = '8px monospace';
      ctx.fillText(`OFFLINE GIS • ELEV ${elevation}m`, 10, h - 8);

      // Bottom-Right corner: Zoom & Tile Index
      ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.textAlign = 'right';
      ctx.fillText(`Z${z} [${x},${y}]`, w - 8, h - 8);
      ctx.textAlign = 'left';
    }

    // Border tick marks on tile edges for military map feel
    ctx.strokeStyle = gridStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
  }
}

// Leaflet Factory Function
export function createOfflineGridLayer(options?: OfflineGridLayerOptions): OfflineTacticalGridLayer {
  return new OfflineTacticalGridLayer(options);
}
