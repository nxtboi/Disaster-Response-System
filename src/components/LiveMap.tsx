import React, { useEffect, useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Polyline, useMap } from '@vis.gl/react-google-maps';
import { useDRS } from '../store';
import { Crosshair, LocateFixed, MousePointerClick, MapPin, Key, Sparkles, ExternalLink, Check, Loader2, PlaneTakeoff, ShieldAlert, Route, X, Navigation, Trash2 } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { FreeTacticalMap } from './FreeTacticalMap';

// Initial API Key from build environment
const ENV_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function MapController({
  center,
  target,
}: {
  center: { lat: number; lng: number } | null;
  target: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (map && target) {
      map.panTo({ lat: target.lat, lng: target.lng });
      if (target.zoom) {
        map.setZoom(target.zoom);
      }
    } else if (map && center) {
      map.panTo(center);
    }
  }, [target, center, map]);

  return null;
}

export function LiveMap() {
  const {
    selectedDrone,
    drones,
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

  const [runtimeApiKey, setRuntimeApiKey] = useState<string>(() => {
    return localStorage.getItem('drs_gmaps_key') || ENV_API_KEY;
  });

  const effectiveKey = runtimeApiKey.trim();

  // Engine mode: 'tactical' (Free OpenStreetMap / CartoDB Dark) or 'google' (Google Maps Platform)
  const [engineMode, setEngineMode] = useState<'tactical' | 'google'>(() => {
    return effectiveKey ? 'google' : 'tactical';
  });

  const [isTracking, setIsTracking] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState(effectiveKey);
  const [keySavedToast, setKeySavedToast] = useState(false);
  const [locationSuccessToast, setLocationSuccessToast] = useState(false);
  const [waypointPlacedToast, setWaypointPlacedToast] = useState<string | null>(null);

  const selectedWaypoint = waypoints.find((w) => w.id === selectedWaypointId);

  const centerLat = userLocation
    ? userLocation.lat
    : selectedDrone
    ? selectedDrone.coordinates.lat
    : 28.4595;
  const centerLng = userLocation
    ? userLocation.lng
    : selectedDrone
    ? selectedDrone.coordinates.lng
    : 77.0266;

  const center = useMemo(() => ({ lat: centerLat, lng: centerLng }), [centerLat, centerLng]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = keyInput.trim();
    setRuntimeApiKey(cleanKey);
    localStorage.setItem('drs_gmaps_key', cleanKey);
    if (cleanKey) {
      setEngineMode('google');
    }
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
    setShowKeyModal(false);
  };

  const handleClearKey = () => {
    setKeyInput('');
    setRuntimeApiKey('');
    localStorage.removeItem('drs_gmaps_key');
    setEngineMode('tactical');
  };

  const handleLocateUser = async (deployNearby = false) => {
    setIsTracking(false);
    const loc = await requestUserLocation(deployNearby);
    if (loc) {
      setLocationSuccessToast(true);
      setTimeout(() => setLocationSuccessToast(false), 4000);
    }
  };

  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;

      // Check if clicked near an existing waypoint (within ~40m / ~0.00045 deg)
      const nearbyWaypoint = waypoints.find((wp) => {
        const dLat = Math.abs(wp.coordinates.lat - lat);
        const dLng = Math.abs(wp.coordinates.lng - lng);
        return dLat < 0.00045 && dLng < 0.00045;
      });

      if (nearbyWaypoint) {
        removeWaypoint(nearbyWaypoint.id);
        setSelectedWaypointId(null);
        setWaypointPlacedToast(`Deleted Waypoint: ${nearbyWaypoint.name}`);
        setTimeout(() => {
          setWaypointPlacedToast(null);
        }, 3000);
      } else {
        const newWp = addWaypoint({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
        });
        setSelectedWaypointId(newWp.id);
        setWaypointPlacedToast(`Placed ${newWp.name} (Click on it again to delete)`);
        setTimeout(() => {
          setWaypointPlacedToast(null);
        }, 3500);
      }
    }
  };

  // If tactical mode is selected, or if Google Maps key is empty, render the Free Tactical Map
  if (engineMode === 'tactical' || !effectiveKey) {
    return (
      <div className="w-full h-full relative flex flex-col">
        {/* Top Control Bar with Engine Switcher */}
        <div className="absolute top-4 right-44 z-[400] flex items-center gap-2">
          <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800 p-1 rounded-lg shadow-xl flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setEngineMode('tactical')}
              className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
            >
              Free Tactical Radar
            </button>
            <button
              onClick={() => {
                if (!effectiveKey) {
                  setShowKeyModal(true);
                } else {
                  setEngineMode('google');
                }
              }}
              className="px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              <Key className="w-3 h-3 text-amber-400" />
              <span>Google Maps</span>
            </button>
          </div>

          <button
            onClick={() => setShowKeyModal(true)}
            className="p-2 rounded-lg bg-zinc-900/85 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 backdrop-blur-md shadow-xl transition-colors"
            title="Configure Map Keys & Free Demo Key"
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>

        {/* Free Tactical OpenStreetMap / Carto Dark Engine */}
        <FreeTacticalMap />

        {/* Key Settings Modal */}
        {showKeyModal && renderKeyModal()}
      </div>
    );
  }

  // Google Maps Engine Mode
  return (
    <div className="w-full h-full relative bg-zinc-950 flex select-none">
      {/* Top Control Bar with Engine Switcher */}
      <div className="absolute top-4 right-4 z-[400] flex items-center gap-2">
        <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800 p-1 rounded-lg shadow-xl flex items-center gap-1 font-mono text-xs">
          <button
            onClick={() => setEngineMode('tactical')}
            className="px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Free Tactical Radar
          </button>
          <button
            onClick={() => setEngineMode('google')}
            className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Google Maps Live</span>
          </button>
        </div>

        <button
          onClick={() => setShowKeyModal(true)}
          className="p-2 rounded-lg bg-zinc-900/85 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 backdrop-blur-md shadow-xl transition-colors"
          title="Map API Key Settings"
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </div>

      {/* Top Left Status Badge & User GPS info */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 max-w-xs">
        <div className="bg-zinc-950/85 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-mono">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-zinc-300 font-bold">GOOGLE MAPS PLATFORM</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
            ACTIVE
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
          <div className="bg-emerald-950/90 border border-emerald-500/50 px-3 py-1.5 rounded-lg text-emerald-200 text-xs font-mono shadow-xl flex items-center gap-1.5">
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

      {/* Waypoint Placement Mode Banner */}
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

      <ErrorBoundary>
        <APIProvider apiKey={effectiveKey}>
          <Map
            defaultZoom={14}
            defaultCenter={center}
            gestureHandling="greedy"
            disableDefaultUI={true}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full flex-1"
            style={{ width: '100%', height: '100%' }}
            onClick={handleMapClick}
            onDragstart={() => setIsTracking(false)}
            onDrag={() => setIsTracking(false)}
          >
            <MapController center={isTracking ? center : null} target={centerMapTarget} />

            {/* Tactical Waypoint Markers */}
            {waypoints.map((wp) => {
              const isSelected = selectedWaypointId === wp.id;
              const isSurvivorDistress = wp.name.toLowerCase().includes('survivor') || wp.name.toLowerCase().includes('help') || wp.name.toLowerCase().includes('distress');
              return (
                <AdvancedMarker
                  key={wp.id}
                  position={{ lat: wp.coordinates.lat, lng: wp.coordinates.lng }}
                  zIndex={isSurvivorDistress ? 1500 : isSelected ? 1100 : 900}
                  onClick={() => {
                    setSelectedWaypointId(wp.id);
                    setWaypointPlacedToast(`Selected ${wp.name}`);
                    setTimeout(() => setWaypointPlacedToast(null), 2500);
                  }}
                >
                  {isSurvivorDistress ? (
                    <div className="relative w-14 h-14 flex items-center justify-center cursor-pointer group">
                      <div className="absolute inset-0 bg-rose-500/40 rounded-full animate-ping"></div>
                      <div className="absolute inset-1.5 bg-rose-500/25 rounded-full animate-pulse border-2 border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.8)]"></div>
                      <div className="w-8 h-8 rounded-full bg-rose-600 text-white border-2 border-white flex items-center justify-center shadow-[0_0_22px_rgba(244,63,94,1)] z-10 transition-transform group-hover:scale-125">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" x2="12" y1="19" y2="22"/>
                        </svg>
                      </div>
                      <div className="absolute -bottom-6 whitespace-nowrap px-2 py-0.5 rounded text-[9px] font-mono font-extrabold bg-rose-950 text-rose-200 border border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)] flex items-center gap-1 pointer-events-none">
                        <span>{wp.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-10 h-10 flex items-center justify-center cursor-pointer group">
                      {isSelected && (
                        <div className="absolute inset-0 bg-amber-500/30 rounded-full animate-ping"></div>
                      )}
                      <div
                        className={`w-7 h-7 rounded-lg transform rotate-45 flex items-center justify-center font-mono font-bold text-[10px] shadow-lg transition-transform group-hover:scale-110 ${
                          isSelected
                            ? 'bg-amber-400 text-black border-2 border-white shadow-[0_0_18px_rgba(245,158,11,0.95)]'
                            : 'bg-zinc-950 text-amber-300 border border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                        }`}
                      >
                        <div className="transform -rotate-45 font-mono font-black">
                          {String(wp.index).padStart(2, '0')}
                        </div>
                      </div>
                      <div className="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-950/90 text-amber-300 border border-amber-500/50 shadow-md pointer-events-none">
                        {wp.name}
                      </div>
                    </div>
                  )}
                </AdvancedMarker>
              );
            })}

            {/* Waypoint Route Polyline */}
            {waypoints.length > 1 && (
              <Polyline
                path={waypoints.map((wp) => ({ lat: wp.coordinates.lat, lng: wp.coordinates.lng }))}
                strokeColor="#f59e0b"
                strokeWeight={2.5}
                strokeOpacity={0.85}
              />
            )}

            {/* User Real-Time Location Marker */}
            {userLocation && (
              <AdvancedMarker
                position={{ lat: userLocation.lat, lng: userLocation.lng }}
                zIndex={2000}
              >
                <div className="relative w-12 h-12 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto">
                  <div className="absolute inset-0 bg-blue-500/25 rounded-full animate-ping"></div>
                  <div className="absolute inset-1.5 bg-cyan-400/20 rounded-full animate-pulse border border-cyan-400/60"></div>
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white border-2 border-white shadow-[0_0_18px_rgba(59,130,246,0.9)] flex items-center justify-center z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                  </div>
                  <div className="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/50 shadow-md">
                    YOU (OPERATOR)
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {drones.map((drone) => {
              const isSelected = selectedDrone?.id === drone.id;
              return (
                <React.Fragment key={drone.id}>
                  {/* Drone Advanced Marker */}
                  <AdvancedMarker
                    position={{ lat: drone.coordinates.lat, lng: drone.coordinates.lng }}
                    zIndex={isSelected ? 1000 : 10}
                    onClick={() => setSelectedDroneId(drone.id)}
                  >
                    <div className="relative w-9 h-9 flex items-center justify-center cursor-pointer group">
                      {isSelected && (
                        <>
                          <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping"></div>
                          <div className="absolute -inset-2 bg-cyan-400/10 rounded-full animate-pulse border border-cyan-400/40"></div>
                        </>
                      )}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shadow-lg transition-transform group-hover:scale-110 ${
                          isSelected
                            ? 'bg-cyan-500 text-black border-2 border-white shadow-[0_0_20px_rgba(6,182,212,0.9)]'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-600'
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ transform: `rotate(${drone.telemetry.heading || 0}deg)` }}
                        >
                          <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
                        </svg>
                      </div>
                      <div
                        className={`absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-bold backdrop-blur-sm pointer-events-none ${
                          isSelected
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                            : 'bg-black/70 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {drone.name}
                      </div>
                    </div>
                  </AdvancedMarker>

                  {/* Flight Path Polyline */}
                  {drone.path.length > 0 && (
                    <Polyline
                      path={drone.path.map((p) => ({ lat: p.lat, lng: p.lng }))}
                      strokeColor={isSelected ? '#06b6d4' : '#3f3f46'}
                      strokeWeight={isSelected ? 3 : 1.5}
                      strokeOpacity={isSelected ? 0.85 : 0.4}
                    />
                  )}

                  {/* Home Position Marker */}
                  <AdvancedMarker
                    position={{ lat: drone.homeCoordinates.lat, lng: drone.homeCoordinates.lng }}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-zinc-950 border border-emerald-500/80 text-emerald-400 flex items-center justify-center font-mono font-bold text-[9px] shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      title={`${drone.name} Base Station`}
                    >
                      H
                    </div>
                  </AdvancedMarker>
                </React.Fragment>
              );
            })}
          </Map>
        </APIProvider>
      </ErrorBoundary>

      {/* Target Overlay HUD */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25 z-[300]">
        <div className="w-64 h-64 border border-cyan-500 rounded-full flex items-center justify-center">
          <div className="w-0.5 h-4 bg-cyan-500 absolute top-0"></div>
          <div className="w-0.5 h-4 bg-cyan-500 absolute bottom-0"></div>
          <div className="w-4 h-0.5 bg-cyan-500 absolute left-0"></div>
          <div className="w-4 h-0.5 bg-cyan-500 absolute right-0"></div>
          <Crosshair className="w-8 h-8 text-cyan-500" />
        </div>
      </div>

      {/* Selected Waypoint On-Map Action Card */}
      {selectedWaypoint && (
        <div className="absolute bottom-6 left-6 z-[400] w-60 bg-zinc-950/95 border border-amber-500/60 p-2.5 rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col gap-2 font-mono">
          <div className="flex items-center justify-between gap-1.5 border-b border-zinc-800 pb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-amber-400 text-black font-extrabold flex items-center justify-center text-[11px] shrink-0 shadow-sm">
                {String(selectedWaypoint.index).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-zinc-100 truncate">{selectedWaypoint.name}</div>
                <div className="text-[9px] text-amber-400">{selectedWaypoint.action}</div>
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

          <div className="text-[10px] text-zinc-400 flex items-center justify-between">
            <span>POS:</span>
            <span className="text-zinc-200">{selectedWaypoint.coordinates.lat.toFixed(4)}°, {selectedWaypoint.coordinates.lng.toFixed(4)}°</span>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            {selectedDrone && (
              <button
                onClick={() => sendDroneToWaypoint(selectedDrone.id, selectedWaypoint.id)}
                className="flex-1 py-1 px-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                title={`Fly ${selectedDrone.name} to this waypoint`}
              >
                <Navigation className="w-3 h-3" />
                <span>Fly</span>
              </button>
            )}
            <button
              onClick={() => {
                removeWaypoint(selectedWaypoint.id);
                setSelectedWaypointId(null);
                setWaypointPlacedToast(`Deleted ${selectedWaypoint.name}`);
                setTimeout(() => setWaypointPlacedToast(null), 3000);
              }}
              className="py-1 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
              title="Delete this waypoint"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Tracking Control UI */}
      <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-2">
        {!isTracking && (
          <div className="bg-black/85 border border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md mb-1 shadow-lg mx-auto">
            <MousePointerClick className="w-3 h-3 text-cyan-400" />
            <span>Manual Override Active</span>
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

        <button
          onClick={() => {
            setIsTracking(!isTracking);
          }}
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

      {/* Key Settings Modal */}
      {showKeyModal && renderKeyModal()}
    </div>
  );

  function renderKeyModal() {
    return (
      <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative font-sans text-zinc-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-100 tracking-wide">Map Engine & API Keys</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Configure Free Tactical Radar or Google Maps Platform</p>
              </div>
            </div>
            <button
              onClick={() => setShowKeyModal(false)}
              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center text-xs transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Free Mode Info Box */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-300 mb-0.5">Free Tactical Radar Mode (Default)</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Operates 100% free with zero API key, billing account, or credit card required. Includes live drone tracking, dark tactical tiles, satellite imagery, and waypoint controls.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEngineMode('tactical');
                    setShowKeyModal(false);
                  }}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/40 transition-colors"
                >
                  Use Free Tactical Radar Now
                </button>
              </div>
            </div>

            {/* Google Maps Demo Key Guide */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>Google Maps Platform (Free Demo Key)</span>
                </h4>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed mb-3">
                You can mint a <strong>Maps Demo Key</strong> in seconds with any Google account (no credit card or billing project requested).
              </p>

              <form onSubmit={handleSaveKey} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Google Maps API Key / Demo Key:
                  </label>
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Paste AIzaSy... demo key here"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {effectiveKey ? (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="text-[11px] text-rose-400 hover:underline font-mono"
                    >
                      Remove Key
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Key</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
