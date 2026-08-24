import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useDRS } from '../store';
import { Crosshair, LocateFixed, Layers, MousePointerClick, Navigation, MapPin, Loader2, PlaneTakeoff, ShieldAlert, Route, Plus, Trash2, X } from 'lucide-react';

interface FreeTacticalMapProps {
  onRecenter?: () => void;
}

type TileStyle = 'dark' | 'satellite' | 'street';

const TILE_SERVERS: Record<TileStyle, { url: string; attribution: string; maxZoom: number }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

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
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const homeMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const waypointMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const waypointPolylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);

  const [tileStyle, setTileStyle] = useState<TileStyle>('dark');
  const [isTracking, setIsTracking] = useState(true);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
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

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any stale leaflet ID on container
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
      console.warn("Leaflet initialization catch:", e);
      return;
    }

    // Custom dark-styled zoom control at bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Initial tile layer
    const tileConfig = TILE_SERVERS[tileStyle];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Immediately trigger invalidateSize and center verification
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        if (centerMapTarget) {
          mapInstanceRef.current.setView(
            [centerMapTarget.lat, centerMapTarget.lng],
            centerMapTarget.zoom || 16,
            { animate: false }
          );
        }
      }
    }, 120);

    map.on('dragstart', () => {
      setIsTracking(false);
    });

    // Map Click Listener to Place or Select Tactical Waypoints
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      // Check if user clicked near an existing waypoint (within ~40m / ~0.00045 deg)
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
          setTimeout(() => {
            setWaypointPlacedToast(null);
          }, 2500);
        } else {
          setSelectedWaypointId(nearbyWaypoint.id);
          setWaypointPlacedToast(`Selected: ${nearbyWaypoint.name} (Click again to remove)`);
          setTimeout(() => {
            setWaypointPlacedToast(null);
          }, 2500);
        }
      } else if (isPlacingWaypointRef.current) {
        const newWp = addWaypoint({
          lat: Number(clickLat.toFixed(6)),
          lng: Number(clickLng.toFixed(6)),
        });
        setSelectedWaypointId(newWp.id);
        setWaypointPlacedToast(`Placed ${newWp.name}`);
        setTimeout(() => {
          setWaypointPlacedToast(null);
        }, 3000);
      }
    });

    return () => {
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

  // Respond to centerMapTarget triggers (e.g. GPS update or Deploy fleet)
  useEffect(() => {
    if (centerMapTarget && mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView(
        [centerMapTarget.lat, centerMapTarget.lng],
        centerMapTarget.zoom || 16,
        { animate: true }
      );
    }
  }, [centerMapTarget]);

  // Update tile layer when style changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileConfig = TILE_SERVERS[tileStyle];
    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [tileStyle]);

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
            <div class="absolute inset-0 bg-blue-500/25 rounded-full animate-ping"></div>
            <div class="absolute inset-1.5 bg-cyan-400/20 rounded-full animate-pulse border border-cyan-400/60"></div>
            <div class="w-7 h-7 rounded-full bg-blue-600 text-white border-2 border-white shadow-[0_0_18px_rgba(59,130,246,0.9)] flex items-center justify-center z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/50 shadow-md">
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

      // Accuracy radius circle if available
      if (userLocation.accuracy && userLocation.accuracy < 2000) {
        if (!userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current = L.circle(userLatLng, {
            radius: userLocation.accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
            weight: 1,
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

  // Update Drone Markers and Flight Paths
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Prune removed drones
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

      // Custom HTML Marker for Drone
      const customIcon = L.divIcon({
        className: 'drs-custom-drone-icon',
        html: `
          <div class="relative w-10 h-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group">
            ${
              isSelected
                ? `<div class="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping"></div>
                   <div class="absolute -inset-2 bg-cyan-400/10 rounded-full animate-pulse border border-cyan-400/40"></div>`
                : ''
            }
            <div class="w-7 h-7 rounded-full ${
              isSelected
                ? 'bg-cyan-500 text-black border-2 border-white shadow-[0_0_20px_rgba(6,182,212,0.9)]'
                : 'bg-zinc-900 text-zinc-300 border border-zinc-600 shadow-md'
            } flex items-center justify-center font-mono font-bold text-[10px] transition-transform group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${drone.telemetry.heading || 0}deg);">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
              isSelected ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50' : 'bg-black/70 text-zinc-400 border border-zinc-800'
            } backdrop-blur-sm pointer-events-none">
              ${drone.name}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      // Drone Marker
      let marker = markersRef.current.get(drone.id);
      if (!marker) {
        marker = L.marker(latLng, { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setSelectedDroneId(drone.id);
        });
        marker.bindPopup(`
          <div class="font-mono text-xs text-zinc-200">
            <div class="font-bold text-cyan-400 flex items-center justify-between gap-2 border-b border-zinc-800 pb-1 mb-1.5">
              <span>${drone.name} (${drone.id})</span>
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
      }

      // Home Position Marker
      const homeIcon = L.divIcon({
        className: 'drs-home-icon',
        html: `
          <div class="w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 border border-emerald-500/80 text-emerald-400 flex items-center justify-center font-mono font-bold text-[9px] shadow-[0_0_8px_rgba(16,185,129,0.4)]" title="${drone.name} Base Station">
            H
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
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
          color: isSelected ? '#06b6d4' : '#3f3f46',
          weight: isSelected ? 3 : 1.5,
          opacity: isSelected ? 0.85 : 0.4,
          dashArray: isSelected ? undefined : '4, 4',
        }).addTo(map);
        polylinesRef.current.set(drone.id, polyline);
      } else {
        polyline.setLatLngs(pathCoordinates);
        polyline.setStyle({
          color: isSelected ? '#06b6d4' : '#3f3f46',
          weight: isSelected ? 3 : 1.5,
          opacity: isSelected ? 0.85 : 0.4,
        });
      }
    });

    // Auto-tracking camera centering
    if (isTracking && selectedDrone) {
      map.panTo([selectedDrone.coordinates.lat, selectedDrone.coordinates.lng], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [drones, selectedDroneId, isTracking, selectedDrone, setSelectedDroneId]);

  // Render & Update Tactical Waypoints Markers and Route Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Remove markers that no longer exist in state
    const currentWpIds = new Set(waypoints.map((w) => w.id));
    waypointMarkersRef.current.forEach((marker, id) => {
      if (!currentWpIds.has(id)) {
        map.removeLayer(marker);
        waypointMarkersRef.current.delete(id);
      }
    });

    // 2. Add or update waypoint markers
    waypoints.forEach((wp) => {
      const isSelected = selectedWaypointId === wp.id;
      const isSurvivorDistress = wp.isVoiceAlert || wp.name.toLowerCase().includes('survivor') || wp.name.toLowerCase().includes('help') || wp.name.toLowerCase().includes('distress');
      const latLng: [number, number] = [wp.coordinates.lat, wp.coordinates.lng];

      const wpIcon = L.divIcon({
        className: 'drs-waypoint-icon',
        html: isSurvivorDistress ? `
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
        ` : `
          <div class="relative w-12 h-12 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto cursor-pointer group">
            ${isSelected ? '<div class="absolute inset-0 bg-amber-500/25 rounded-full animate-ping"></div>' : ''}
            <div class="absolute inset-1 bg-amber-500/10 rounded-full animate-pulse border border-amber-500/30"></div>
            <div class="w-7 h-7 rounded-lg transform rotate-45 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
              isSelected
                ? 'bg-amber-400 text-black border-2 border-white shadow-[0_0_18px_rgba(245,158,11,0.95)]'
                : 'bg-zinc-950 text-amber-300 border border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
            }">
              <div class="transform -rotate-45 font-mono font-black text-[10px]">
                ${String(wp.index).padStart(2, '0')}
              </div>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-950/90 text-amber-300 border border-amber-500/50 shadow-md flex items-center gap-1">
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
          <div class="font-mono text-[11px] text-zinc-200 min-w-[150px] p-0.5">
            <div class="font-bold ${isSurvivorDistress ? 'text-rose-400' : 'text-amber-400'} flex items-center justify-between gap-1.5 border-b border-zinc-800/80 pb-1 mb-1">
              <span class="truncate">${isSurvivorDistress ? '🚨 AI VOICE ALERT' : 'WP-' + String(wp.index).padStart(2, '0')}</span>
              <span class="text-[8px] px-1 py-0.2 rounded font-bold ${isSurvivorDistress ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50' : 'bg-amber-950/80 text-amber-300'}">${isSurvivorDistress ? 'ACTIVE PIN' : wp.action}</span>
            </div>
            <div class="text-[10px] text-zinc-300 font-semibold mb-1">${wp.name}</div>
            <div class="text-[10px] text-zinc-400 flex items-center justify-between">
              <span>GPS:</span>
              <span class="text-zinc-200">${wp.coordinates.lat.toFixed(5)}, ${wp.coordinates.lng.toFixed(5)}</span>
            </div>
            <div class="text-[9px] text-emerald-400 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Remains pinned until dismissed</span>
            </div>
          </div>
        `, { className: 'drs-popup', closeButton: false });

        waypointMarkersRef.current.set(wp.id, marker);
      } else {
        marker.setLatLng(latLng);
        marker.setIcon(wpIcon);
        marker.setZIndexOffset(isSurvivorDistress ? 2500 : 800);
      }

      // Auto-open popup if selected
      if (selectedWaypointId === wp.id && !marker.isPopupOpen()) {
        setTimeout(() => marker.openPopup(), 100);
      }
    });

    // 3. Connect Waypoints with Tactical Polyline Route
    const wpCoordinates: [number, number][] = waypoints.map((w) => [
      w.coordinates.lat,
      w.coordinates.lng,
    ]);

    if (waypointPolylineRef.current) {
      waypointPolylineRef.current.setLatLngs(wpCoordinates);
    } else if (wpCoordinates.length > 0) {
      const poly = L.polyline(wpCoordinates, {
        color: '#f59e0b',
        weight: 2.5,
        opacity: 0.85,
        dashArray: '6, 6',
      }).addTo(map);
      waypointPolylineRef.current = poly;
    }
  }, [waypoints, selectedWaypointId, setSelectedWaypointId]);

  const handleLocateUser = async (deployNearby = false) => {
    setIsTracking(false);
    const loc = await requestUserLocation(deployNearby);
    if (loc && mapInstanceRef.current) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 15, { animate: true });
      setLocationSuccessToast(true);
      setTimeout(() => setLocationSuccessToast(false), 4000);
    }
  };

  const handleRecenterDrone = () => {
    setIsTracking(true);
    if (mapInstanceRef.current && selectedDrone) {
      mapInstanceRef.current.setView(
        [selectedDrone.coordinates.lat, selectedDrone.coordinates.lng],
        15,
        { animate: true }
      );
    }
    if (onRecenter) onRecenter();
  };

  return (
    <div className="w-full h-full relative bg-zinc-950 flex select-none">
      {/* Map DOM target */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" style={{ height: '100%', width: '100%' }} />

      {/* Target Overlay HUD */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25 z-[300]">
        <div className="w-64 h-64 border border-cyan-500/80 rounded-full flex items-center justify-center">
          <div className="w-0.5 h-4 bg-cyan-400 absolute top-0"></div>
          <div className="w-0.5 h-4 bg-cyan-400 absolute bottom-0"></div>
          <div className="w-4 h-0.5 bg-cyan-400 absolute left-0"></div>
          <div className="w-4 h-0.5 bg-cyan-400 absolute right-0"></div>
          <div className="w-48 h-48 border border-dashed border-cyan-500/40 rounded-full animate-[spin_60s_linear_infinite]"></div>
          <Crosshair className="w-8 h-8 text-cyan-400" />
        </div>
      </div>

      {/* Top Left Status Badge & User GPS info */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 max-w-xs">
        <div className="bg-zinc-950/85 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-mono">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-zinc-300 font-bold">TACTICAL RADAR</span>
          <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
            FREE / OPEN SOURCE
          </span>
        </div>

        {/* User GPS Status Pill */}
        {userLocation && (
          <div className="bg-zinc-950/90 backdrop-blur-md border border-blue-500/40 px-3 py-1.5 rounded-lg shadow-xl flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-300">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold">
              <MapPin className="w-3.5 h-3.5 animate-bounce" />
              <span>MY GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</span>
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

        {/* GPS Error Message */}
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

      {/* Center Top Waypoint Placement Active Banner */}
      {isPlacingWaypoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-amber-950/90 backdrop-blur-md border border-amber-500/60 px-4 py-2 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.35)] flex items-center gap-3 font-mono text-xs text-amber-200 animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <div>
            <span className="font-bold">WAYPOINT PLACEMENT ACTIVE:</span> Click anywhere on map to add <span className="underline font-bold">WP-{String(waypoints.length + 1).padStart(2, "0")}</span>
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

      {/* Layer Style Selector */}
      <div className="absolute top-4 right-4 z-[400] flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900/85 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-mono font-medium backdrop-blur-md shadow-xl transition-colors"
            title="Switch Map Tiles"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="capitalize">{tileStyle} Layer</span>
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-1.5 w-44 bg-zinc-950/95 border border-zinc-800 rounded-lg p-1.5 shadow-2xl backdrop-blur-xl flex flex-col gap-1 z-50">
              <button
                onClick={() => {
                  setTileStyle('dark');
                  setShowLayerMenu(false);
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                  tileStyle === 'dark'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span>Dark Matter</span>
                <span className="text-[9px] text-zinc-500 font-normal">Tactical</span>
              </button>
              <button
                onClick={() => {
                  setTileStyle('satellite');
                  setShowLayerMenu(false);
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                  tileStyle === 'satellite'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span>Satellite</span>
                <span className="text-[9px] text-zinc-500 font-normal">Esri HD</span>
              </button>
              <button
                onClick={() => {
                  setTileStyle('street');
                  setShowLayerMenu(false);
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                  tileStyle === 'street'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span>OpenStreetMap</span>
                <span className="text-[9px] text-zinc-500 font-normal">Standard</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selected Waypoint On-Map Action Card */}
      {selectedWaypoint && (
        <div className={`absolute bottom-6 left-6 z-[400] w-64 bg-zinc-950/95 p-3 rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col gap-2 font-mono border ${
          selectedWaypoint.isVoiceAlert || selectedWaypoint.name.toLowerCase().includes("survivor") || selectedWaypoint.name.toLowerCase().includes("distress")
            ? "border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            : "border-amber-500/60"
        }`}>
          <div className="flex items-center justify-between gap-1.5 border-b border-zinc-800 pb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`w-5 h-5 rounded-md font-extrabold flex items-center justify-center text-[11px] shrink-0 shadow-sm ${
                selectedWaypoint.isVoiceAlert || selectedWaypoint.name.toLowerCase().includes("survivor")
                  ? "bg-rose-500 text-white"
                  : "bg-amber-400 text-black"
              }`}>
                {selectedWaypoint.isVoiceAlert ? "🚨" : String(selectedWaypoint.index).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-zinc-100 truncate">{selectedWaypoint.name}</div>
                <div className={`text-[9px] font-semibold ${
                  selectedWaypoint.isVoiceAlert ? "text-rose-400" : "text-amber-400"
                }`}>
                  {selectedWaypoint.isVoiceAlert ? "AI VOICE DISTRESS PIN" : selectedWaypoint.action}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedWaypointId(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] text-zinc-400 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span>GPS POS:</span>
              <span className="text-zinc-200 font-semibold">{selectedWaypoint.coordinates.lat.toFixed(5)}°, {selectedWaypoint.coordinates.lng.toFixed(5)}°</span>
            </div>
            {selectedWaypoint.distressTranscript && (
              <div className="text-[9px] bg-rose-950/40 border border-rose-500/30 rounded p-1 text-rose-200 truncate">
                Cry: &ldquo;{selectedWaypoint.distressTranscript}&rdquo;
              </div>
            )}
            <div className="text-[9px] text-emerald-400 font-sans flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Saved on map until manually removed</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            {selectedDrone && (
              <button
                onClick={() => sendDroneToWaypoint(selectedDrone.id, selectedWaypoint.id)}
                className="flex-1 py-1.5 px-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                title={`Fly ${selectedDrone.name} to this waypoint`}
              >
                <Navigation className="w-3 h-3" />
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
              className="py-1.5 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
              title={selectedWaypoint.isVoiceAlert ? "Dismiss and remove this distress alert from map" : "Delete this waypoint"}
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>{selectedWaypoint.isVoiceAlert ? "Dismiss" : "Delete"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tracking and GPS Controls UI */}
      <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-2">
        {!isTracking && (
          <div className="bg-black/85 border border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md mb-1 shadow-lg mx-auto">
            <MousePointerClick className="w-3 h-3 text-cyan-400" />
            <span>Manual Pan Active</span>
          </div>
        )}

        {/* Tactical Waypoint Placement Toggle */}
        <button
          onClick={() => setIsPlacingWaypoint(!isPlacingWaypoint)}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xl backdrop-blur-md border ${
            isPlacingWaypoint
              ? 'bg-amber-500/30 text-amber-300 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
              : 'bg-zinc-900/85 text-amber-300 border-amber-500/40 hover:bg-amber-950/40 hover:border-amber-400'
          }`}
        >
          <Route className={`w-4 h-4 text-amber-400 ${isPlacingWaypoint ? 'animate-bounce' : ''}`} />
          <span>{isPlacingWaypoint ? 'CANCEL WAYPOINT MODE' : '+ PLACE WAYPOINT'}</span>
        </button>

        {/* GPS Locate Me Button */}
        <button
          onClick={() => handleLocateUser(false)}
          disabled={isLocatingUser}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xl backdrop-blur-md border bg-blue-600/30 text-blue-300 border-blue-500/50 hover:bg-blue-600/40 hover:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
        >
          {isLocatingUser ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>ACQUIRING GPS FIX...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>{userLocation ? 'RE-CENTER ON MY LOCATION' : 'GET MY CURRENT LOCATION'}</span>
            </>
          )}
        </button>

        {/* Drone Lock Button */}
        <button
          onClick={handleRecenterDrone}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xl backdrop-blur-md border ${
            isTracking
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'bg-zinc-900/85 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
          }`}
        >
          <LocateFixed className={`w-4 h-4 ${isTracking ? 'animate-pulse' : ''}`} />
          {isTracking ? 'AUTO-TRACKING: ACTIVE' : 'LOCK ON DRONE'}
        </button>
      </div>
    </div>
  );
}
