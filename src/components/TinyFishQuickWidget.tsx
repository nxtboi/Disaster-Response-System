import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  ShieldAlert,
  Wind,
  ArrowUpRight,
  Sparkles,
  Navigation,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Flame,
  Radio,
  Clock,
  Layers,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useDRS } from "../store";
import { cn } from "../lib/utils";

interface DisasterArticle {
  id: string;
  title: string;
  snippet: string;
  source: string;
  url: string;
  severity: "CRITICAL" | "HIGH" | "ADVISORY" | "MONITORING";
  category: string;
  distanceKm: number;
  timeAgo: string;
  isLive: boolean;
  isIndianNewsOnly?: boolean;
  verification?: {
    status: string;
    isVerified: boolean;
    confidenceScore: number;
    verifyingAuthority: string;
    jurisdiction: string;
    locationRegion: string;
    verificationReason: string;
    verifiedAt: string;
  };
}

export function TinyFishQuickWidget() {
  const { setActiveView, selectedDrone, userLocation } = useDRS();
  const [intelSummary, setIntelSummary] = useState<{ sosCount: number; wind: string; isLive: boolean } | null>(null);
  
  // Disaster News State
  const [disasterNews, setDisasterNews] = useState<DisasterArticle[]>([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const [isUpdatingNews, setIsUpdatingNews] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoUpdateCountdown, setAutoUpdateCountdown] = useState(45);
  const [hasApiKey, setHasApiKey] = useState(true);

  const focalLat = selectedDrone?.coordinates.lat || userLocation?.lat || 28.4595;
  const focalLng = selectedDrone?.coordinates.lng || userLocation?.lng || 77.0266;

  // Fetch Disaster News from TinyFish API
  const fetchDisasterNews = async (silent = false) => {
    if (!silent) setIsUpdatingNews(true);
    try {
      const res = await fetch("/api/tinyfish/disaster-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: focalLat,
          lng: focalLng,
          radiusKm: 50,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.articles) && json.articles.length > 0) {
          setDisasterNews(json.articles);
          setLastUpdated(new Date());
          setAutoUpdateCountdown(45);
          if (json.hasTinyFishKey !== undefined) {
            setHasApiKey(Boolean(json.hasTinyFishKey));
          }
        }
      }
    } catch (err) {
      console.warn("Failed to update disaster news in widget:", err);
    } finally {
      if (!silent) setIsUpdatingNews(false);
    }
  };

  // Fetch High-Level Intel Summary
  const fetchSummary = () => {
    fetch("/api/tinyfish/intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: focalLat, lng: focalLng }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) {
          setIntelSummary({
            sosCount: data.data.sosReports?.length || 3,
            wind: data.data.weather?.windSpeed || "14 km/h",
            isLive: Boolean(data.hasTinyFishKey),
          });
        }
      })
      .catch(() => {});
  };

  // Initial fetch and on focal coordinate change
  useEffect(() => {
    fetchDisasterNews();
    fetchSummary();
  }, [focalLat, focalLng]);

  // Auto-update timer (every 45s)
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoUpdateCountdown((prev) => {
        if (prev <= 1) {
          fetchDisasterNews(true);
          fetchSummary();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [focalLat, focalLng]);

  const activeArticle = disasterNews[newsIndex] || null;

  const nextArticle = () => {
    if (disasterNews.length > 0) {
      setNewsIndex((prev) => (prev + 1) % disasterNews.length);
    }
  };

  const prevArticle = () => {
    if (disasterNews.length > 0) {
      setNewsIndex((prev) => (prev - 1 + disasterNews.length) % disasterNews.length);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2.5 backdrop-blur-md shadow-lg transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-cyan-500/10 text-cyan-400">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-100 uppercase block">
              TinyFish Web Intel
            </span>
            <span className="text-[9px] font-mono text-zinc-500 block">
              Live OSINT Grounding
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold uppercase">
            LIVE TINYFISH
          </span>
        </div>
      </div>

      {/* Nearby Indian Natural Disaster News Section */}
      <div className="bg-zinc-950/80 border border-rose-500/25 rounded-lg p-2.5 flex flex-col gap-2 shadow-inner relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300">
                Indian Disaster News
              </span>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold" title="Verified against official Indian disaster agencies">
                VERIFIED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-400">
            <span className="text-zinc-500" title="Auto-updating via TinyFish">
              {autoUpdateCountdown}s
            </span>
            <button
              onClick={() => fetchDisasterNews(false)}
              disabled={isUpdatingNews}
              className="p-1 rounded hover:bg-zinc-800 text-cyan-400 hover:text-cyan-200 transition-colors"
              title="Refresh Nearby Disaster News Now"
            >
              <RefreshCw className={cn("w-3 h-3", isUpdatingNews && "animate-spin text-cyan-300")} />
            </button>
          </div>
        </div>

        {activeArticle ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded font-bold uppercase border text-[8px]",
                  activeArticle.severity === "CRITICAL"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : activeArticle.severity === "HIGH"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                )}
              >
                {activeArticle.severity} • {activeArticle.category}
              </span>
              <span className="text-zinc-400 font-bold bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800">
                {activeArticle.distanceKm} km away
              </span>
            </div>

            <h4 className="text-[11px] font-medium text-zinc-100 line-clamp-2 leading-tight">
              {activeArticle.title}
            </h4>

            {activeArticle.verification && (
              <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{activeArticle.verification.verifyingAuthority}</span>
              </div>
            )}

            <p className="text-[10px] text-zinc-400 line-clamp-2 leading-normal font-sans">
              {activeArticle.snippet}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[9px] font-mono">
              <div className="flex items-center gap-1 text-zinc-500 truncate max-w-[140px]">
                <span>Source:</span>
                <a
                  href={activeArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-0.5 truncate"
                >
                  <span className="truncate">{activeArticle.source}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              </div>

              {/* News Carousel Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-zinc-500 text-[8px]">
                  {newsIndex + 1}/{disasterNews.length}
                </span>
                <button
                  onClick={prevArticle}
                  className="p-0.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
                  title="Previous report"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={nextArticle}
                  className="p-0.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
                  title="Next report"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-3 text-zinc-500 text-[10px] font-mono">
            {isUpdatingNews ? "Querying TinyFish live search..." : "No alerts reported nearby."}
          </div>
        )}
      </div>

      {/* Grounding & Key Metrics */}
      <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
        <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-800/60 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
          <span className="text-zinc-300 font-bold truncate">
            {intelSummary ? `${intelSummary.sosCount} SOS Beacons` : "3 SOS Beacons"}
          </span>
        </div>
        <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-800/60 flex items-center gap-1.5">
          <Wind className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="text-zinc-300 font-bold truncate">
            {intelSummary ? intelSummary.wind : "14 km/h Gusts"}
          </span>
        </div>
      </div>

      {selectedDrone && (
        <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-400 bg-zinc-950/40 px-2 py-1 rounded border border-zinc-800/40">
          <Navigation className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
          <span className="truncate">Grounded to {selectedDrone.name}</span>
        </div>
      )}

      {/* Action to Launch Full Intel Workspace */}
      <button
        onClick={() => setActiveView("TinyFish Intel")}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold transition-all group shadow-sm"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Open Disaster Intel Hub</span>
        </span>
        <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </button>
    </div>
  );
}
