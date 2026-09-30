import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useDRS } from '../store';
import {
  Crosshair,
  LocateFixed,
  Layers,
  MousePointerClick,
  Navigation,
  MapPin,
  Loader2,
  PlaneTakeoff,
  ShieldAlert,
  Route,
  Trash2,
  X,
  Check,
  Search,
  Maximize2,
  Minimize2,
  Compass,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Mountain,
  Compass as CompassIcon,
} from 'lucide-react';

interface FreeTacticalMapProps {
  onRecenter?: () => void;
}

export type TileStyle =
  | 'voyager'
  | 'osm'
  | 'satellite_hybrid'
  | 'satellite'
  | 'cyclosm'
  | 'esri_street'
  | 'topo'
  | 'hot'
  | 'opentopo'
  | 'dark'
  | 'light';

interface TileConfig {
  url: string;
  overlayUrl?: string;
  attribution: string;
  maxZoom: number;
  label: string;
  subtext: string;
  category: 'Streets' | 'Satellite' | 'Terrain' | 'Emergency' | 'Tactical';
  subdomains?: string;
  icon: string;
}

export const FREE_TILE_SERVERS: Record<TileStyle, TileConfig> = {
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
    label: 'OpenStreetMap Voyager',
    subtext: 'Crisp Streets & Landmarks (CARTO)',
    category: 'Streets',
    subdomains: 'abcd',
    icon: '🗺️',
  },
  satellite_hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    label: 'Satellite Hybrid HD',
    subtext: 'Esri Satellite + Roads & City Names',
    category: 'Satellite',
    icon: '🌐',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, DigitalGlobe, GeoEye',
    maxZoom: 19,
    label: 'Satellite Imagery',
    subtext: 'Esri High-Resolution World Imagery',
    category: 'Satellite',
    icon: '🛰️',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors (OSM France mirror)',
    maxZoom: 20,
    label: 'OpenStreetMap Standard',
    subtext: 'Global Community Cartography',
    category: 'Streets',
    subdomains: 'abc',
    icon: '📍',
  },
  cyclosm: {
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CyclOSM',
    maxZoom: 20,
    label: 'CyclOSM OpenStreetMap',
    subtext: 'Detailed Community Path & Terrain Cartography',
    category: 'Streets',
    subdomains: 'abc',
    icon: '🚴',
  },
  esri_street: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, DeLorme, NAVTEQ',
    maxZoom: 19,
    label: 'Esri World Street',
    subtext: 'Detailed Highways & Public Transit',
    category: 'Streets',
    icon: '🛣️',
  },
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, USGS, NOAA',
    maxZoom: 19,
    label: 'Esri Topographic',
    subtext: 'Contour Relief & Shaded Elevation',
    category: 'Terrain',
    icon: '⛰️',
  },
  hot: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; Humanitarian OSM',
    maxZoom: 19,
    label: 'Humanitarian (HOT)',
    subtext: 'Disaster Relief & Search-and-Rescue',
    category: 'Emergency',
    subdomains: 'abc',
    icon: '🚨',
  },
  opentopo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap &copy; OpenTopoMap',
    maxZoom: 17,
    label: 'OpenTopoMap',
    subtext: 'Mountain Elevation & Contour Lines',
    category: 'Terrain',
    subdomains: 'abc',
    icon: '🏔️',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
    label: 'Tactical Dark Matter',
    subtext: 'Night-Vision Radar Canvas',
    category: 'Tactical',
    subdomains: 'abcd',
    icon: '🕶️',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
    label: 'Positron Light',
    subtext: 'Clean High-Contrast Daylight',
    category: 'Streets',
    subdomains: 'abcd',
    icon: '☀️',
  },
};

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

const PRESET_ZONES = [
  { name: 'Disaster Grid (Base)', lat: 28.4595, lng: 77.0266, zoom: 15, tag: 'BASE' },
  { name: 'Earthquake Zone (Kahramanmaraş)', lat: 37.5753, lng: 36.9228, zoom: 14, tag: 'SEISMIC' },
  { name: 'Flood Relief Sector (Kerala Coast)', lat: 9.9312, lng: 76.2673, zoom: 14, tag: 'FLOOD' },
  { name: 'Alpine SAR (Mont Blanc Valley)', lat: 45.9237, lng: 6.8694, zoom: 13, tag: 'MOUNTAIN' },
  { name: 'Urban Response (Tokyo Bay)', lat: 35.6762, lng: 139.7503, zoom: 14, tag: 'URBAN' },
];

export function FreeTacticalMap({ onRecenter }: FreeTacticalMapProps) {
  const {
    drones,
    selectedDrone,
    selectedDroneId,
    setSelectedDroneId,
    userLocation,
    isLocatingUser,
    userLocationError,
    requestUserLocation,
    deployFleetToLocation,
    centerMapTarget,
    setCenterMapTarget,
    waypoints,
    selectedWaypointId,
    setSelectedWaypointId,
    isPlacingWaypoint,
    setIsPlacingWaypoint,
    addWaypoint,
    removeWaypoint,
    sendDroneToWaypoint,
  } = useDRS();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.TileLayer | null>(null);

  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const homeMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const waypointMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const waypointPolylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const searchPinMarkerRef = useRef<L.Marker | null>(null);

  // Default to vivid CARTO Voyager (OpenStreetMap) so user immediately sees full-color streets & landmarks
  const [tileStyle, setTileStyle] = useState<TileStyle>('voyager');
  const [isTracking, setIsTracking] = useState(() => !centerMapTarget);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [layerCategory, setLayerCategory] = useState<string>('All');
  const [showReticle, setShowReticle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mouse coordinate tracker & zoom level
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14);

  // Search state (OpenStreetMap Nominatim Free Geocoder)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeSearchPin, setActiveSearchPin] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const [locationSuccessToast, setLocationSuccessToast] = useState(false);
  const [waypointPlacedToast, setWaypointPlacedToast] = useState<string | null>(null);

  const selectedWaypoint = waypoints.find((w) => w.id === selectedWaypointId);

  // Store waypoints and selectedWaypointId in refs so Leaflet click handlers always read latest state
  const waypointsRef = useRef(waypoints);
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  const selectedWaypointIdRef = useRef(selectedWaypointId);
  useEffect(() => {
    selectedWaypointIdRef.current = selectedWaypointId;
  }, [selectedWaypointId]);

  const isPlacingWaypointRef = useRef(isPlacingWaypoint);
  useEffect(() => {
    isPlacingWaypointRef.current = isPlacingWaypoint;
  }, [isPlacingWaypoint]);

  // Helper to switch tile layers safely
  const applyTileLayer = useCallback((styleKey: TileStyle, map: L.Map) => {
    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
      } catch (_) {}
      tileLayerRef.current = null;
    }
    if (overlayLayerRef.current) {
      try {
        map.removeLayer(overlayLayerRef.current);
      } catch (_) {}
      overlayLayerRef.current = null;
    }

    const config = FREE_TILE_SERVERS[styleKey] || FREE_TILE_SERVERS.voyager;

    const baseTile = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || 'abc',
    }).addTo(map);
    tileLayerRef.current = baseTile;

    // If configuration has a reference overlay (e.g. satellite hybrid roads & boundaries)
    if (config.overlayUrl) {
      const overlayTile = L.tileLayer(config.overlayUrl, {
        attribution: '',
        maxZoom: config.maxZoom,
        opacity: 0.9,
      }).addTo(map);
      overlayLayerRef.current = overlayTile;
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const initialLat = centerMapTarget
      ? centerMapTarget.lat
      : userLocation
      ? userLocation.lat
      : selectedDrone
      ? selectedDrone.coordinates.lat
      : 28.4595;
    const initialLng = centerMapTarget
      ? centerMapTarget.lng
      : userLocation
      ? userLocation.lng
      : selectedDrone
      ? selectedDrone.coordinates.lng
      : 77.0266;
    const initialZoom = centerMapTarget?.zoom || (userLocation ? 16 : 14);

    let map: L.Map;
    try {
      map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
      });
    } catch (e) {
      console.warn('Leaflet initialization catch:', e);
      return;
    }

    // Zoom control at bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Scale control (metric + imperial) for tactical distance estimation
    L.control.scale({ position: 'bottomleft', imperial: true, metric: true }).addTo(map);

    // Initial tile layer (CARTO Voyager OpenStreetMap)
    applyTileLayer(tileStyle, map);

    mapInstanceRef.current = map;
    setCurrentZoom(map.getZoom());

    // Coordinate & Zoom Tracking
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setMouseCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const initTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 120);

    map.on('dragstart', () => {
      setIsTracking(false);
    });

    // Map Click Listener to Place or Select Tactical Waypoints
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      // Check if user clicked near an existing waypoint
      const nearbyWaypoint = waypointsRef.current.find((wp) => {
        const dLat = Math.abs(wp.coordinates.lat - clickLat);
        const dLng = Math.abs(wp.coordinates.lng - clickLng);
        return dLat < 0.00045 && dLng < 0.00045;
      });

      if (nearbyWaypoint) {
        if (selectedWaypointIdRef.current === nearbyWaypoint.id) {
          removeWaypoint(nearbyWaypoint.id);
          setSelectedWaypointId(null);
          setWaypointPlacedToast(`Removed: ${nearbyWaypoint.name}`);
          setTimeout(() => setWaypointPlacedToast(null), 2500);
        } else {
          setSelectedWaypointId(nearbyWaypoint.id);
          setWaypointPlacedToast(`Selected: ${nearbyWaypoint.name} (Click again to remove)`);
          setTimeout(() => setWaypointPlacedToast(null), 2500);
        }
      } else if (isPlacingWaypointRef.current) {
        const newWp = addWaypoint({
          lat: Number(clickLat.toFixed(6)),
          lng: Number(clickLng.toFixed(6)),
        });
        setSelectedWaypointId(newWp.id);
        setWaypointPlacedToast(`Placed ${newWp.name}`);
        setTimeout(() => setWaypointPlacedToast(null), 3000);
      }
    });

    return () => {
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      try {
        map.remove();
      } catch (e) {
        // Safe catch
      }
      if (mapContainerRef.current) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Update tile layer when style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    applyTileLayer(tileStyle, mapInstanceRef.current);
  }, [tileStyle, applyTileLayer]);

  // Center on centerMapTarget when triggered
  useEffect(() => {
    if (centerMapTarget && mapInstanceRef.current) {
      setIsTracking(false);
      const map = mapInstanceRef.current;
      const targetLatLng: [number, number] = [centerMapTarget.lat, centerMapTarget.lng];
      const targetZoom = centerMapTarget.zoom || 17;

      map.invalidateSize();
      map.flyTo(targetLatLng, targetZoom, { duration: 1.2 });
    }
  }, [centerMapTarget]);

  // Update User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      const userLatLng: [number, number] = [userLocation.lat, userLocation.lng];

      const userIcon = L.divIcon({
        className: 'drs-user-location-icon',
        html: `
          <div class="relative w-12 h-12 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto">
            <div class="absolute inset-0 bg-blue-500/30 rounded-full animate-ping"></div>
            <div class="absolute inset-1.5 bg-cyan-400/25 rounded-full animate-pulse border border-cyan-400/80"></div>
            <div class="w-7 h-7 rounded-full bg-blue-600 text-white border-2 border-white shadow-[0_0_18px_rgba(59,130,246,0.9)] flex items-center justify-center z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-950 text-blue-300 border border-blue-500/70 shadow-lg">
              YOU (OPERATOR)
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      if (!userMarkerRef.current) {
        const marker = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
        marker.bindPopup(`
          <div class="font-mono text-xs text-zinc-200">
            <div class="font-bold text-blue-400 flex items-center gap-1.5 border-b border-zinc-800 pb-1 mb-1.5">
              <span>OPERATOR GROUND COMMAND</span>
            </div>
            <div class="text-[11px] text-zinc-300 space-y-1">
              <div><span class="text-zinc-500">LAT:</span> ${userLocation.lat.toFixed(5)}</div>
              <div><span class="text-zinc-500">LNG:</span> ${userLocation.lng.toFixed(5)}</div>
              ${userLocation.accuracy ? `<div><span class="text-zinc-500">ACCURACY:</span> ±${Math.round(userLocation.accuracy)}m</div>` : ''}
            </div>
          </div>
        `, { className: 'drs-popup', closeButton: false });
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setLatLng(userLatLng);
        userMarkerRef.current.setIcon(userIcon);
      }

      if (userLocation.accuracy && userLocation.accuracy < 2000) {
        if (!userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current = L.circle(userLatLng, {
            radius: userLocation.accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray: '3, 6',
          }).addTo(map);
        } else {
          userAccuracyCircleRef.current.setLatLng(userLatLng);
          userAccuracyCircleRef.current.setRadius(userLocation.accuracy);
        }
      }
    } else {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        map.removeLayer(userAccuracyCircleRef.current);
        userAccuracyCircleRef.current = null;
      }
    }
  }, [userLocation]);

  // Update Drone Markers and Paths
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentDroneIds = new Set(drones.map((d) => d.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentDroneIds.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });
    homeMarkersRef.current.forEach((homeMarker, id) => {
      if (!currentDroneIds.has(id)) {
        map.removeLayer(homeMarker);
        homeMarkersRef.current.delete(id);
      }
    });
    polylinesRef.current.forEach((polyline, id) => {
      if (!currentDroneIds.has(id)) {
        map.removeLayer(polyline);
        polylinesRef.current.delete(id);
      }
    });

    drones.forEach((drone) => {
      const isSelected = drone.id === selectedDroneId;
      const latLng: [number, number] = [drone.coordinates.lat, drone.coordinates.lng];
      const homeLatLng: [number, number] = [drone.homeCoordinates.lat, drone.homeCoordinates.lng];

      const customIcon = L.divIcon({
        className: 'drs-custom-drone-icon',
        html: `
          <div class="relative w-11 h-11 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group">
            ${
              isSelected
                ? `<div class="absolute inset-0 bg-cyan-500/25 rounded-full animate-ping"></div>
                   <div class="absolute -inset-2 bg-cyan-400/20 rounded-full animate-pulse border-2 border-cyan-400/60"></div>`
                : ''
            }
            <div class="w-8 h-8 rounded-full ${
              isSelected
                ? 'bg-cyan-500 text-black border-2 border-white shadow-[0_0_22px_rgba(6,182,212,1)]'
                : 'bg-zinc-950 text-cyan-400 border border-cyan-500/70 shadow-lg'
            } flex items-center justify-center font-mono font-bold text-[10px] transition-transform group-hover:scale-115">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${drone.telemetry.heading || 0}deg);">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
              isSelected ? 'bg-cyan-950 text-cyan-200 border border-cyan-500 shadow-md' : 'bg-zinc-950/90 text-zinc-300 border border-zinc-800 shadow-sm'
            } backdrop-blur-sm pointer-events-none">
              ${drone.name}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      let marker = markersRef.current.get(drone.id);
      if (!marker) {
        marker = L.marker(latLng, { icon: customIcon, zIndexOffset: isSelected ? 1500 : 900 }).addTo(map);
        marker.on('click', () => {
          setSelectedDroneId(drone.id);
        });
        marker.bindPopup(`
          <div class="font-mono text-xs text-zinc-200 min-w-[170px]">
            <div class="font-bold text-cyan-400 flex items-center justify-between gap-2 border-b border-zinc-800 pb-1 mb-1.5">
              <span>${drone.name}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">${drone.status}</span>
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-300">
              <div><span class="text-zinc-500">ALT:</span> ${drone.telemetry.altitude}m</div>
              <div><span class="text-zinc-500">SPD:</span> ${drone.telemetry.speed.toFixed(1)} km/h</div>
              <div><span class="text-zinc-500">BAT:</span> <span class="${drone.battery < 20 ? 'text-rose-400 font-bold' : 'text-emerald-400'}">${drone.battery}%</span></div>
              <div><span class="text-zinc-500">SATS:</span> ${drone.telemetry.satelliteCount} LOCK</div>
            </div>
          </div>
        `, { className: 'drs-popup', closeButton: false });
        markersRef.current.set(drone.id, marker);
      } else {
        marker.setLatLng(latLng);
        marker.setIcon(customIcon);
        marker.setZIndexOffset(isSelected ? 1500 : 900);
      }

      // Home Position Marker
      const homeIcon = L.divIcon({
        className: 'drs-home-icon',
        html: `
          <div class="w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center font-mono font-black text-[10px] shadow-[0_0_12px_rgba(16,185,129,0.7)]" title="${drone.name} Home Base">
            H
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      let homeMarker = homeMarkersRef.current.get(drone.id);
      if (!homeMarker) {
        homeMarker = L.marker(homeLatLng, { icon: homeIcon }).addTo(map);
        homeMarkersRef.current.set(drone.id, homeMarker);
      } else {
        homeMarker.setLatLng(homeLatLng);
      }

      // Path Polyline
      const pathCoordinates: [number, number][] = drone.path.map((p) => [p.lat, p.lng]);
      let polyline = polylinesRef.current.get(drone.id);
      if (!polyline) {
        polyline = L.polyline(pathCoordinates, {
          color: isSelected ? '#06b6d4' : '#64748b',
          weight: isSelected ? 3.5 : 2,
          opacity: isSelected ? 0.95 : 0.6,
          dashArray: isSelected ? undefined : '5, 5',
        }).addTo(map);
        polylinesRef.current.set(drone.id, polyline);
      } else {
        polyline.setLatLngs(pathCoordinates);
        polyline.setStyle({
          color: isSelected ? '#06b6d4' : '#64748b',
          weight: isSelected ? 3.5 : 2,
          opacity: isSelected ? 0.95 : 0.6,
        });
      }
    });

    if (isTracking && !centerMapTarget && selectedDrone) {
      map.panTo([selectedDrone.coordinates.lat, selectedDrone.coordinates.lng], {
        animate: true,
        duration: 0.4,
      });
    }
  }, [drones, selectedDroneId, isTracking, selectedDrone, setSelectedDroneId, centerMapTarget]);

  // Update Waypoint Markers and Lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentWpIds = new Set(waypoints.map((w) => w.id));
    waypointMarkersRef.current.forEach((marker, id) => {
      if (!currentWpIds.has(id)) {
        map.removeLayer(marker);
        waypointMarkersRef.current.delete(id);
      }
    });

    waypoints.forEach((wp) => {
      const isSelected = selectedWaypointId === wp.id;
      const isSurvivorDistress =
        wp.isVoiceAlert ||
        wp.name.toLowerCase().includes('survivor') ||
        wp.name.toLowerCase().includes('help') ||
        wp.name.toLowerCase().includes('distress');
      const latLng: [number, number] = [wp.coordinates.lat, wp.coordinates.lng];

      const wpIcon = L.divIcon({
        className: 'drs-waypoint-icon',
        html: isSurvivorDistress
          ? `
          <div class="relative w-16 h-16 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto cursor-pointer group">
            <div class="absolute inset-0 bg-rose-500/40 rounded-full animate-ping"></div>
            <div class="absolute inset-1.5 bg-rose-500/30 rounded-full animate-pulse border-2 border-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.9)]"></div>
            <div class="w-9 h-9 rounded-full bg-rose-600 text-white border-2 border-white flex items-center justify-center shadow-[0_0_24px_rgba(244,63,94,1)] z-10 transition-transform group-hover:scale-125">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
            </div>
            <div class="absolute -bottom-6 whitespace-nowrap px-2 py-0.5 rounded text-[9px] font-mono font-black bg-rose-950 text-rose-100 border border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.8)] flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
              <span>${wp.name}</span>
            </div>
          </div>
        `
          : `
          <div class="relative w-12 h-12 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto cursor-pointer group">
            ${isSelected ? '<div class="absolute inset-0 bg-amber-500/30 rounded-full animate-ping"></div>' : ''}
            <div class="absolute inset-1 bg-amber-500/20 rounded-full animate-pulse border border-amber-500/50"></div>
            <div class="w-7 h-7 rounded-lg transform rotate-45 flex items-center justify-center shadow-lg transition-transform group-hover:scale-115 ${
              isSelected
                ? 'bg-amber-400 text-black border-2 border-white shadow-[0_0_18px_rgba(245,158,11,1)]'
                : 'bg-zinc-950 text-amber-300 border-2 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
            }">
              <div class="transform -rotate-45 font-mono font-black text-[10px]">
                ${String(wp.index).padStart(2, '0')}
              </div>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-950 text-amber-300 border border-amber-500/70 shadow-md flex items-center gap-1">
              <span>${wp.name}</span>
            </div>
          </div>
        `,
        iconSize: isSurvivorDistress ? [64, 64] : [48, 48],
        iconAnchor: isSurvivorDistress ? [32, 32] : [24, 24],
      });

      let marker = waypointMarkersRef.current.get(wp.id);
      if (!marker) {
        marker = L.marker(latLng, { icon: wpIcon, zIndexOffset: isSurvivorDistress ? 2500 : 800 }).addTo(map);
        marker.on('click', (ev: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(ev);
          if (selectedWaypointIdRef.current === wp.id) {
            removeWaypoint(wp.id);
            setSelectedWaypointId(null);
            setWaypointPlacedToast(`Removed ${wp.name}`);
            setTimeout(() => setWaypointPlacedToast(null), 2500);
          } else {
            setSelectedWaypointId(wp.id);
            setWaypointPlacedToast(`Selected ${wp.name} (Click again to remove)`);
            setTimeout(() => setWaypointPlacedToast(null), 2500);
          }
        });

        marker.bindPopup(`
          <div class="font-mono text-[11px] text-zinc-200 min-w-[160px] p-0.5">
            <div class="font-bold ${isSurvivorDistress ? 'text-rose-400' : 'text-amber-400'} flex items-center justify-between gap-1.5 border-b border-zinc-800/80 pb-1 mb-1">
              <span class="truncate">${isSurvivorDistress ? '🚨 AI VOICE ALERT' : 'WP-' + String(wp.index).padStart(2, '0')}</span>
              <span class="text-[8px] px-1 py-0.2 rounded font-bold ${isSurvivorDistress ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50' : 'bg-amber-950/80 text-amber-300'}">${isSurvivorDistress ? 'ACTIVE PIN' : wp.action}</span>
            </div>
            <div class="text-[10px] text-zinc-300 font-semibold mb-1">${wp.name}</div>
            <div class="text-[10px] text-zinc-400 flex items-center justify-between">
              <span>GPS:</span>
              <span class="text-zinc-200">${wp.coordinates.lat.toFixed(5)}, ${wp.coordinates.lng.toFixed(5)}</span>
            </div>
          </div>
        `, { className: 'drs-popup', closeButton: false });

        waypointMarkersRef.current.set(wp.id, marker);
      } else {
        marker.setLatLng(latLng);
        marker.setIcon(wpIcon);
        marker.setZIndexOffset(isSurvivorDistress ? 2500 : 800);
      }
    });

    const wpCoordinates: [number, number][] = waypoints.map((w) => [w.coordinates.lat, w.coordinates.lng]);

    if (waypointPolylineRef.current) {
      waypointPolylineRef.current.setLatLngs(wpCoordinates);
    } else if (wpCoordinates.length > 0) {
      const poly = L.polyline(wpCoordinates, {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.9,
        dashArray: '6, 6',
      }).addTo(map);
      waypointPolylineRef.current = poly;
    }
  }, [waypoints, selectedWaypointId, setSelectedWaypointId, removeWaypoint]);

  // Search Pin Effect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeSearchPin) {
      const pinIcon = L.divIcon({
        className: 'drs-search-pin',
        html: `
          <div class="relative w-12 h-12 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div class="absolute inset-0 bg-emerald-500/30 rounded-full animate-ping"></div>
            <div class="w-8 h-8 rounded-full bg-emerald-500 text-black border-2 border-white shadow-[0_0_20px_rgba(16,185,129,1)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-200 border border-emerald-500 shadow-md">
              ${activeSearchPin.name}
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      if (!searchPinMarkerRef.current) {
        const marker = L.marker([activeSearchPin.lat, activeSearchPin.lng], { icon: pinIcon, zIndexOffset: 3000 }).addTo(map);
        searchPinMarkerRef.current = marker;
      } else {
        searchPinMarkerRef.current.setLatLng([activeSearchPin.lat, activeSearchPin.lng]);
        searchPinMarkerRef.current.setIcon(pinIcon);
      }
    } else {
      if (searchPinMarkerRef.current) {
        map.removeLayer(searchPinMarkerRef.current);
        searchPinMarkerRef.current = null;
      }
    }
  }, [activeSearchPin]);

  // Free OpenStreetMap Nominatim Geocoding Search
  const handlePerformSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchDropdown(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      if (response.ok) {
        const data: SearchResult[] = await response.json();
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Nominatim search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (isNaN(lat) || isNaN(lng)) return;

    setShowSearchDropdown(false);
    setIsTracking(false);

    const displayNameShort = result.display_name.split(',').slice(0, 2).join(',');
    setActiveSearchPin({
      name: displayNameShort,
      lat,
      lng,
    });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.5 });
    }
  };

  const handleLocateUser = async (deployNearby = false) => {
    setIsTracking(false);
    const loc = await requestUserLocation(deployNearby);
    if (loc && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], 16, { duration: 1.2 });
      setLocationSuccessToast(true);
      setTimeout(() => setLocationSuccessToast(false), 4000);
    }
  };

  const handleRecenterDrone = () => {
    setCenterMapTarget(null);
    setIsTracking(true);
    if (mapInstanceRef.current && selectedDrone) {
      mapInstanceRef.current.flyTo(
        [selectedDrone.coordinates.lat, selectedDrone.coordinates.lng],
        16,
        { duration: 1 }
      );
    }
    if (onRecenter) onRecenter();
  };

  const handleJumpToPreset = (zone: (typeof PRESET_ZONES)[0]) => {
    setIsTracking(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([zone.lat, zone.lng], zone.zoom, { duration: 1.4 });
    }
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current?.parentElement) return;
    const parent = mapContainerRef.current.parentElement;
    if (!document.fullscreenElement) {
      parent.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="w-full h-full relative bg-zinc-950 flex select-none overflow-hidden font-sans">
      {/* Map DOM target */}
      <div
        ref={mapContainerRef}
        className="w-full h-full flex-1 z-0"
        style={{ height: '100%', width: '100%' }}
      />

      {/* Optional Tactical Target Overlay Reticle */}
      {showReticle && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 z-[300]">
          <div className="w-64 h-64 border border-cyan-400 rounded-full flex items-center justify-center">
            <div className="w-0.5 h-4 bg-cyan-400 absolute top-0"></div>
            <div className="w-0.5 h-4 bg-cyan-400 absolute bottom-0"></div>
            <div className="w-4 h-0.5 bg-cyan-400 absolute left-0"></div>
            <div className="w-4 h-0.5 bg-cyan-400 absolute right-0"></div>
            <div className="w-48 h-48 border border-dashed border-cyan-400/50 rounded-full animate-[spin_60s_linear_infinite]"></div>
            <Crosshair className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
      )}

      {/* Top Left: Free Map Engine Badge & Search Bar */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2 max-w-sm sm:max-w-md pointer-events-auto">
        {/* Free Map Branding Banner */}
        <div className="bg-zinc-950/90 backdrop-blur-md border border-cyan-500/40 px-3 py-1.5 rounded-lg shadow-2xl flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <span className="text-zinc-100 font-bold tracking-wider">FREE ONLINE MAP</span>
            <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
              OpenStreetMap & Esri GIS
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span>No API Key Required</span>
          </div>
        </div>

        {/* Global Location Search Input (Nominatim OpenStreetMap) */}
        <div className="relative">
          <form
            onSubmit={handlePerformSearch}
            className="flex items-center bg-zinc-950/90 backdrop-blur-md border border-zinc-700/80 focus-within:border-cyan-400 rounded-lg shadow-xl overflow-hidden transition-all"
          >
            <div className="pl-3 pr-2 text-zinc-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Search city, address, or landmark worldwide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchDropdown(true);
              }}
              className="w-full bg-transparent py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            {isSearching ? (
              <div className="px-3 text-cyan-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchDropdown(false);
                  setActiveSearchPin(null);
                }}
                className="px-2 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <button
              type="submit"
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-mono px-3 py-2 border-l border-zinc-700 transition-colors shrink-0"
            >
              Go
            </button>
          </form>

          {/* Search Results Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-zinc-950/95 border border-zinc-700/90 rounded-lg shadow-2xl backdrop-blur-xl overflow-hidden z-50 divide-y divide-zinc-800">
              {searchResults.map((item) => (
                <button
                  key={item.place_id}
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2.5 hover:bg-zinc-800/80 transition-colors flex items-start gap-2.5 group"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                      {item.display_name}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      Lat: {parseFloat(item.lat).toFixed(4)}, Lon: {parseFloat(item.lon).toFixed(4)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Disaster Preset Jump Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider shrink-0 mr-0.5">Presets:</span>
          {PRESET_ZONES.map((zone) => (
            <button
              key={zone.name}
              onClick={() => handleJumpToPreset(zone)}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900/85 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-200 border border-zinc-700/70 hover:border-cyan-500/50 whitespace-nowrap transition-all shadow-sm"
              title={`Fly map to ${zone.name}`}
            >
              {zone.tag}
            </button>
          ))}
        </div>

        {/* Active Search Pin Action Card */}
        {activeSearchPin && (
          <div className="bg-zinc-950/95 border border-emerald-500/60 p-2.5 rounded-lg shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs font-mono">
            <div className="min-w-0">
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>SEARCH PINNED</span>
              </div>
              <div className="text-zinc-200 text-xs font-semibold truncate">{activeSearchPin.name}</div>
              <div className="text-[10px] text-zinc-400">
                {activeSearchPin.lat.toFixed(4)}, {activeSearchPin.lng.toFixed(4)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  deployFleetToLocation(activeSearchPin.lat, activeSearchPin.lng);
                  setWaypointPlacedToast(`Fleet dispatched to ${activeSearchPin.name}`);
                  setTimeout(() => setWaypointPlacedToast(null), 3000);
                }}
                className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded text-[10px] font-bold flex items-center gap-1"
                title="Deploy all available drones around this point"
              >
                <PlaneTakeoff className="w-3 h-3" />
                <span>Fly Fleet</span>
              </button>
              <button
                onClick={() => {
                  addWaypoint(
                    {
                      lat: Number(activeSearchPin.lat.toFixed(6)),
                      lng: Number(activeSearchPin.lng.toFixed(6)),
                    },
                    {
                      name: `Pin: ${activeSearchPin.name.slice(0, 14)}`,
                    }
                  );
                  setWaypointPlacedToast(`Waypoint created at ${activeSearchPin.name}`);
                  setTimeout(() => setWaypointPlacedToast(null), 3000);
                }}
                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded text-[10px] font-bold flex items-center gap-1"
              >
                <Route className="w-3 h-3" />
                <span>+WP</span>
              </button>
              <button
                onClick={() => setActiveSearchPin(null)}
                className="p-1 text-zinc-400 hover:text-zinc-200"
                title="Clear pin"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* User GPS Status Pill */}
        {userLocation && (
          <div className="bg-zinc-950/90 backdrop-blur-md border border-blue-500/40 px-3 py-1.5 rounded-lg shadow-xl flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-300">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold">
              <MapPin className="w-3.5 h-3.5 animate-bounce" />
              <span>GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</span>
            </div>
            <button
              onClick={() => handleLocateUser(true)}
              className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40 transition-colors flex items-center gap-1"
              title="Spawn patrol fleet around your real-time coordinates"
            >
              <PlaneTakeoff className="w-3 h-3" />
              <span>Deploy Fleet</span>
            </button>
          </div>
        )}

        {/* GPS Error Alert */}
        {userLocationError && (
          <div className="bg-rose-950/90 border border-rose-500/50 p-2 rounded-lg text-rose-200 text-xs font-mono shadow-xl flex items-start gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{userLocationError}</span>
          </div>
        )}

        {locationSuccessToast && (
          <div className="bg-emerald-950/90 border border-emerald-500/50 px-3 py-1.5 rounded-lg text-emerald-200 text-xs font-mono shadow-xl flex items-center gap-1.5 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span>User Location Acquired & Map Centered</span>
          </div>
        )}

        {waypointPlacedToast && (
          <div className="bg-amber-950/90 border border-amber-500/50 px-3 py-1.5 rounded-lg text-amber-200 text-xs font-mono shadow-xl flex items-center gap-1.5 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
            <span>{waypointPlacedToast}</span>
          </div>
        )}
      </div>

      {/* Top Center: Waypoint Placement Active Banner */}
      {isPlacingWaypoint && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-amber-950/90 backdrop-blur-md border border-amber-500/70 px-4 py-2 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-3 font-mono text-xs text-amber-200 animate-pulse pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <div>
            <span className="font-bold">CLICK MAP TO PLACE WAYPOINT:</span> adding{' '}
            <span className="underline font-bold">WP-{String(waypoints.length + 1).padStart(2, '0')}</span>
          </div>
          <button
            onClick={() => setIsPlacingWaypoint(false)}
            className="ml-2 p-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors"
            title="Exit placement mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Right: Free Map Layer Switcher Toolbar */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2 pointer-events-auto">
        {/* Quick Preset Selector Buttons (Streets, Satellite, Hybrid, Topo, Emergency, Dark) */}
        <div className="hidden lg:flex items-center bg-zinc-950/90 backdrop-blur-md border border-zinc-700/80 rounded-xl p-1 shadow-2xl gap-1">
          <button
            onClick={() => setTileStyle('voyager')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              tileStyle === 'voyager'
                ? 'bg-cyan-500 text-black font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="OpenStreetMap Voyager (Vivid Streets & Landmarks)"
          >
            <span>🗺️</span>
            <span>Voyager</span>
          </button>
          <button
            onClick={() => setTileStyle('osm')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              tileStyle === 'osm'
                ? 'bg-cyan-500 text-black font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="OpenStreetMap Standard (Community Cartography)"
          >
            <span>📍</span>
            <span>OSM</span>
          </button>
          <button
            onClick={() => setTileStyle('satellite_hybrid')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              tileStyle === 'satellite_hybrid'
                ? 'bg-cyan-500 text-black font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Esri Satellite with Highway & Place Labels"
          >
            <span>🌐</span>
            <span>Hybrid</span>
          </button>
          <button
            onClick={() => setTileStyle('satellite')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              tileStyle === 'satellite'
                ? 'bg-cyan-500 text-black font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Pure High-Resolution Satellite Imagery"
          >
            <span>🛰️</span>
            <span>Satellite</span>
          </button>
          <button
            onClick={() => setTileStyle('topo')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              tileStyle === 'topo'
                ? 'bg-cyan-500 text-black font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Esri Topographic Contour Relief"
          >
            <span>⛰️</span>
            <span>Topo</span>
          </button>
          <button
            onClick={() => setTileStyle('hot')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              tileStyle === 'hot'
                ? 'bg-rose-500 text-white font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Humanitarian OpenStreetMap (Disaster Relief)"
          >
            <span>🚨</span>
            <span>Rescue</span>
          </button>
          <button
            onClick={() => setTileStyle('dark')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              tileStyle === 'dark'
                ? 'bg-cyan-500 text-black font-bold shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Tactical Dark Matter (Night Vision)"
          >
            <span>🕶️</span>
            <span>Dark</span>
          </button>
        </div>

        {/* All Free Map Layers Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-700/80 hover:border-cyan-400 text-zinc-200 text-xs font-mono font-medium backdrop-blur-md shadow-2xl transition-all"
            title="View All Free Online Map Providers"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold">{FREE_TILE_SERVERS[tileStyle]?.label || 'Map Layers'}</span>
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-h-[480px] bg-zinc-950/95 border border-zinc-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-100 font-bold">
                    Free Online Maps
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                  100% Free
                </span>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {['All', 'Streets', 'Satellite', 'Terrain', 'Emergency', 'Tactical'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setLayerCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors ${
                      layerCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                        : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Map Tile Options List */}
              <div className="overflow-y-auto max-h-64 flex flex-col gap-1 pr-1 custom-scrollbar">
                {(Object.keys(FREE_TILE_SERVERS) as TileStyle[])
                  .filter((key) => {
                    const cfg = FREE_TILE_SERVERS[key];
                    return layerCategory === 'All' || cfg.category === layerCategory;
                  })
                  .map((key) => {
                    const cfg = FREE_TILE_SERVERS[key];
                    const isActive = tileStyle === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setTileStyle(key);
                          setShowLayerMenu(false);
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-mono transition-all text-left group ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/50 shadow-sm'
                            : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-sm shrink-0">{cfg.icon}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-zinc-100 group-hover:text-cyan-200 truncate">
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-zinc-400 truncate">{cfg.subtext}</span>
                          </div>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })}
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                <span>Free Open Access</span>
                <span className="text-cyan-400 font-bold">OpenStreetMap & Esri</span>
              </div>
            </div>
          )}
        </div>

        {/* Reticle HUD Toggle */}
        <button
          onClick={() => setShowReticle(!showReticle)}
          className={`p-2 rounded-xl backdrop-blur-md border shadow-xl transition-all ${
            showReticle
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              : 'bg-zinc-950/90 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
          }`}
          title={showReticle ? 'Hide Tactical Crosshair' : 'Show Tactical Crosshair'}
        >
          {showReticle ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-700/80 hover:border-cyan-400 text-zinc-300 hover:text-white backdrop-blur-md shadow-xl transition-all"
          title={isFullscreen ? 'Exit Fullscreen' : 'View Map Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Selected Waypoint Card */}
      {selectedWaypoint && (
        <div
          className={`absolute bottom-6 left-6 z-[400] w-72 bg-zinc-950/95 p-3.5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col gap-2.5 font-mono border pointer-events-auto ${
            selectedWaypoint.isVoiceAlert ||
            selectedWaypoint.name.toLowerCase().includes('survivor') ||
            selectedWaypoint.name.toLowerCase().includes('distress')
              ? 'border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
              : 'border-amber-500/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-6 h-6 rounded-md font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm ${
                  selectedWaypoint.isVoiceAlert || selectedWaypoint.name.toLowerCase().includes('survivor')
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-400 text-black'
                }`}
              >
                {selectedWaypoint.isVoiceAlert ? '🚨' : String(selectedWaypoint.index).padStart(2, '0')}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-zinc-100 truncate">{selectedWaypoint.name}</div>
                <div
                  className={`text-[9px] font-semibold ${
                    selectedWaypoint.isVoiceAlert ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  {selectedWaypoint.isVoiceAlert ? 'AI VOICE DISTRESS PIN' : selectedWaypoint.action}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedWaypointId(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
              title="Deselect"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[10px] text-zinc-400 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span>COORDINATES:</span>
              <span className="text-zinc-200 font-semibold">
                {selectedWaypoint.coordinates.lat.toFixed(5)}°, {selectedWaypoint.coordinates.lng.toFixed(5)}°
              </span>
            </div>
            {selectedWaypoint.distressTranscript && (
              <div className="text-[9px] bg-rose-950/40 border border-rose-500/30 rounded p-1.5 text-rose-200">
                &ldquo;{selectedWaypoint.distressTranscript}&rdquo;
              </div>
            )}
            <div className="text-[9px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Saved on map until manually removed</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {selectedDrone && (
              <button
                onClick={() => sendDroneToWaypoint(selectedDrone.id, selectedWaypoint.id)}
                className="flex-1 py-1.5 px-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                title={`Fly ${selectedDrone.name} to this waypoint`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Fly Drone</span>
              </button>
            )}
            <button
              onClick={() => {
                removeWaypoint(selectedWaypoint.id);
                setSelectedWaypointId(null);
                setWaypointPlacedToast(`Removed ${selectedWaypoint.name}`);
                setTimeout(() => setWaypointPlacedToast(null), 3000);
              }}
              className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              title="Delete this waypoint"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Center: Real-time Cursor Coordinates & Zoom Pill */}
      {mouseCoords && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[390] bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-zinc-300 text-[11px] font-mono px-3.5 py-1 rounded-full flex items-center gap-3 shadow-lg pointer-events-none">
          <div className="flex items-center gap-1 text-cyan-400 font-bold">
            <CompassIcon className="w-3 h-3" />
            <span>LAT:</span>
            <span className="text-zinc-200">{mouseCoords.lat.toFixed(4)}°</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-1 text-cyan-400 font-bold">
            <span>LNG:</span>
            <span className="text-zinc-200">{mouseCoords.lng.toFixed(4)}°</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-700" />
          <div className="text-zinc-400">
            <span>ZOOM:</span> <span className="text-zinc-200">{currentZoom}</span>
          </div>
        </div>
      )}

      {/* Bottom Right: Tactical Map Controls */}
      <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-2 pointer-events-auto">
        {!isTracking && (
          <div className="bg-zinc-950/90 border border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md mb-1 shadow-lg mx-auto">
            <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manual Pan Active</span>
          </div>
        )}

        {/* Tactical Waypoint Placement Toggle */}
        <button
          onClick={() => setIsPlacingWaypoint(!isPlacingWaypoint)}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xl backdrop-blur-md border ${
            isPlacingWaypoint
              ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse'
              : 'bg-zinc-950/90 text-amber-300 border-amber-500/50 hover:bg-amber-950/50 hover:border-amber-400'
          }`}
        >
          <Route className={`w-4 h-4 text-amber-400 ${isPlacingWaypoint ? 'animate-bounce' : ''}`} />
          <span>{isPlacingWaypoint ? 'CANCEL PLACEMENT' : '+ PLACE WAYPOINT'}</span>
        </button>

        {/* GPS Locate Me Button */}
        <button
          onClick={() => handleLocateUser(false)}
          disabled={isLocatingUser}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xl backdrop-blur-md border bg-blue-600/30 text-blue-300 border-blue-500/60 hover:bg-blue-600/50 hover:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          {isLocatingUser ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>ACQUIRING GPS FIX...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>{userLocation ? 'RE-CENTER ON ME' : 'MY CURRENT LOCATION'}</span>
            </>
          )}
        </button>

        {/* Drone Lock Button */}
        <button
          onClick={handleRecenterDrone}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xl backdrop-blur-md border ${
            isTracking
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_18px_rgba(6,182,212,0.3)]'
              : 'bg-zinc-950/90 text-zinc-300 border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          <LocateFixed className={`w-4 h-4 ${isTracking ? 'animate-pulse' : ''}`} />
          {isTracking ? 'AUTO-TRACKING: ACTIVE' : 'LOCK ON DRONE'}
        </button>
      </div>
    </div>
  );
}
