import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Radio, Sparkles, ExternalLink, AudioLines, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { useDRS } from "../store";
import { cn } from "../lib/utils";

export function VoiceFeed() {
  const {
    selectedDrone,
    drones,
    userLocation,
    requestUserLocation,
    addWaypoint,
    addAlert,
    setCenterMapTarget,
    setSelectedWaypointId,
    setActiveView,
    sendDroneToWaypoint,
  } = useDRS();

  const [isListening, setIsListening] = useState(false);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [justPinnedToast, setJustPinnedToast] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const recognitionRef = useRef<any>(null);
  const cooldownRef = useRef(false);

  // Play tactical sound beep
  const playTacticalBeep = (freq = 880, duration = 180) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Ignored
    }
  };

  // Helper to obtain current live device GPS coordinates
  const getCurrentGpsLocation = async (): Promise<{ lat: number; lng: number }> => {
    // 1. Direct browser geolocation lookup (fresh high-accuracy reading)
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 4000,
            maximumAge: 10000,
          });
        });
        return {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
      } catch (err) {
        console.warn("Direct geolocation query fallback in VoiceFeed:", err);
      }
    }

    // 2. Already cached userLocation in state
    if (userLocation) {
      return {
        lat: Number(userLocation.lat.toFixed(6)),
        lng: Number(userLocation.lng.toFixed(6)),
      };
    }

    // 3. Request via context requestUserLocation
    try {
      const loc = await requestUserLocation(false);
      if (loc) {
        return {
          lat: Number(loc.lat.toFixed(6)),
          lng: Number(loc.lng.toFixed(6)),
        };
      }
    } catch {
      // Ignore
    }

    // 4. Fallback if GPS is blocked
    const fallbackDrone = selectedDrone || drones[0];
    if (fallbackDrone) {
      return {
        lat: Number(fallbackDrone.coordinates.lat.toFixed(6)),
        lng: Number(fallbackDrone.coordinates.lng.toFixed(6)),
      };
    }

    return { lat: 28.4595, lng: 77.0266 };
  };

  // Trigger distress pinpoint on map
  const triggerDistressPin = async (phrase: string, keyword: string) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 4000);

    playTacticalBeep(980, 220);

    // Fetch current live device GPS coordinates
    const gpsLocation = await getCurrentGpsLocation();
    const pinCoords = {
      lat: Number(gpsLocation.lat.toFixed(6)),
      lng: Number(gpsLocation.lng.toFixed(6)),
    };

    const drone = selectedDrone || drones[0];
    const newWp = addWaypoint(pinCoords, {
      name: `🚨 SURVIVOR: "${keyword.toUpperCase()}"`,
      action: "Hover & Scan",
      altitude: 65,
      speed: 25,
      assignedDroneId: drone?.id || "DRN-01",
      isVoiceAlert: true,
      alertKeyword: keyword.toUpperCase(),
      urgency: "CRITICAL",
      distressTranscript: phrase,
      detectedTime: new Date().toLocaleTimeString(),
    });
    setSelectedWaypointId(newWp.id);

    if (drone) {
      addAlert(drone.id, `[GNANI.AI VOICE] Survivor distress cry "${keyword.toUpperCase()}" pinned at current GPS [${pinCoords.lat}, ${pinCoords.lng}]`);
    }

    // Always navigate the map to the location pinned by Gnani AI
    setActiveView("Dashboard");
    setCenterMapTarget({
      lat: pinCoords.lat,
      lng: pinCoords.lng,
      zoom: 18,
      timestamp: Date.now(),
    });

    setLastDetection(`"${keyword.toUpperCase()}" detected (Gnani.ai)`);
    setJustPinnedToast({
      name: newWp.name,
      lat: pinCoords.lat,
      lng: pinCoords.lng,
    });

    setTimeout(() => {
      setJustPinnedToast(null);
    }, 6000);

    // Speak loudspeaker response
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("DRS Drone pinpointed your voice. Hold position, rescue is on route.");
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignore
    }
  };

  // Start speech recognition
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech Recognition API is not supported in this browser. You can use the 'SIMULATE HELP' button.");
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript.toLowerCase() + " ";
        }

        // Gnani.ai Multilingual SAR Distress Keywords
        const keywords = [
          "help", "help me", "save me", "sos", "trapped", "mayday",
          "bachao", "madad", "madad karo", "fas gaye", "emergency", "please help",
          "kaapaathunga", "kaapadandi", "kaapadi", "vaachva"
        ];
        for (const kw of keywords) {
          if (transcript.includes(kw)) {
            triggerDistressPin(transcript.trim(), kw);
            break;
          }
        }
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignored
        }
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono flex items-center gap-1.5">
          <AudioLines className="w-3 h-3 text-cyan-400" />
          <span>Gnani.ai Voice AI</span>
        </h2>
        <button
          onClick={() => setActiveView("Voice Detection")}
          className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
          title="Open Full Gnani.ai Voice Detection & VAD Console"
        >
          <span>GNANI VAD</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-mono text-zinc-300">UHF 433.2 MHz</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1 py-0.5 rounded font-bold">
              GNANI.AI
            </span>
            <div className="flex items-center gap-1">
              <div className={cn("w-1.5 h-3 rounded-xs", isListening ? "bg-rose-500 animate-pulse" : "bg-cyan-500")}></div>
              <div className={cn("w-1.5 h-4 rounded-xs", isListening ? "bg-rose-400 animate-pulse" : "bg-cyan-400")}></div>
              <div className={cn("w-1.5 h-2.5 rounded-xs", isListening ? "bg-rose-500" : "bg-cyan-500")}></div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-[10px] font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Indic & Multilingual SAR</span>
          </span>
          <span className={cn("font-bold px-1.5 py-0.5 rounded text-[9px]", isListening ? "bg-rose-950 text-rose-300 border border-rose-500/50 animate-pulse" : "bg-emerald-950 text-emerald-400 border border-emerald-500/40")}>
            {isListening ? "GNANI ACTIVE" : "READY"}
          </span>
        </div>

        {/* Trigger / Controls */}
        <div className="flex gap-2">
          <button
            onClick={toggleListening}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-xs font-mono font-bold tracking-wide border",
              isListening
                ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse"
                : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50"
            )}
            title={isListening ? "Click to stop listening" : "Click to start live voice detection on map"}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isListening ? "LISTENING (HELP / BACHAO)" : "LISTEN WITH GNANI.AI"}</span>
          </button>
        </div>

        {/* Quick Simulation Trigger */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => triggerDistressPin("HELP! Trapped under debris", "help")}
            className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 hover:border-rose-500/80 rounded text-[10px] font-mono text-rose-200 font-bold flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
            title="Simulate survivor shouting HELP"
          >
            <MapPin className="w-3 h-3 text-rose-400" />
            <span>PIN "HELP!"</span>
          </button>
          <button
            onClick={() => triggerDistressPin("BACHAO! Hum fas gaye hain", "bachao")}
            className="py-1.5 px-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-500/80 rounded text-[10px] font-mono text-amber-200 font-bold flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
            title="Simulate Indic distress cry BACHAO"
          >
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>PIN "BACHAO!"</span>
          </button>
        </div>

        {/* Pinpoint Notification Toast Banner */}
        {justPinnedToast && (
          <div className="p-2 rounded bg-rose-950/90 border border-rose-500/80 text-[10px] font-mono text-rose-200 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-1 font-bold text-rose-300 mb-0.5">
              <CheckCircle2 className="w-3 h-3 text-rose-400" />
              <span>PINPOINT ADDED TO MAP!</span>
            </div>
            <div className="text-[9px] text-zinc-300 truncate">
              {justPinnedToast.name}
            </div>
            <div className="text-[9px] text-zinc-400">
              [{justPinnedToast.lat.toFixed(4)}, {justPinnedToast.lng.toFixed(4)}]
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

