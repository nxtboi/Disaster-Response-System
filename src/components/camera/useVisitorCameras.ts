import { useState, useEffect, useCallback, useRef } from "react";
import { CameraSourceInfo } from "./CameraTypes";

export interface VisitorCameraNode {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorRole: string;
  visitorLocation: string;
  resolution: string;
  fov: string;
  status: "ONLINE" | "STANDBY" | "OFFLINE";
  sensorSpec: string;
  latencyMs: number;
  battery: number;
  isSelf: boolean;
  isRealDevice: boolean;
  streamType: "live-stream" | "tactical-bodycam" | "helmet-cam" | "mobile-feed";
  stream?: MediaStream | null;
  lastSeen: number;
  hasLiveFrame?: boolean;
}

// Preset tactical field scout cameras
export const DEFAULT_TACTICAL_VISITORS: VisitorCameraNode[] = [
  {
    id: "visitor-field-alpha",
    visitorId: "VIS-ALPHA-01",
    visitorName: "Capt. Miller (Field Recon Team)",
    visitorRole: "Forward Tactical Scout",
    visitorLocation: "Sector C-4 • West Ridge",
    resolution: "1080p 60FPS",
    fov: "115° Ultra-Wide",
    status: "ONLINE",
    sensorSpec: "Axon Body 3 Optical + Gyro Stabilization",
    latencyMs: 19,
    battery: 88,
    isSelf: false,
    isRealDevice: false,
    streamType: "tactical-bodycam",
    lastSeen: Date.now(),
  },
  {
    id: "visitor-field-bravo",
    visitorId: "VIS-BRAVO-02",
    visitorName: "Sarah Vance (Perimeter Scout 02)",
    visitorRole: "Mobile Perimeter Surveillance",
    visitorLocation: "Sector A-1 • North Gate",
    resolution: "1440p 60FPS",
    fov: "95° Wide",
    status: "ONLINE",
    sensorSpec: "FLIR Dual Thermal/Optical Helmet Rig",
    latencyMs: 24,
    battery: 76,
    isSelf: false,
    isRealDevice: false,
    streamType: "helmet-cam",
    lastSeen: Date.now(),
  },
  {
    id: "visitor-field-charlie",
    visitorId: "VIS-CHARLIE-03",
    visitorName: "Officer Chen (Search & Rescue 04)",
    visitorRole: "Search & Disaster Evac Lead",
    visitorLocation: "Sector E-2 • Forest Perim",
    resolution: "4K 30FPS",
    fov: "120° Tactical",
    status: "ONLINE",
    sensorSpec: "4K High-Dynamic Optical Bodycam",
    latencyMs: 31,
    battery: 92,
    isSelf: false,
    isRealDevice: false,
    streamType: "tactical-bodycam",
    lastSeen: Date.now(),
  },
  {
    id: "visitor-field-delta",
    visitorId: "VIS-DELTA-04",
    visitorName: "Tactical Mobile HQ (Unit 05)",
    visitorRole: "Rapid Command Interceptor",
    visitorLocation: "South Compound Base",
    resolution: "1080p 120FPS",
    fov: "135° Wide-Angle",
    status: "ONLINE",
    sensorSpec: "Low-Latency Mesh RF Bodycam Link",
    latencyMs: 16,
    battery: 95,
    isSelf: false,
    isRealDevice: false,
    streamType: "mobile-feed",
    lastSeen: Date.now(),
  },
];

// Generate or retrieve persistent Device Client ID for cross-device identification
function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem("drs_persistent_device_id");
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 8);
      const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|Android/i.test(navigator.userAgent);
      id = `dev_${isMobile ? "mobile" : "host"}_${rand}`;
      localStorage.setItem("drs_persistent_device_id", id);
    }
    return id;
  } catch {
    return `dev_${Math.random().toString(36).substring(2, 8)}`;
  }
}

function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Remote Device";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone Mobile Feed";
  if (/iPad/i.test(ua)) return "iPad Tactical Feed";
  if (/Android/i.test(ua)) return "Android Mobile Feed";
  if (/Macintosh/i.test(ua)) return "Mac Live Feed";
  if (/Windows/i.test(ua)) return "PC Tactical Feed";
  return "Device Camera Feed";
}

const MY_DEVICE_ID = getOrCreateDeviceId();

export function useVisitorCameras(currentUsername: string = "Operator") {
  const [visitors, setVisitors] = useState<VisitorCameraNode[]>(DEFAULT_TACTICAL_VISITORS);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const frameCaptureIntervalRef = useRef<number | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isBroadcastingRef = useRef<boolean>(false);

  // Sync state ref
  useEffect(() => {
    isBroadcastingRef.current = isBroadcasting;
  }, [isBroadcasting]);

  // Fetch active visitors from server
  const fetchServerVisitors = useCallback(async () => {
    try {
      const res = await fetch("/api/visitors");
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.visitors)) {
        setVisitors((prev) => {
          // Merge server visitors with local self node
          const serverList: VisitorCameraNode[] = data.visitors.map((v: any) => ({
            ...v,
            isSelf: v.id === `visitor-self-${MY_DEVICE_ID}`,
            stream: v.id === `visitor-self-${MY_DEVICE_ID}` ? localStream : undefined,
          }));

          // Preserve self node if currently broadcasting
          if (isBroadcastingRef.current) {
            const hasSelf = serverList.some((v) => v.id === `visitor-self-${MY_DEVICE_ID}`);
            if (!hasSelf) {
              const selfNode: VisitorCameraNode = {
                id: `visitor-self-${MY_DEVICE_ID}`,
                visitorId: `DEV-${MY_DEVICE_ID.toUpperCase().slice(-6)}`,
                visitorName: `${currentUsername} (${detectDeviceLabel()})`,
                visitorRole: "Live Field Unit / Operator",
                visitorLocation: "Live Remote Station",
                resolution: "1080p 60FPS",
                fov: "84° Wide",
                status: "ONLINE",
                sensorSpec: "Direct Hardware WebRTC Camera Stream",
                latencyMs: 12,
                battery: 100,
                isSelf: true,
                isRealDevice: true,
                streamType: "live-stream",
                stream: localStream,
                lastSeen: Date.now(),
                hasLiveFrame: true,
              };
              return [selfNode, ...serverList];
            }
          }

          // If empty, return default tactical
          if (serverList.length === 0) {
            return DEFAULT_TACTICAL_VISITORS;
          }

          return serverList;
        });
      }
    } catch {
      // Fallback
    }
  }, [localStream, currentUsername]);

  // Server-Sent Events (SSE) for Real-Time Cross-Device Sync
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: number | null = null;

    try {
      eventSource = new EventSource("/api/visitors/events");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.visitors)) {
            setVisitors(
              data.visitors.map((v: any) => ({
                ...v,
                isSelf: v.id === `visitor-self-${MY_DEVICE_ID}`,
                stream: v.id === `visitor-self-${MY_DEVICE_ID}` ? localStream : undefined,
              }))
            );
          } else if (data && data.node) {
            setVisitors((prev) => {
              const existingIdx = prev.findIndex((v) => v.id === data.node.id);
              const nodeWithSelf = {
                ...data.node,
                isSelf: data.node.id === `visitor-self-${MY_DEVICE_ID}`,
              };
              if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx] = nodeWithSelf;
                return copy;
              }
              return [nodeWithSelf, ...prev];
            });
          }
        } catch {}
      };

      eventSource.onerror = () => {
        // SSE disconnected or unsupported, fallback to polling
        if (!fallbackInterval) {
          fallbackInterval = window.setInterval(fetchServerVisitors, 3000);
        }
      };
    } catch {
      fallbackInterval = window.setInterval(fetchServerVisitors, 3000);
    }

    // Initial load
    fetchServerVisitors();

    // Regular polling safety check
    const pollTimer = window.setInterval(fetchServerVisitors, 5000);

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      clearInterval(pollTimer);
    };
  }, [fetchServerVisitors, localStream]);

  // BroadcastChannel for intra-browser instant communication
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("drs_visitor_camera_network");
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === "VISITOR_ANNOUNCE" || type === "VISITOR_HEARTBEAT") {
            if (payload && payload.id !== `visitor-self-${MY_DEVICE_ID}`) {
              setVisitors((prev) => {
                const idx = prev.findIndex((v) => v.id === payload.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], ...payload, lastSeen: Date.now() };
                  return updated;
                }
                return [payload, ...prev];
              });
            }
          } else if (type === "VISITOR_LEAVE" && payload?.visitorId) {
            setVisitors((prev) => prev.filter((v) => v.id !== payload.visitorId));
          }
        };
      }
    } catch {}

    return () => {
      if (channel) channel.close();
    };
  }, []);

  // Frame Capture and Server Streaming Loop
  const startFrameStreaming = useCallback((stream: MediaStream, selfId: string) => {
    // Create hidden video element if needed
    if (!hiddenVideoRef.current) {
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.display = "none";
      document.body.appendChild(video);
      hiddenVideoRef.current = video;
    }

    if (!hiddenCanvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      hiddenCanvasRef.current = canvas;
    }

    const video = hiddenVideoRef.current;
    const canvas = hiddenCanvasRef.current;
    video.srcObject = stream;
    video.play().catch(() => {});

    // Clear any previous interval
    if (frameCaptureIntervalRef.current) {
      clearInterval(frameCaptureIntervalRef.current);
    }

    let isSending = false;

    // Send compressed frame every 90ms (~11 FPS)
    frameCaptureIntervalRef.current = window.setInterval(async () => {
      if (!isBroadcastingRef.current || !video || video.readyState < 2 || !canvas) return;
      if (isSending) return; // Prevent network backlog

      try {
        isSending = true;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Frame = canvas.toDataURL("image/jpeg", 0.55);

          await fetch(`/api/visitors/${encodeURIComponent(selfId)}/frame`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frame: base64Frame }),
          }).catch(() => {});
        }
      } catch {
      } finally {
        isSending = false;
      }
    }, 90);
  }, []);

  const stopFrameStreaming = useCallback(() => {
    if (frameCaptureIntervalRef.current) {
      clearInterval(frameCaptureIntervalRef.current);
      frameCaptureIntervalRef.current = null;
    }
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = null;
      if (hiddenVideoRef.current.parentNode) {
        hiddenVideoRef.current.parentNode.removeChild(hiddenVideoRef.current);
      }
      hiddenVideoRef.current = null;
    }
  }, []);

  // Start / Stop Broadcasting Local Camera
  const startBroadcasting = useCallback(async (requestedFacingMode?: "user" | "environment") => {
    setBroadcastError(null);
    const targetFacing = requestedFacingMode || facingMode;
    try {
      // Stop previous stream if switching
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream | null = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: targetFacing,
            },
            audio: false,
          });
        } catch {
          // Retry with loose constraints if strict fails
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (!stream) {
        throw new Error("Could not access camera device");
      }

      setLocalStream(stream);
      setIsBroadcasting(true);
      if (requestedFacingMode) setFacingMode(requestedFacingMode);

      const selfId = `visitor-self-${MY_DEVICE_ID}`;
      const selfNode: VisitorCameraNode = {
        id: selfId,
        visitorId: `DEV-${MY_DEVICE_ID.toUpperCase().slice(-6)}`,
        visitorName: `${currentUsername} (${detectDeviceLabel()})`,
        visitorRole: "Active Mobile Operator",
        visitorLocation: "Live Remote Stream",
        resolution: "1080p 60FPS",
        fov: targetFacing === "environment" ? "110° Ultra-Wide" : "84° Wide Optical",
        status: "ONLINE",
        sensorSpec: "Direct WebRTC Real-Time Camera Mesh",
        latencyMs: 14,
        battery: 100,
        isSelf: true,
        isRealDevice: true,
        streamType: "live-stream",
        stream: stream,
        lastSeen: Date.now(),
        hasLiveFrame: true,
      };

      // Add self node to local state
      setVisitors((prev) => [selfNode, ...prev.filter((v) => v.id !== selfId)]);

      // Register with backend server
      fetch("/api/visitors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selfNode),
      }).catch(() => {});

      // Announce on BroadcastChannel
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: "VISITOR_ANNOUNCE",
            payload: selfNode,
          });
        } catch {}
      }

      // Start frame streaming to server so ALL other physical devices see it
      startFrameStreaming(stream, selfId);
    } catch (err: any) {
      console.warn("Could not capture camera for visitor broadcast:", err);
      setBroadcastError("Camera access was denied or is currently in use.");
      setIsBroadcasting(false);
    }
  }, [facingMode, localStream, currentUsername, startFrameStreaming]);

  const stopBroadcasting = useCallback(() => {
    setIsBroadcasting(false);
    stopFrameStreaming();

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    const selfId = `visitor-self-${MY_DEVICE_ID}`;
    setVisitors((prev) => prev.filter((v) => v.id !== selfId));

    // Notify backend
    fetch("/api/visitors/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selfId }),
    }).catch(() => {});

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: "VISITOR_LEAVE",
          payload: { visitorId: selfId },
        });
      } catch {}
    }
  }, [localStream, stopFrameStreaming]);

  const toggleBroadcasting = useCallback(() => {
    if (isBroadcasting) {
      stopBroadcasting();
    } else {
      startBroadcasting();
    }
  }, [isBroadcasting, startBroadcasting, stopBroadcasting]);

  const switchCameraFacing = useCallback(() => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    if (isBroadcasting) {
      startBroadcasting(nextFacing);
    }
  }, [facingMode, isBroadcasting, startBroadcasting]);

  // Periodic heartbeat while broadcasting
  useEffect(() => {
    if (!isBroadcasting) return;

    const selfId = `visitor-self-${MY_DEVICE_ID}`;
    const interval = setInterval(() => {
      fetch("/api/visitors/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selfId,
          latencyMs: Math.floor(Math.random() * 8) + 12,
          battery: 98,
        }),
      }).catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [isBroadcasting]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopFrameStreaming();
      if (isBroadcastingRef.current) {
        const selfId = `visitor-self-${MY_DEVICE_ID}`;
        fetch("/api/visitors/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selfId }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [stopFrameStreaming]);

  // Convert VisitorCameraNode[] to standard CameraSourceInfo[]
  const visitorSources: CameraSourceInfo[] = visitors.map((v) => ({
    id: v.id,
    label: v.isSelf ? `My Camera • ${v.visitorName}` : `Visitor • ${v.visitorName}`,
    shortLabel: v.visitorName.length > 18 ? `${v.visitorName.slice(0, 17)}…` : v.visitorName.toUpperCase(),
    lensType: "visitor-camera",
    lensName: v.visitorRole,
    resolution: v.resolution,
    fov: v.fov,
    status: v.status,
    sensorSpec: `${v.sensorSpec} • ${v.latencyMs}ms Mesh`,
    visitorId: v.visitorId,
    visitorName: v.visitorName,
    visitorRole: v.visitorRole,
    visitorLocation: v.visitorLocation,
    visitorLatency: v.latencyMs,
    visitorBattery: v.battery,
    isSelf: v.isSelf,
    isRealDevice: v.isRealDevice,
    hasLiveFrame: v.hasLiveFrame,
    stream: v.stream || undefined,
  }));

  const realDeviceCount = visitors.filter((v) => v.isRealDevice && v.status === "ONLINE").length;

  return {
    visitors,
    visitorSources,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
    toggleBroadcasting,
    switchCameraFacing,
    facingMode,
    localStream,
    broadcastError,
    activeVisitorCount: visitors.filter((v) => v.status === "ONLINE").length,
    realDeviceCount,
    myDeviceId: MY_DEVICE_ID,
  };
}
