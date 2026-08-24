import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface VisitorNode {
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
  isSelf?: boolean;
  isRealDevice: boolean;
  streamType: "live-stream" | "tactical-bodycam" | "helmet-cam" | "mobile-feed";
  lastSeen: number;
  hasLiveFrame?: boolean;
}

// In-memory registry of active visitor camera nodes
const visitorNodes = new Map<string, VisitorNode>();
const visitorFrames = new Map<string, { frame: string; timestamp: number }>();
const sseClients = new Set<express.Response>();

// Preset field team scouts
const PRESET_TACTICAL_VISITORS: VisitorNode[] = [
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
    isRealDevice: false,
    streamType: "mobile-feed",
    lastSeen: Date.now(),
  },
];

// Initialize preset nodes
PRESET_TACTICAL_VISITORS.forEach((v) => {
  visitorNodes.set(v.id, { ...v, lastSeen: Date.now() });
});

function broadcastSSE(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Cleanup inactive real devices after 18 seconds without heartbeat
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, node] of visitorNodes.entries()) {
    if (node.isRealDevice && now - node.lastSeen > 18000) {
      visitorNodes.delete(id);
      visitorFrames.delete(id);
      changed = true;
    }
  }
  if (changed) {
    broadcastSSE({
      type: "VISITORS_UPDATE",
      visitors: Array.from(visitorNodes.values()),
    });
  }
}, 5000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // CORS headers for cross-origin preview/iframe support
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now(), activeVisitors: visitorNodes.size });
  });

  // SSE Stream for Real-time Visitor Discovery & Updates
  app.get("/api/visitors/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write(`data: ${JSON.stringify({ type: "INIT", visitors: Array.from(visitorNodes.values()) })}\n\n`);
    sseClients.add(res);

    const keepAliveTimer = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAliveTimer);
      sseClients.delete(res);
    });
  });

  // Get all active visitor nodes
  app.get("/api/visitors", (_req, res) => {
    res.json({
      success: true,
      visitors: Array.from(visitorNodes.values()).map((v) => ({
        ...v,
        hasLiveFrame: visitorFrames.has(v.id),
      })),
    });
  });

  // Register / Announce a new visitor device broadcasting its camera
  app.post("/api/visitors/register", (req, res) => {
    const node: VisitorNode = req.body;
    if (!node || !node.id) {
      return res.status(400).json({ error: "Missing visitor node payload or id" });
    }

    const updatedNode: VisitorNode = {
      ...node,
      isRealDevice: true,
      status: "ONLINE",
      lastSeen: Date.now(),
    };

    visitorNodes.set(node.id, updatedNode);
    broadcastSSE({
      type: "VISITOR_JOINED",
      node: updatedNode,
      visitors: Array.from(visitorNodes.values()),
    });

    res.json({ success: true, node: updatedNode });
  });

  // Heartbeat for keeping device camera stream online
  app.post("/api/visitors/heartbeat", (req, res) => {
    const { id, battery, latencyMs } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: "Missing node id" });
    }

    const existing = visitorNodes.get(id);
    if (existing) {
      existing.lastSeen = Date.now();
      existing.status = "ONLINE";
      if (typeof battery === "number") existing.battery = battery;
      if (typeof latencyMs === "number") existing.latencyMs = latencyMs;
      visitorNodes.set(id, existing);
    }

    res.json({ success: true, alive: !!existing });
  });

  // Upload a live video frame from the broadcasting device
  app.post("/api/visitors/:id/frame", (req, res) => {
    const { id } = req.params;
    const { frame } = req.body;
    if (!id || !frame) {
      return res.status(400).json({ error: "Missing id or frame data" });
    }

    visitorFrames.set(id, {
      frame,
      timestamp: Date.now(),
    });

    const existing = visitorNodes.get(id);
    if (existing) {
      existing.lastSeen = Date.now();
      existing.hasLiveFrame = true;
    }

    res.json({ success: true, timestamp: Date.now() });
  });

  // Retrieve the latest live frame for a visitor device
  app.get("/api/visitors/:id/frame", (req, res) => {
    const { id } = req.params;
    const frameData = visitorFrames.get(id);

    if (!frameData) {
      return res.status(404).json({ error: "No active live frame found for this device" });
    }

    res.json({
      success: true,
      frame: frameData.frame,
      timestamp: frameData.timestamp,
      ageMs: Date.now() - frameData.timestamp,
    });
  });

  // Device stops broadcasting or leaves
  app.post("/api/visitors/leave", (req, res) => {
    const { id } = req.body || {};
    if (id) {
      visitorNodes.delete(id);
      visitorFrames.delete(id);
      broadcastSSE({
        type: "VISITOR_LEFT",
        id,
        visitors: Array.from(visitorNodes.values()),
      });
    }
    res.json({ success: true });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DRS Tactical Mesh Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
