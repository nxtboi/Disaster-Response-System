import React, { useState, useMemo } from "react";
import { useDRS } from "../store";
import { Drone, ConnectionStatus } from "../types";
import {
  LayoutGrid,
  List,
  Search,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Navigation,
  Activity,
  Radio,
  Video,
  ArrowUpDown,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Shield,
  Layers,
  Cpu,
  RefreshCw,
  Zap,
  LogOut,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExploreSystemPageProps {
  onLaunchCommandCenter?: () => void;
  onBackToHome?: () => void;
  onSelectDroneAndMonitor?: (droneId: string) => void;
  onLogout?: () => void;
  userRole?: "admin" | "operator";
}

export function ExploreSystemPage({
  onLaunchCommandCenter,
  onBackToHome,
  onSelectDroneAndMonitor,
  onLogout,
  userRole = "operator",
}: ExploreSystemPageProps) {
  const { drones, selectedDroneId, setSelectedDroneId, setActiveView, updateDroneTelemetry } = useDRS();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [flightModeFilter, setFlightModeFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [sortField, setSortField] = useState<keyof Drone | "altitude" | "speed" | "battery">("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedDroneForModal, setSelectedDroneForModal] = useState<Drone | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fleet aggregate metrics
  const totalDrones = drones.length;
  const onlineDrones = drones.filter((d) => d.status === "Online").length;
  const standbyDrones = drones.filter((d) => d.status === "Standby").length;
  const chargingDrones = drones.filter((d) => d.status === "Charging").length;
  const avgBattery = Math.round(drones.reduce((acc, d) => acc + d.battery, 0) / (totalDrones || 1));
  const activeMissions = drones.filter((d) => d.missionActive).length;
  const totalAlertsCount = drones.reduce((acc, d) => acc + d.alerts.length, 0);

  // Filter and sort drones
  const filteredDrones = useMemo(() => {
    return drones
      .filter((drone) => {
        const matchesSearch =
          drone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          drone.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          drone.flightMode.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === "ALL" || drone.status.toUpperCase() === statusFilter.toUpperCase();

        const matchesFlightMode =
          flightModeFilter === "ALL" || drone.flightMode.toUpperCase() === flightModeFilter.toUpperCase();

        return matchesSearch && matchesStatus && matchesFlightMode;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof Drone];
        let valB: any = b[sortField as keyof Drone];

        if (sortField === "altitude") {
          valA = a.telemetry.altitude;
          valB = b.telemetry.altitude;
        } else if (sortField === "speed") {
          valA = a.telemetry.speed;
          valB = b.telemetry.speed;
        }

        if (typeof valA === "string") {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
  }, [drones, searchQuery, statusFilter, flightModeFilter, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleQuickCommand = (drone: Drone, mode: Drone["flightMode"]) => {
    updateDroneTelemetry(drone.id, {
      flightMode: mode,
      status: mode === "Hover" ? "Standby" : "Online",
    });
    setActionSuccessMsg(`Command [${mode.toUpperCase()}] broadcasted to ${drone.id}`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleOpenLiveMonitoring = (droneId: string) => {
    setSelectedDroneId(droneId);
    if (onSelectDroneAndMonitor) {
      onSelectDroneAndMonitor(droneId);
    } else if (onLaunchCommandCenter) {
      setActiveView("Live Monitoring");
      onLaunchCommandCenter();
    }
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case "Online":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            ONLINE
          </span>
        );
      case "Standby":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            STANDBY
          </span>
        );
      case "Charging":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-950/80 text-amber-400 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            CHARGING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-zinc-900 text-zinc-400 border border-zinc-700">
            OFFLINE
          </span>
        );
    }
  };

  const getBatteryIndicator = (battery: number, status: ConnectionStatus) => {
    const isCharging = status === "Charging";
    const isLow = battery < 20;

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCharging
                ? "bg-amber-400 animate-pulse"
                : isLow
                ? "bg-rose-500"
                : battery < 50
                ? "bg-amber-400"
                : "bg-emerald-400"
            }`}
            style={{ width: `${battery}%` }}
          />
        </div>
        <span
          className={`font-mono text-xs font-bold ${
            isLow ? "text-rose-400" : isCharging ? "text-amber-400" : "text-zinc-200"
          }`}
        >
          {battery}%
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col selection:bg-cyan-500/30">
      {/* Top Standalone Navigation Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/90 px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Brand + Back Button */}
        <div className="flex items-center gap-4">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white text-xs font-mono transition-all"
              title="Return to Home Landing"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>HOME</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Compass className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-widest text-base text-white">DRS EXPLORE</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                  FLEET REGISTRY
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 hidden sm:block">
                Autonomous Drone Response & Multi-Spectral Sensor Directory
              </p>
            </div>
          </div>
        </div>

        {/* Right: Command Center Action Button + Logout */}
        <div className="flex items-center gap-3">
          {onLogout && (
            <button
              id="explore-logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-mono transition-all group"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>LOG OUT</span>
            </button>
          )}

          {onLaunchCommandCenter && (
            <button
              onClick={onLaunchCommandCenter}
              className="group relative px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>LAUNCH COMMAND CENTER</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Page Title & Intro */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-mono tracking-widest uppercase font-bold">
                Collective UAV Database
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Explore System & Fleet Data
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Comprehensive registry of active drones, flight mode telemetry, radiometric payload statuses, and direct mission control.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800 self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>REAL-TIME TELEMETRY SYNCED</span>
          </div>
        </div>

        {/* Action Toast Alert */}
        {actionSuccessMsg && (
          <div className="bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Fleet Summary Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Fleet</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-white">{totalDrones}</span>
              <span className="text-xs text-zinc-400">UAVs</span>
            </div>
            <span className="text-[10px] text-cyan-400 mt-1">100% Configured</span>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Active In-Flight</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-emerald-400">{onlineDrones}</span>
              <span className="text-xs text-zinc-400">Live</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-1">
              {Math.round((onlineDrones / totalDrones) * 100)}% Airborne
            </span>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Standby / Pad</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-cyan-400">{standbyDrones}</span>
              <span className="text-xs text-zinc-400">Ready</span>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1">Instant Deploy</span>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Hangar Charging</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-amber-400">{chargingDrones}</span>
              <span className="text-xs text-zinc-400">Docks</span>
            </div>
            <span className="text-[10px] text-amber-400/90 mt-1">Fast DC Charge</span>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Mean Fleet Battery</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-white">{avgBattery}%</span>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1">LiPo 6S Telemetry</span>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Alerts</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  totalAlertsCount > 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {totalAlertsCount}
              </span>
              <span className="text-xs text-zinc-400">Notifs</span>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1">
              {totalAlertsCount > 0 ? "Check Diagnostics" : "All Nominal"}
            </span>
          </div>
        </div>

        {/* Control Bar: Search, Filters, View Toggles */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 backdrop-blur-md">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID (DRN-01), Callsign, or Mode..."
              className="w-full bg-zinc-950 border border-zinc-750 focus:border-cyan-500/70 text-zinc-200 text-xs rounded-lg pl-9 pr-4 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder:text-zinc-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-zinc-500 text-[11px] hidden sm:inline">STATUS:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-750 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Statuses ({totalDrones})</option>
                <option value="ONLINE">Online ({onlineDrones})</option>
                <option value="STANDBY">Standby ({standbyDrones})</option>
                <option value="CHARGING">Charging ({chargingDrones})</option>
              </select>
            </div>

            {/* Flight Mode Filter */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-zinc-500 text-[11px] hidden sm:inline">MODE:</span>
              <select
                value={flightModeFilter}
                onChange={(e) => setFlightModeFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-750 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Flight Modes</option>
                <option value="AUTONOMOUS">Autonomous</option>
                <option value="MANUAL">Manual</option>
                <option value="HOVER">Hover</option>
                <option value="RETURN TO HOME">Return to Home</option>
              </select>
            </div>

            {/* View Switcher: Table vs Cards */}
            <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg p-0.5 ml-auto md:ml-0">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-cyan-500/20 text-cyan-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "cards"
                    ? "bg-cyan-500/20 text-cyan-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Tactical Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Collective Data Presentation */}
        {viewMode === "table" ? (
          /* Dense Collective Table View */
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-950/90 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-cyan-400"
                      onClick={() => handleSort("id")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Drone ID / Callsign</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-cyan-400"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Status</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-cyan-400"
                      onClick={() => handleSort("battery")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Battery</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-cyan-400"
                      onClick={() => handleSort("flightMode")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Flight Mode</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-cyan-400"
                      onClick={() => handleSort("altitude")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Altitude / Speed</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Coordinates (Lat / Lng)</th>
                    <th className="py-3 px-4">Payload Sensors</th>
                    <th className="py-3 px-4">GPS / Link</th>
                    <th className="py-3 px-4 text-right">Direct Commands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredDrones.map((drone) => {
                    const isSelected = selectedDroneId === drone.id;
                    return (
                      <tr
                        key={drone.id}
                        className={`hover:bg-zinc-850/60 transition-colors ${
                          isSelected ? "bg-cyan-950/25 border-l-2 border-l-cyan-400" : ""
                        }`}
                      >
                        {/* ID & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                            <div>
                              <div className="font-bold text-white tracking-wide">{drone.name}</div>
                              <div className="text-[10px] text-cyan-400 font-mono">{drone.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Connection Status */}
                        <td className="py-3.5 px-4">{getStatusBadge(drone.status)}</td>

                        {/* Battery */}
                        <td className="py-3.5 px-4">
                          {getBatteryIndicator(drone.battery, drone.status)}
                        </td>

                        {/* Flight Mode */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-1 bg-zinc-800/80 rounded border border-zinc-700 text-zinc-200 text-[11px] font-semibold">
                            {drone.flightMode}
                          </span>
                        </td>

                        {/* Altitude & Speed */}
                        <td className="py-3.5 px-4">
                          <div className="text-zinc-200 font-semibold">
                            {drone.telemetry.altitude} m
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {drone.telemetry.speed.toFixed(1)} km/h • HDG {drone.telemetry.heading}°
                          </div>
                        </td>

                        {/* Coordinates */}
                        <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                          <div>{drone.coordinates.lat.toFixed(5)}° N</div>
                          <div>{drone.coordinates.lng.toFixed(5)}° E</div>
                        </td>

                        {/* Sensors */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                drone.cameraStatus === "Active"
                                  ? "bg-emerald-950/70 text-emerald-400 border-emerald-500/30"
                                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
                              }`}
                            >
                              RGB 4K
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                drone.lidarStatus === "Active"
                                  ? "bg-cyan-950/70 text-cyan-400 border-cyan-500/30"
                                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
                              }`}
                            >
                              LiDAR
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-amber-950/70 text-amber-400 border-amber-500/30">
                              FLIR IR
                            </span>
                          </div>
                        </td>

                        {/* GPS */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Navigation
                              className={`w-3.5 h-3.5 ${
                                drone.gpsStatus === "Connected"
                                  ? "text-emerald-400"
                                  : drone.gpsStatus === "Weak"
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}
                            />
                            <span className="text-zinc-300 font-semibold">{drone.gpsStatus}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {drone.telemetry.satelliteCount} Sats Locked
                          </div>
                        </td>

                        {/* Direct Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenLiveMonitoring(drone.id)}
                              className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-[11px] font-bold transition-colors"
                              title="Open live camera & multi-sensor panel"
                            >
                              MONITOR
                            </button>
                            <button
                              onClick={() =>
                                handleQuickCommand(
                                  drone,
                                  drone.flightMode === "Autonomous" ? "Hover" : "Autonomous"
                                )
                              }
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-[11px] transition-colors"
                              title="Toggle Autonomous / Hover"
                            >
                              {drone.flightMode === "Autonomous" ? "HOVER" : "AUTO"}
                            </button>
                            <button
                              onClick={() => handleQuickCommand(drone, "Return to Home")}
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] transition-colors"
                              title="Execute Return to Home (RTH)"
                            >
                              RTH
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Tactical Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredDrones.map((drone) => {
              const isSelected = selectedDroneId === drone.id;
              return (
                <div
                  key={drone.id}
                  className={`bg-zinc-900/80 border rounded-xl p-5 flex flex-col justify-between transition-all hover:border-cyan-500/50 shadow-xl ${
                    isSelected ? "border-cyan-500/70 ring-1 ring-cyan-500/30" : "border-zinc-800"
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          {drone.id}
                        </span>
                        <h3 className="text-base font-bold text-white tracking-wide">
                          {drone.name}
                        </h3>
                      </div>
                      {getStatusBadge(drone.status)}
                    </div>

                    {/* Battery & Health */}
                    <div className="mt-4 p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-lg">
                      <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                        <span className="text-zinc-400">Power Level</span>
                        <span className="text-white font-bold">{drone.battery}%</span>
                      </div>
                      {getBatteryIndicator(drone.battery, drone.status)}
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                      <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/60">
                        <span className="text-[10px] text-zinc-500 uppercase">Altitude</span>
                        <div className="font-bold text-zinc-200 text-sm mt-0.5">
                          {drone.telemetry.altitude} m
                        </div>
                      </div>
                      <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/60">
                        <span className="text-[10px] text-zinc-500 uppercase">Air Speed</span>
                        <div className="font-bold text-zinc-200 text-sm mt-0.5">
                          {drone.telemetry.speed.toFixed(1)} km/h
                        </div>
                      </div>
                      <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/60">
                        <span className="text-[10px] text-zinc-500 uppercase">Heading</span>
                        <div className="font-bold text-zinc-200 text-sm mt-0.5">
                          {drone.telemetry.heading}°
                        </div>
                      </div>
                      <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/60">
                        <span className="text-[10px] text-zinc-500 uppercase">Distance</span>
                        <div className="font-bold text-zinc-200 text-sm mt-0.5">
                          {drone.telemetry.distanceFromOperator} km
                        </div>
                      </div>
                    </div>

                    {/* Sensor Badges */}
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-zinc-500 mr-1">PAYLOAD:</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        4K GIMBAL
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                        LIDAR 360
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                        FLIR LWIR
                      </span>
                    </div>

                    {/* Active Alerts if any */}
                    {drone.alerts.length > 0 && (
                      <div className="mt-3 p-2 bg-rose-950/40 border border-rose-500/30 rounded text-[10px] text-rose-300 font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{drone.alerts.join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenLiveMonitoring(drone.id)}
                      className="flex-1 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>VIEW LIVE</span>
                    </button>
                    <button
                      onClick={() => handleQuickCommand(drone, "Return to Home")}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono font-bold transition-colors"
                      title="Return to Home"
                    >
                      RTH
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
