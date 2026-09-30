import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Download,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  RefreshCw,
  X,
  Radio,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import {
  downloadSectorTiles,
  getCacheStats,
  clearOfflineTileCache,
  OfflineCacheStats,
  OFFLINE_TACTICAL_DIRECTORY,
  OfflineLocation,
} from '../lib/offlineMapManager';
import { OfflineTheme } from '../lib/offlineTileLayer';

interface OfflineMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  centerLat: number;
  centerLng: number;
  currentZoom: number;
  isForcedOffline: boolean;
  onToggleForcedOffline: (val: boolean) => void;
  offlineTheme: OfflineTheme;
  onChangeOfflineTheme: (theme: OfflineTheme) => void;
  onJumpToLocation: (lat: number, lng: number, zoom?: number) => void;
  onActivateOfflineLayer: () => void;
}

export function OfflineMapModal({
  isOpen,
  onClose,
  centerLat,
  centerLng,
  currentZoom,
  isForcedOffline,
  onToggleForcedOffline,
  offlineTheme,
  onChangeOfflineTheme,
  onJumpToLocation,
  onActivateOfflineLayer,
}: OfflineMapModalProps) {
  const [stats, setStats] = useState<OfflineCacheStats>({ tileCount: 0, estimatedSizeMB: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; msg: string }>({
    current: 0,
    total: 0,
    msg: '',
  });
  const [downloadRadius, setDownloadRadius] = useState<number>(5);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cache' | 'vector' | 'directory'>('cache');
  const [directorySearch, setDirectorySearch] = useState('');

  const refreshStats = async () => {
    const s = await getCacheStats();
    setStats(s);
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleStartDownload = async () => {
    setIsDownloading(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Zoom levels 13 to 15 provide crisp street and sector coverage without excessive data
      const zoomLevels = [13, 14, 15];
      const result = await downloadSectorTiles({
        centerLat,
        centerLng,
        radiusKm: downloadRadius,
        zoomLevels,
        onProgress: (current, total, msg) => {
          setDownloadProgress({ current, total, msg });
        },
        signal: controller.signal,
      });

      await refreshStats();
      if (result.success) {
        showToast(`Successfully cached ${result.downloaded} offline map tiles!`);
      } else {
        showToast('Download interrupted.');
      }
    } catch (err: any) {
      showToast(`Error caching tiles: ${err.message || err}`);
    } finally {
      setIsDownloading(false);
      setAbortController(null);
    }
  };

  const handleCancelDownload = () => {
    if (abortController) {
      abortController.abort();
      setIsDownloading(false);
      setAbortController(null);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Clear all cached offline map tiles from browser storage?')) {
      const ok = await clearOfflineTileCache();
      if (ok) {
        await refreshStats();
        showToast('Offline map tile cache cleared.');
      }
    }
  };

  const filteredDirectory = OFFLINE_TACTICAL_DIRECTORY.filter((item) => {
    if (!directorySearch.trim()) return true;
    const q = directorySearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.country.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="bg-zinc-950 border border-cyan-500/40 w-full max-w-2xl rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-cyan-950/40 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-zinc-100 uppercase tracking-wider">
                  Free Offline Tactical Map
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                  Zero Network Required
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                100% offline vector GIS, MGRS grid, and high-speed local tile caching
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert & Quick Action Bar */}
        <div className="p-3 bg-zinc-900/60 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isForcedOffline
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className="text-zinc-300">Operational Mode:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                isForcedOffline
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {isForcedOffline ? '⚡ FORCED OFFLINE (SIMULATED BLACKOUT)' : '🟢 LIVE ONLINE (AUTO-CACHING)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleForcedOffline(!isForcedOffline)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                isForcedOffline
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
              }`}
              title="Toggle network disconnection simulation to test offline map behavior"
            >
              {isForcedOffline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isForcedOffline ? 'Restore Online Mode' : 'Simulate Offline Blackout'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('cache')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'cache'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sector Tile Caching</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 rounded-full text-zinc-300">
              {stats.tileCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('vector')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'vector'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Offline Tactical Vector Grid</span>
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Offline Location Directory ({OFFLINE_TACTICAL_DIRECTORY.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4 text-xs">
          {/* TAB 1: Sector Tile Caching */}
          {activeTab === 'cache' && (
            <div className="flex flex-col gap-4">
              {/* Storage Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col">
                  <span className="text-zinc-400 text-[11px]">Cached Map Tiles</span>
                  <span className="text-xl font-bold text-cyan-400 mt-1">{stats.tileCount.toLocaleString()}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Stored in browser CacheStorage</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col">
                  <span className="text-zinc-400 text-[11px]">Local Disk Footprint</span>
                  <span className="text-xl font-bold text-emerald-400 mt-1">{stats.estimatedSizeMB} MB</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Zero cellular data when offline</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-zinc-400 text-[11px]">Cache Status</span>
                  <span className="text-sm font-semibold text-zinc-200 mt-1">
                    {stats.tileCount > 0 ? 'Ready for Disconnected Use' : 'No Tiles Cached Yet'}
                  </span>
                  {stats.tileCount > 0 && (
                    <button
                      onClick={handleClearCache}
                      className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1 hover:underline"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Cache</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cache Current Operational Sector Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-cyan-950/20 border border-cyan-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-zinc-100 text-sm">Download Current Operational Sector</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Center: {centerLat.toFixed(4)}°, {centerLng.toFixed(4)}°
                  </span>
                </div>

                <p className="text-zinc-400 text-xs">
                  Pre-download raster tiles for this area so high-resolution streets, landmarks, and terrain stay available even during a complete telecommunications outage.
                </p>

                {/* Radius Selector */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-zinc-300 font-semibold">Sector Radius:</span>
                  {[2, 5, 10, 20].map((km) => (
                    <button
                      key={km}
                      onClick={() => setDownloadRadius(km)}
                      disabled={isDownloading}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                        downloadRadius === km
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-md'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                  <span className="text-[10px] text-zinc-500 ml-auto">Levels: Z13–Z15</span>
                </div>

                {/* Download Progress Bar */}
                {isDownloading && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-950 border border-cyan-500/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cyan-300 flex items-center gap-1.5 font-bold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Caching Tiles...</span>
                      </span>
                      <span className="text-zinc-400">
                        {downloadProgress.current} / {downloadProgress.total} (
                        {downloadProgress.total > 0
                          ? Math.round((downloadProgress.current / downloadProgress.total) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-200"
                        style={{
                          width: `${
                            downloadProgress.total > 0
                              ? (downloadProgress.current / downloadProgress.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">{downloadProgress.msg}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {!isDownloading ? (
                    <button
                      onClick={handleStartDownload}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {downloadRadius}km Area for Offline</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCancelDownload}
                      className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel Download</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onActivateOfflineLayer();
                      onClose();
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl border border-zinc-700 transition-all ml-auto flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Offline Map Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Offline Tactical Vector Grid */}
          {activeTab === 'vector' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>100% Standalone Vector GIS Engine</span>
                </div>
                <p className="text-zinc-400 text-xs">
                  This procedural canvas engine renders tactical topographic maps locally in browser memory. Even if you have downloaded 0MB of tiles and have no internet, your map will never show blank grey tiles.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col gap-1">
                    <span className="text-cyan-400 font-bold">MGRS Tactical Grid</span>
                    <span className="text-zinc-400 text-[11px]">
                      Sub-kilometer precision coordinate grid lines and tile corner crosshairs.
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col gap-1">
                    <span className="text-emerald-400 font-bold">Topographic Contours</span>
                    <span className="text-zinc-400 text-[11px]">
                      Mathematical multi-octave elevation isolines with labeled metric elevations.
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col gap-1">
                    <span className="text-amber-400 font-bold">Global Coastlines</span>
                    <span className="text-zinc-400 text-[11px]">
                      Built-in landmass boundaries separating oceans from continents worldwide.
                    </span>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="pt-2 flex flex-col gap-2">
                  <span className="text-zinc-300 font-semibold">Select Offline Visual Palette:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => onChangeOfflineTheme('tactical-dark')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        offlineTheme === 'tactical-dark'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                        <span className="font-bold text-zinc-100">Tactical Dark Radar</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        Deep navy/black radar background with cyan graduation marks.
                      </span>
                    </button>

                    <button
                      onClick={() => onChangeOfflineTheme('tactical-topo')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        offlineTheme === 'tactical-topo'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <span className="font-bold text-zinc-100">Paper Topographic</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        Field map styling with amber contour lines and slate relief.
                      </span>
                    </button>

                    <button
                      onClick={() => onChangeOfflineTheme('emergency-amber')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        offlineTheme === 'emergency-amber'
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                        <span className="font-bold text-zinc-100">Disaster Amber</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        High-contrast emergency rescue palette for direct sunlight visibility.
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onActivateOfflineLayer();
                      onClose();
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 text-xs"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Apply 100% Offline Tactical Grid Layer</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Offline Location Directory */}
          {activeTab === 'directory' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Filter offline disaster sectors, mountain passes, cities..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400"
                />
                <span className="text-zinc-500 text-[11px] whitespace-nowrap">
                  {filteredDirectory.length} locations
                </span>
              </div>

              <div className="overflow-y-auto max-h-72 flex flex-col gap-2 custom-scrollbar pr-1">
                {filteredDirectory.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3 bg-zinc-900/70 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200 group-hover:text-cyan-300 transition-colors truncate">
                          {loc.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-cyan-400 border border-zinc-700 shrink-0">
                          {loc.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">{loc.description}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {loc.country} • Lat: {loc.lat.toFixed(4)}°, Lng: {loc.lng.toFixed(4)}° • Elev: {loc.elevationMeters}m
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onJumpToLocation(loc.lat, loc.lng, 14);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Fly Here</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Toast Notification */}
        {toastMsg && (
          <div className="px-4 py-2 bg-cyan-950/90 border-t border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
