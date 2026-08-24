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
  isLiveP2P: boolean;
  streamType: "live-stream" | "tactical-bodycam" | "helmet-cam" | "mobile-feed";
  stream?: MediaStream | null;
  lastSeen: number;
}

// Preset active Tactical Field Visitors (Remote Operators & Field Scouts)
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
    isLiveP2P: true,
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
    isLiveP2P: true,
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
    isLiveP2P: true,
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
    isLiveP2P: true,
    streamType: "mobile-feed",
    lastSeen: Date.now(),
  },
];

// Persistent Session ID for this tab instance
const TAB_CLIENT_ID = `client_${Math.random().toString(36).substring(2, 9)}`;

export function useVisitorCameras(currentUsername: string = "Operator") {
  const [visitors, setVisitors] = useState<VisitorCameraNode[]>(() => {
    try {
      const saved = localStorage.getItem("drs_visitor_network_nodes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return DEFAULT_TACTICAL_VISITORS;
  });

  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`drs_broadcast_active_${TAB_CLIENT_ID}`) === "true";
    } catch (_) {
      return false;
    }
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for cross-tab & cross-window visitor mesh
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("drs_visitor_camera_network");
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (!type) return;

          if (type === "VISITOR_ANNOUNCE" || type === "VISITOR_HEARTBEAT") {
            const incomingNode: VisitorCameraNode = payload;
            if (incomingNode && incomingNode.id !== `visitor-self-${TAB_CLIENT_ID}`) {
              setVisitors((prev) => {
                const existingIdx = prev.findIndex((v) => v.id === incomingNode.id);
                if (existingIdx >= 0) {
                  const updated = [...prev];
                  updated[existingIdx] = {
                    ...updated[existingIdx],
                    ...incomingNode,
                    lastSeen: Date.now(),
                    status: "ONLINE",
                  };
                  return updated;
                } else {
                  return [...prev, { ...incomingNode, lastSeen: Date.now(), status: "ONLINE" }];
                }
              });
            }
          } else if (type === "VISITOR_LEAVE") {
            const { visitorId } = payload || {};
            if (visitorId) {
              setVisitors((prev) => prev.filter((v) => v.id !== visitorId));
            }
          }
        };

        // Query active nodes
        channel.postMessage({ type: "QUERY_VISITORS", payload: { senderId: TAB_CLIENT_ID } });
      }
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }

    return () => {
      if (channel) {
        try {
          channel.postMessage({
            type: "VISITOR_LEAVE",
            payload: { visitorId: `visitor-self-${TAB_CLIENT_ID}` },
          });
          channel.close();
        } catch (_) {}
      }
    };
  }, []);

  // Periodic heartbeat & latency oscillation for realism
  useEffect(() => {
    const interval = setInterval(() => {
      setVisitors((prev) =>
        prev.map((v) => {
          if (v.isSelf) return v;
          // Random slight realistic network latency jitter
          const latencyDelta = Math.floor(Math.random() * 5) - 2;
          const newLatency = Math.max(12, Math.min(65, v.latencyMs + latencyDelta));
          return {
            ...v,
            latencyMs: newLatency,
          };
        })
      );

      // If broadcasting, broadcast heartbeat
      if (isBroadcasting && broadcastChannelRef.current) {
        const selfNode: VisitorCameraNode = {
          id: `visitor-self-${TAB_CLIENT_ID}`,
          visitorId: `VIS-${TAB_CLIENT_ID.toUpperCase()}`,
          visitorName: `${currentUsername} (Live Broadcast)`,
          visitorRole: "Active Command Operator",
          visitorLocation: "Tactical Ops Console",
          resolution: "1080p 60FPS",
          fov: "84° Wide",
          status: "ONLINE",
          sensorSpec: "Direct Hardware WebRTC Camera Stream",
          latencyMs: 14,
          battery: 100,
          isSelf: true,
          isLiveP2P: true,
          streamType: "live-stream",
          lastSeen: Date.now(),
        };

        try {
          broadcastChannelRef.current.postMessage({
            type: "VISITOR_HEARTBEAT",
            payload: selfNode,
          });
        } catch (_) {}
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isBroadcasting, currentUsername]);

  // Start / Stop Broadcasting Local Camera
  const startBroadcasting = useCallback(async () => {
    setBroadcastError(null);
    try {
      let stream = localStream;
      if (!stream) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: false,
          });
          setLocalStream(stream);
        }
      }

      setIsBroadcasting(true);
      try {
        localStorage.setItem(`drs_broadcast_active_${TAB_CLIENT_ID}`, "true");
      } catch (_) {}

      const selfNode: VisitorCameraNode = {
        id: `visitor-self-${TAB_CLIENT_ID}`,
        visitorId: `VIS-${TAB_CLIENT_ID.toUpperCase()}`,
        visitorName: `${currentUsername} (My Live Broadcast)`,
        visitorRole: "Active Command Operator",
        visitorLocation: "Tactical Ops Station",
        resolution: "1080p 60FPS",
        fov: "84° Wide Optical",
        status: "ONLINE",
        sensorSpec: "Direct WebRTC Hardware Optical Feed",
        latencyMs: 12,
        battery: 100,
        isSelf: true,
        isLiveP2P: true,
        streamType: "live-stream",
        stream: stream,
        lastSeen: Date.now(),
      };

      // Add self node to local list
      setVisitors((prev) => {
        const filtered = prev.filter((v) => v.id !== selfNode.id);
        return [selfNode, ...filtered];
      });

      // Broadcast announcement
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "VISITOR_ANNOUNCE",
          payload: selfNode,
        });
      }
    } catch (err: any) {
      console.warn("Could not capture webcam for visitor broadcast:", err);
      // Fallback: Start simulated tactical broadcast node if camera permission is denied or busy
      setIsBroadcasting(true);
      const fallbackNode: VisitorCameraNode = {
        id: `visitor-self-${TAB_CLIENT_ID}`,
        visitorId: `VIS-${TAB_CLIENT_ID.toUpperCase()}`,
        visitorName: `${currentUsername} (Field Broadcast)`,
        visitorRole: "Active Field Operator",
        visitorLocation: "Mobile Command Unit",
        resolution: "1080p 60FPS",
        fov: "110° Tactical",
        status: "ONLINE",
        sensorSpec: "Simulated Tactical Optical Broadcast Link",
        latencyMs: 15,
        battery: 98,
        isSelf: true,
        isLiveP2P: true,
        streamType: "tactical-bodycam",
        lastSeen: Date.now(),
      };

      setVisitors((prev) => {
        const filtered = prev.filter((v) => v.id !== fallbackNode.id);
        return [fallbackNode, ...filtered];
      });

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "VISITOR_ANNOUNCE",
          payload: fallbackNode,
        });
      }
    }
  }, [localStream, currentUsername]);

  const stopBroadcasting = useCallback(() => {
    setIsBroadcasting(false);
    try {
      localStorage.removeItem(`drs_broadcast_active_${TAB_CLIENT_ID}`);
    } catch (_) {}

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    setVisitors((prev) => prev.filter((v) => v.id !== `visitor-self-${TAB_CLIENT_ID}`));

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: "VISITOR_LEAVE",
          payload: { visitorId: `visitor-self-${TAB_CLIENT_ID}` },
        });
      } catch (_) {}
    }
  }, [localStream]);

  const toggleBroadcasting = useCallback(() => {
    if (isBroadcasting) {
      stopBroadcasting();
    } else {
      startBroadcasting();
    }
  }, [isBroadcasting, startBroadcasting, stopBroadcasting]);

  // Convert VisitorCameraNode[] to standard CameraSourceInfo[] for camera windows & selectors
  const visitorSources: CameraSourceInfo[] = visitors.map((v) => ({
    id: v.id,
    label: `Visitor • ${v.visitorName}`,
    shortLabel: v.visitorName.length > 16 ? `${v.visitorName.slice(0, 15)}…` : v.visitorName.toUpperCase(),
    lensType: "visitor-camera",
    lensName: v.visitorRole,
    resolution: v.resolution,
    fov: v.fov,
    status: v.status,
    sensorSpec: `${v.sensorSpec} • ${v.latencyMs}ms P2P`,
    visitorId: v.visitorId,
    visitorName: v.visitorName,
    visitorRole: v.visitorRole,
    visitorLocation: v.visitorLocation,
    visitorLatency: v.latencyMs,
    visitorBattery: v.battery,
    isSelf: v.isSelf,
    stream: v.stream || undefined,
  }));

  return {
    visitors,
    visitorSources,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
    toggleBroadcasting,
    localStream,
    broadcastError,
    activeVisitorCount: visitors.filter((v) => v.status === "ONLINE").length,
  };
}
