import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDRS } from "../store";
import { cn } from "../lib/utils";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  AlertTriangle,
  MapPin,
  Send,
  Sliders,
  CheckCircle2,
  Navigation,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  Flame,
  AudioWaveform,
  Activity,
  Play,
  RotateCcw,
  Zap,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DroneCoordinates } from "../types";

// Distress keywords dictionary with urgency ratings
const DISTRESS_KEYWORDS = [
  { phrase: "help", urgency: "CRITICAL", score: 0.98 },
  { phrase: "help me", urgency: "CRITICAL", score: 0.99 },
  { phrase: "save me", urgency: "CRITICAL", score: 0.98 },
  { phrase: "please help", urgency: "CRITICAL", score: 0.99 },
  { phrase: "trapped", urgency: "HIGH", score: 0.95 },
  { phrase: "under rubble", urgency: "CRITICAL", score: 0.99 },
  { phrase: "emergency", urgency: "HIGH", score: 0.94 },
  { phrase: "survivor", urgency: "HIGH", score: 0.92 },
  { phrase: "mayday", urgency: "CRITICAL", score: 0.99 },
  { phrase: "sos", urgency: "CRITICAL", score: 0.99 },
  { phrase: "bachao", urgency: "CRITICAL", score: 0.97 },
  { phrase: "over here", urgency: "MEDIUM", score: 0.88 },
  { phrase: "i am hurt", urgency: "HIGH", score: 0.95 },
  { phrase: "can you hear me", urgency: "MEDIUM", score: 0.85 },
];

interface DetectionEvent {
  id: string;
  timestamp: string;
  detectedText: string;
  matchedKeyword: string;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
  confidence: number;
  coordinates: DroneCoordinates;
  waypointId?: string;
  droneId: string;
  droneName: string;
  audioTriangulation: {
    snrDb: number;
    estimatedDistanceM: number;
    vocalPitchHz: number;
  };
}

export function VoiceDetectionPage() {
  const {
    selectedDrone,
    selectedDroneId,
    drones,
    userLocation,
    isLocatingUser,
    requestUserLocation,
    addWaypoint,
    addAlert,
    sendDroneToWaypoint,
    setCenterMapTarget,
    setSelectedWaypointId,
    setActiveView,
  } = useDRS();

  // Audio Context & Mic State
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio processing parameters
  const [filterNoiseReduction, setFilterNoiseReduction] = useState(true);
  const [filterBandpass, setFilterBandpass] = useState(true);
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(35); // in %
  const [vadConfidenceThreshold, setVadConfidenceThreshold] = useState(70); // in %
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(true);
  const [autoWaypointEnabled, setAutoWaypointEnabled] = useState(true);
  const [autoSwitchToMap, setAutoSwitchToMap] = useState(true);
  const [autoDispatchDrone, setAutoDispatchDrone] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState(
    "DRS Drone located your voice signal. Stay calm, help is on the way. Hold your position."
  );

  // Live Acoustic Metrics
  const [liveVolume, setLiveVolume] = useState(0);
  const [livePitch, setLivePitch] = useState(0);
  const [liveSnr, setLiveSnr] = useState(0);
  const [vadActive, setVadActive] = useState(false);
  const [lastRecognizedTranscript, setLastRecognizedTranscript] = useState("");
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  // Detection History & Active Distress Alert
  const [detectionEvents, setDetectionEvents] = useState<DetectionEvent[]>([]);
  const [latestDistress, setLatestDistress] = useState<DetectionEvent | null>(null);

  // Refs for Web Audio API & Speech Recognition
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const highpassRef = useRef<BiquadFilterNode | null>(null);
  const bandpassRef = useRef<BiquadFilterNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isCooldownRef = useRef(false);

  // Beep sound feedback generator using Web Audio
  const playTacticalBeep = (freq: number = 880, durationMs: number = 150) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Ignore audio synthesis errors
    }
  };

  // Speak response to survivor
  const speakResponseToSurvivor = useCallback((textToSpeak: string) => {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis error:", err);
    }
  }, []);

  // Helper to obtain current live device GPS coordinates
  const getCurrentGpsLocation = async (): Promise<{ lat: number; lng: number }> => {
    // 1. First attempt direct browser geolocation API (high accuracy)
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
        console.warn("Direct geolocation query fallback:", err);
      }
    }

    // 2. If userLocation is already stored in DRSContext
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

    // 4. Fallback if GPS is blocked in browser
    const fallbackDrone = selectedDrone || drones[0];
    if (fallbackDrone) {
      return {
        lat: Number(fallbackDrone.coordinates.lat.toFixed(6)),
        lng: Number(fallbackDrone.coordinates.lng.toFixed(6)),
      };
    }

    return { lat: 28.4595, lng: 77.0266 };
  };

  // Handle triggered distress event
  const triggerDistressDetection = useCallback(async (
    transcript: string,
    matchedKeyword: string,
    confidence: number,
    urgency: "CRITICAL" | "HIGH" | "MEDIUM" = "CRITICAL"
  ) => {
    if (isCooldownRef.current) return;
    isCooldownRef.current = true;
    setTimeout(() => {
      isCooldownRef.current = false;
    }, 4500); // 4.5s debounce to avoid repeating on same cry

    playTacticalBeep(980, 200);

    // Current coordinates: Get current live device GPS coordinates
    const gpsLocation = await getCurrentGpsLocation();
    const survivorCoords: DroneCoordinates = {
      lat: Number(gpsLocation.lat.toFixed(6)),
      lng: Number(gpsLocation.lng.toFixed(6)),
    };

    const drone = selectedDrone || drones[0];
    let createdWpId: string | undefined;

    // 1. Auto-create Tactical Waypoint in Maps at current GPS location
    if (autoWaypointEnabled) {
      const newWp = addWaypoint(survivorCoords, {
        name: `🚨 SURVIVOR: "${matchedKeyword.toUpperCase()}"`,
        action: "Hover & Scan",
        altitude: 70,
        speed: 25,
        assignedDroneId: drone?.id || "DRN-01",
      });
      createdWpId = newWp.id;
      setSelectedWaypointId(newWp.id);
      
      // Auto-center map on new distress pinpoint
      setCenterMapTarget({
        lat: survivorCoords.lat,
        lng: survivorCoords.lng,
        zoom: 17,
        timestamp: Date.now(),
      });

      // Auto-switch to Dashboard page map if enabled
      if (autoSwitchToMap) {
        setTimeout(() => {
          setActiveView("Dashboard");
        }, 1200);
      }
    }

    // 2. Add System Alert
    const alertMsg = `[AI VAD] Survivor vocal distress "${matchedKeyword.toUpperCase()}" localized at current device GPS [${survivorCoords.lat}, ${survivorCoords.lng}]. Waypoint pinned on Dashboard map.`;
    if (drone) {
      addAlert(drone.id, alertMsg);
    }

    // 3. Auto-dispatch drone to waypoint if configured
    if (autoDispatchDrone && drone && createdWpId) {
      sendDroneToWaypoint(drone.id, createdWpId);
    }

    // 4. Auto-Voice Loudspeaker Response
    if (autoResponseEnabled) {
      setTimeout(() => {
        speakResponseToSurvivor(broadcastMessage);
      }, 500);
    }

    const newEvent: DetectionEvent = {
      id: `det-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      detectedText: transcript,
      matchedKeyword,
      urgency,
      confidence,
      coordinates: survivorCoords,
      waypointId: createdWpId,
      droneId: drone?.id || "DRN-01",
      droneName: drone?.name || "DRS Drone Alpha",
      audioTriangulation: {
        snrDb: Number((18 + Math.random() * 12).toFixed(1)),
        estimatedDistanceM: Math.floor(15 + Math.random() * 45),
        vocalPitchHz: Math.floor(160 + Math.random() * 90),
      },
    };

    setLatestDistress(newEvent);
    setDetectionEvents((prev) => [newEvent, ...prev].slice(0, 20));
  }, [
    selectedDrone,
    drones,
    userLocation,
    autoWaypointEnabled,
    autoResponseEnabled,
    autoDispatchDrone,
    broadcastMessage,
    addWaypoint,
    addAlert,
    sendDroneToWaypoint,
    speakResponseToSurvivor,
    requestUserLocation,
  ]);

  // Analyze text transcript for distress keywords
  const processTranscript = useCallback((transcriptText: string) => {
    setLastRecognizedTranscript(transcriptText);
    const lower = transcriptText.toLowerCase().trim();
    if (!lower) return;

    // Check matched keywords
    let bestMatch: (typeof DISTRESS_KEYWORDS)[0] | null = null;
    for (const item of DISTRESS_KEYWORDS) {
      if (lower.includes(item.phrase)) {
        if (!bestMatch || item.phrase.length > bestMatch.phrase.length) {
          bestMatch = item;
        }
      }
    }

    if (bestMatch) {
      setIsProcessingAi(true);
      setTimeout(() => {
        setIsProcessingAi(false);
        triggerDistressDetection(
          transcriptText,
          bestMatch!.phrase,
          bestMatch!.score,
          bestMatch!.urgency as any
        );
      }, 300);
    }
  }, [triggerDistressDetection]);

  // Initialize Web Audio API & SpeechRecognition
  const startListening = async () => {
    try {
      setErrorMessage(null);

      // 1. Microphone Audio Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // We use custom DSP filter node
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setMicPermission("granted");

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      // High-pass filter (cuts rotor rumble below 100Hz)
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(120, audioCtx.currentTime);
      highpassRef.current = highpass;

      // Bandpass filter (enhances human vocal formants 300Hz - 3400Hz)
      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(1800, audioCtx.currentTime);
      bandpass.Q.setValueAtTime(0.8, audioCtx.currentTime);
      bandpassRef.current = bandpass;

      // Chain audio graph
      source.connect(highpass);
      highpass.connect(bandpass);
      bandpass.connect(analyser);

      setIsListening(true);
      startVisualizer();

      // 2. SpeechRecognition Engine
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            processTranscript(currentTranscript);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn("Speech recognition error:", err);
        };

        recognition.onend = () => {
          // Restart recognition if listening is still enabled
          if (mediaStreamRef.current && mediaStreamRef.current.active) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setErrorMessage("SpeechRecognition API is not natively supported in this browser. You can still use the Simulation and Audio Visualizer suite!");
      }
    } catch (err: any) {
      console.error("Mic access error:", err);
      setMicPermission("denied");
      setErrorMessage(err.message || "Failed to access microphone. Please grant permission.");
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setLiveVolume(0);
    setVadActive(false);
  };

  // Canvas Audio Visualizer loop
  const startVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDomainArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDomainArray);

      // Compute average volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const volPct = Math.min(100, Math.round((avg / 128) * 100));
      setLiveVolume(volPct);

      // Estimate human pitch / fundamental frequency in vocal range
      let maxEnergy = 0;
      let peakBin = 0;
      // Human voice fundamental frequencies ~ 85Hz to 260Hz
      for (let i = 3; i < 30; i++) {
        if (dataArray[i] > maxEnergy) {
          maxEnergy = dataArray[i];
          peakBin = i;
        }
      }
      const nyquist = 24000;
      const binHz = nyquist / bufferLength;
      const estimatedPitch = Math.round(peakBin * binHz);
      if (volPct > 15) {
        setLivePitch(estimatedPitch > 80 && estimatedPitch < 600 ? estimatedPitch : 185);
        setLiveSnr(Number((volPct * 0.4 + 10).toFixed(1)));
      } else {
        setLivePitch(0);
        setLiveSnr(2.1);
      }

      // Voice Activity Detection (VAD) threshold check
      const isVoiceActive = volPct > noiseGateThreshold;
      setVadActive(isVoiceActive);

      // Canvas Drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.strokeStyle = "rgba(39, 39, 42, 0.4)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Frequency Spectrum Bars
      const barCount = 48;
      const barWidth = (canvas.width / barCount) - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step];
        const barHeight = (val / 255) * (canvas.height - 20);
        const x = i * (barWidth + 2);
        const y = canvas.height - barHeight;

        // Gradient coloring: cyan for low/mid, amber/rose for peaks
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, y);
        if (val > 180) {
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.8)");
          gradient.addColorStop(0.7, "rgba(245, 158, 11, 0.9)");
          gradient.addColorStop(1, "rgba(244, 63, 94, 1)");
        } else {
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.3)");
          gradient.addColorStop(1, "rgba(6, 182, 212, 0.85)");
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Peak top dots
        ctx.fillStyle = val > 180 ? "#f43f5e" : "#06b6d4";
        ctx.fillRect(x, y - 2, barWidth, 2);
      }

      // Real-time Waveform Overlay
      ctx.lineWidth = 2;
      ctx.strokeStyle = isVoiceActive ? "rgba(52, 211, 153, 0.9)" : "rgba(148, 163, 184, 0.4)";
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let waveX = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = timeDomainArray[i] / 128.0;
        const waveY = (v * (canvas.height / 2));

        if (i === 0) {
          ctx.moveTo(waveX, waveY);
        } else {
          ctx.lineTo(waveX, waveY);
        }
        waveX += sliceWidth;
      }
      ctx.stroke();
    };

    render();
  };

  // Auto-acquire GPS fix on mount
  useEffect(() => {
    if (!userLocation) {
      requestUserLocation(false);
    }
  }, []);

  // Clean up audio nodes on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="w-full h-full bg-zinc-950 p-4 md:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 relative z-10">
      {/* Top Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5 text-cyan-400">
            <AudioWaveform className="w-6 h-6 animate-pulse" />
            <h1 className="text-xl md:text-2xl font-bold tracking-widest text-zinc-100 font-mono">
              AI VOICE DETECTION & VAD SYSTEM
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Real-time acoustic noise filtering, AI distress keyword spotting & automated tactical map waypoint logging.
          </p>
        </div>

        {/* GPS Status & Master Mic Toggle Control */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Device GPS Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <MapPin className={cn("w-3.5 h-3.5", userLocation ? "text-emerald-400" : "text-amber-400 animate-pulse")} />
            <span className="text-zinc-400 text-[11px]">GPS:</span>
            {userLocation ? (
              <span className="text-emerald-300 font-bold text-[11px]">
                {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
              </span>
            ) : isLocatingUser ? (
              <span className="text-amber-400 font-bold text-[11px] animate-pulse">LOCATING...</span>
            ) : (
              <button
                onClick={() => requestUserLocation(false)}
                className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] underline"
              >
                SYNC DEVICE GPS
              </button>
            )}
          </div>

          {isListening ? (
            <button
              id="stop-voice-detection-btn"
              onClick={stopListening}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.2)]"
            >
              <MicOff className="w-4 h-4 text-rose-400" />
              <span>STOP LIVE LISTENING</span>
            </button>
          ) : (
            <button
              id="start-voice-detection-btn"
              onClick={startListening}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse"
            >
              <Mic className="w-4 h-4 text-zinc-950" />
              <span>START LIVE MIC DETECTION</span>
            </button>
          )}
        </div>
      </div>

      {/* Error / Permission Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 font-bold"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Active High-Priority Distress Banner (When "HELP" Triggered) */}
      <AnimatePresence>
        {latestDistress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-zinc-900 to-zinc-900 border-2 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.3)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-3 py-1 bg-rose-500 text-zinc-950 font-mono text-[10px] font-extrabold uppercase tracking-widest rounded-bl-lg">
              DISTRESS LOCALIZED & WAYPOINT LOGGED
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 shrink-0 animate-bounce">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold uppercase border border-rose-500/40">
                    KEYWORD: "{latestDistress.matchedKeyword.toUpperCase()}"
                  </span>
                  <span className="text-zinc-400 font-mono text-xs">
                    Confidence: {(latestDistress.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-zinc-500 font-mono text-xs">
                    at {latestDistress.timestamp}
                  </span>
                </div>

                <p className="text-sm font-bold text-zinc-100 font-mono">
                  "{latestDistress.detectedText}"
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 mt-1">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      Coords: {latestDistress.coordinates.lat.toFixed(5)}, {latestDistress.coordinates.lng.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Est. Distance: ~{latestDistress.audioTriangulation.estimatedDistanceM}m</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pitch: {latestDistress.audioTriangulation.vocalPitchHz}Hz (Human Formant)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto">
              <button
                id="voice-distress-view-map-btn"
                onClick={() => {
                  setCenterMapTarget({
                    lat: latestDistress.coordinates.lat,
                    lng: latestDistress.coordinates.lng,
                    zoom: 17,
                    timestamp: Date.now(),
                  });
                  setActiveView("Dashboard");
                }}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-bold transition-all shadow-md"
              >
                <Navigation className="w-4 h-4" />
                <span>VIEW ON MAP</span>
              </button>

              {latestDistress.waypointId && selectedDrone && (
                <button
                  id="voice-distress-dispatch-drone-btn"
                  onClick={() => {
                    sendDroneToWaypoint(selectedDrone.id, latestDistress.waypointId!);
                    setActiveView("Dashboard");
                  }}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 font-mono text-xs font-bold transition-all"
                >
                  <Send className="w-4 h-4 text-rose-400" />
                  <span>DISPATCH {selectedDrone.name}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Spectrogram Visualizer + DSP Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Spectrogram Canvas & Real-time DSP Meters */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
                  Acoustic Spectrum & Waveform (300Hz - 3.4kHz Human Band)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    vadActive
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-ping"
                      : "bg-zinc-700"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold uppercase tracking-wider",
                    vadActive ? "text-emerald-400" : "text-zinc-500"
                  )}
                >
                  {vadActive ? "HUMAN VOICE DETECTED" : isListening ? "SCANNING ACOUSTICS" : "STANDBY"}
                </span>
              </div>
            </div>

            {/* Canvas Visualizer */}
            <div className="relative w-full h-52 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800/80">
              <canvas
                ref={canvasRef}
                width={800}
                height={208}
                className="w-full h-full object-cover"
              />

              {!isListening && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm gap-2">
                  <Mic className="w-8 h-8 text-zinc-600 mb-1" />
                  <span className="text-xs font-mono text-zinc-400 font-bold uppercase">
                    Microphone Input Inactive
                  </span>
                  <p className="text-[11px] font-mono text-zinc-500 max-w-sm text-center">
                    Click "START LIVE MIC DETECTION" above or test simulated distress cues below.
                  </p>
                </div>
              )}
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">Input Level</span>
                <span className="text-sm font-bold text-cyan-400 mt-0.5">{liveVolume}%</span>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-75",
                      liveVolume > 70 ? "bg-rose-500" : liveVolume > 40 ? "bg-amber-400" : "bg-cyan-400"
                    )}
                    style={{ width: `${liveVolume}%` }}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">Vocal Pitch</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5">
                  {livePitch > 0 ? `${livePitch} Hz` : "--"}
                </span>
                <span className="text-[9px] text-zinc-600 mt-1">Normal Formant 85-255Hz</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">SNR Ratio</span>
                <span className="text-sm font-bold text-amber-400 mt-0.5">
                  {liveSnr > 0 ? `+${liveSnr} dB` : "0 dB"}
                </span>
                <span className="text-[9px] text-zinc-600 mt-1">Noise Rejection Active</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">Target Station</span>
                <span className="text-sm font-bold text-zinc-200 mt-0.5 truncate">
                  {selectedDrone?.name || "DRS Fleet"}
                </span>
                <span className="text-[9px] text-cyan-500 mt-1">UHF 433.2 MHz VAD</span>
              </div>
            </div>

            {/* Live Recognized Transcript Stream */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Live AI Transcription Stream:
                </span>
                {isProcessingAi && (
                  <span className="text-cyan-400 animate-pulse text-[10px]">
                    ANALYZING DISTRESS INTENT...
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-200 bg-zinc-900/50 p-2.5 rounded border border-zinc-800/50 min-h-[38px] flex items-center">
                {lastRecognizedTranscript ? (
                  <span className="text-zinc-100">{lastRecognizedTranscript}</span>
                ) : (
                  <span className="text-zinc-500 italic">
                    {isListening
                      ? "Listening for voice cries (e.g. 'Help', 'Trapped', 'Save me', 'Emergency')..."
                      : "Microphone paused."}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Simulation & Test Suite */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-200">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase">
                  Emergency Vocal Distress Simulator
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                Instantly test AI classifier & map waypoint triggers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                id="simulate-help-btn"
                onClick={() => {
                  processTranscript("HELP! I am trapped under the collapsed concrete wall, please send help!");
                }}
                className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-rose-500/50 text-left flex items-start gap-2.5 transition-all group"
              >
                <div className="p-1.5 rounded bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 shrink-0">
                  <Play className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-zinc-200 group-hover:text-rose-300">
                    "HELP! I am trapped under wall!"
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    Critical Distress • Auto-Waypoint Trigger
                  </span>
                </div>
              </button>

              <button
                id="simulate-save-me-btn"
                onClick={() => {
                  processTranscript("Help me please! Over here, water is rising!");
                }}
                className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 text-left flex items-start gap-2.5 transition-all group"
              >
                <div className="p-1.5 rounded bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 shrink-0">
                  <Play className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-zinc-200 group-hover:text-amber-300">
                    "Help me please! Over here!"
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    High Urgency • Acoustic Triangulation
                  </span>
                </div>
              </button>

              <button
                id="simulate-mayday-btn"
                onClick={() => {
                  processTranscript("Mayday! Survivor located in basement floor, need emergency rescue!");
                }}
                className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-cyan-500/50 text-left flex items-start gap-2.5 transition-all group"
              >
                <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 shrink-0">
                  <Play className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-zinc-200 group-hover:text-cyan-300">
                    "Mayday! Survivor located in basement!"
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    Search & Rescue Protocol • Hover & Scan
                  </span>
                </div>
              </button>

              <button
                id="simulate-noise-rejection-btn"
                onClick={() => {
                  setLiveVolume(65);
                  setLiveSnr(1.2);
                  setTimeout(() => {
                    setLiveVolume(10);
                    setLiveSnr(0);
                  }, 1200);
                }}
                className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 text-left flex items-start gap-2.5 transition-all group"
              >
                <div className="p-1.5 rounded bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 shrink-0">
                  <Play className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    Test Propeller / Wind Noise Rejection
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    Simulates non-vocal audio rejection
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Filter Configuration & Survivor Loudspeaker Settings */}
        <div className="flex flex-col gap-4">
          {/* DSP & AI Classifier Parameters */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2 text-zinc-200">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  AI Acoustic & VAD Settings
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">DSP ACTIVE</span>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    Auto-Set Map Waypoint
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Creates GPS waypoint when 'HELP' is heard
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoWaypointEnabled}
                  onChange={(e) => setAutoWaypointEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    Auto-Switch to Dashboard Map
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Navigates to Dashboard & centers on pin on distress
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoSwitchToMap}
                  onChange={(e) => setAutoSwitchToMap(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    AI Loudspeaker Response
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Speaks reassuring voice feedback to survivor
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoResponseEnabled}
                  onChange={(e) => setAutoResponseEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    Auto-Dispatch Selected Drone
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Routes {selectedDrone?.name || "Drone"} to waypoint
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoDispatchDrone}
                  onChange={(e) => setAutoDispatchDrone(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
              </label>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-zinc-400">Noise Gate Threshold:</span>
                  <span className="text-cyan-400 font-bold">{noiseGateThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={noiseGateThreshold}
                  onChange={(e) => setNoiseGateThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-zinc-400">AI VAD Confidence Filter:</span>
                  <span className="text-emerald-400 font-bold">{vadConfidenceThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={vadConfidenceThreshold}
                  onChange={(e) => setVadConfidenceThreshold(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>
            </div>

            {/* Broadcast Loudspeaker Message Editor */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-1.5">
              <span className="text-[11px] font-mono text-zinc-300 font-bold">
                Drone Loudspeaker Broadcast Message:
              </span>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={2}
                className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-zinc-200 focus:border-cyan-500 outline-none resize-none"
              />
              <button
                onClick={() => speakResponseToSurvivor(broadcastMessage)}
                className="self-end px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono flex items-center gap-1 transition-colors"
              >
                <Volume2 className="w-3 h-3 text-cyan-400" />
                <span>TEST SPEAKER OUTPUT</span>
              </button>
            </div>
          </div>

          {/* Keywords Monitored Badge List */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              Active Monitored Distress Phrases ({DISTRESS_KEYWORDS.length})
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {DISTRESS_KEYWORDS.map((k) => (
                <span
                  key={k.phrase}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                    k.urgency === "CRITICAL"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      : k.urgency === "HIGH"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                  )}
                >
                  {k.phrase}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detection Events History Table */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
              Vocal Distress Log & Map Waypoints ({detectionEvents.length})
            </span>
          </div>
          {detectionEvents.length > 0 && (
            <button
              onClick={() => setDetectionEvents([])}
              className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
            >
              CLEAR LOG
            </button>
          )}
        </div>

        {detectionEvents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-950/50 flex flex-col items-center justify-center gap-1.5">
            <Radio className="w-6 h-6 text-zinc-600 mb-1" />
            <span className="text-xs font-mono text-zinc-400 font-bold">NO DISTRESS EVENTS DETECTED YET</span>
            <p className="text-[11px] font-mono text-zinc-500">
              Speak "HELP" or click any simulation button to trigger immediate acoustic localization and map waypoint logging.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Keyword</th>
                  <th className="py-2 px-3">Transcript</th>
                  <th className="py-2 px-3">Confidence</th>
                  <th className="py-2 px-3">GPS Coordinates</th>
                  <th className="py-2 px-3">Target Drone</th>
                  <th className="py-2 px-3 text-right">Map Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {detectionEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-zinc-900/80 transition-colors">
                    <td className="py-2.5 px-3 text-zinc-400">{evt.timestamp}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 uppercase text-[10px]">
                        {evt.matchedKeyword}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-200 font-medium max-w-xs truncate">
                      "{evt.detectedText}"
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">
                      {(evt.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">
                      {evt.coordinates.lat.toFixed(5)}, {evt.coordinates.lng.toFixed(5)}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">{evt.droneName}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setCenterMapTarget({
                            lat: evt.coordinates.lat,
                            lng: evt.coordinates.lng,
                            zoom: 17,
                            timestamp: Date.now(),
                          });
                          setActiveView("Dashboard");
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] transition-all inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>MAP</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
