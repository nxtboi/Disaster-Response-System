# DRS — Autonomous Drone Response & Tactical Surveillance System

[![React 19](https://img.shields.io/badge/React-19.0-blue.svg?logo=react&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript&style=flat-square)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite&style=flat-square)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC.svg?logo=tailwind-css&style=flat-square)](https://tailwindcss.com/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg?style=flat-square)](LICENSE)

**DRS (Drone Response System)** is an enterprise-grade, real-time autonomous UAV fleet management and multi-spectral surveillance command platform. Engineered for tactical perimeter defense, search & rescue operations, and aerial reconnaissance, DRS provides operators with high-density telemetry, multi-sensor live streams, interactive waypoint mission planning, and centralized fleet diagnostics.

---

## 🌟 Key Capabilities & Features

### 1. Tactical Command Center
- **Dual Map & Radar Engines**: Seamlessly switch between vector-grid tactical radar, high-contrast Leaflet tactical map, and satellite telemetry overlays.
- **Real-Time UAV Tracking**: Live tracking of multiple deployed units with real-time heading compass, altitude, airspeed, and distance-from-operator indicators.
- **Flight Mode Control**: Direct command execution for `Autonomous`, `Manual Flight`, `Hover / Loiter`, and `Return to Home (RTH)`.

### 2. Multi-Spectral 4-Channel Live Monitoring
- **RGB 4K Optical Gimbal**: High-definition daylight visual feed with zoom and reticle overlays.
- **FLIR LWIR Thermal Infrared**: Color-mapped heat signature detection with hotspot tracking and temperature differentiation.
- **360° LiDAR Depth Visualizer**: Real-time point-cloud obstacle scanning and elevation profile mapping.
- **Acoustic & Voice Spectrum Feed**: Real-time audio frequency telemetry and comms link analysis.

### 3. Explore System — Centralized Fleet Registry
- **Standalone Fleet Registry**: Dedicated high-density page providing comprehensive visibility into all deployed and docking UAV assets.
- **Aggregate Fleet Statistics**: Instant metrics for total units, active in-flight percentage, pad standby status, fast-charging DC docks, and average LiPo battery health.
- **Dual View Modes**: Switch effortlessly between a dense, sortable data table and modular tactical asset cards.
- **Search & Multi-Parameter Filter**: Instant filtering by unit callsign/ID, connection status (`Online`, `Standby`, `Charging`), or flight mode.

### 4. Autonomous Mission & Waypoint Planner
- **Interactive Waypoint Plotting**: Click-to-add navigational waypoints with custom target altitudes and flight speeds.
- **Pre-Configured Mission Profiles**: One-click dispatch for **Perimeter Patrol**, **High-Altitude Recon**, and **Search & Rescue Grid**.
- **Automated Fail-Safes**: Low-battery auto-RTH triggers, geo-fence breach protection, and satellite signal loss protocols.

### 5. Hardware Interfacing & Diagnostic Telemetry
- **Hardware Telemetry Link**: Interface simulator for MAVLink, Serial COM, and Wi-Fi UDP packet streams.
- **Battery Cycle Telemetry**: Multi-cell LiPo voltage metrics, discharge curves, and remaining endurance estimations.
- **System Alerts & Notifications**: Real-time diagnostic toast alerts for motor current spikes, obstacle proximity, and GPS lock degradations.

---

## 🛠️ Technology Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/) + `@tailwindcss/vite` |
| **Animations** | [Motion (Framer Motion)](https://motion.dev/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Mapping & Geospatial** | [Leaflet](https://leafletjs.com/) + Canvas 2D Vector Radar |
| **Charts & Metrics** | [Recharts](https://recharts.org/) |

---

## 📂 Project Structure

```text
├── src/
│   ├── assets/              # Static imagery, drone renders, and branding assets
│   ├── components/
│   │   ├── camera/          # Multi-spectral camera sub-components
│   │   ├── monitoring/      # Audio waveform and telemetry sub-panels
│   │   ├── AlertPanel.tsx   # System alarms and diagnostic log stream
│   │   ├── BatteryStatus.tsx# Power telemetry & LiPo cycle visualization
│   │   ├── CameraFeed.tsx   # Primary multi-spectral video player
│   │   ├── Dashboard.tsx    # Command Center layout container
│   │   ├── ExploreSystemPage.tsx # Fleet database & aggregate metrics registry
│   │   ├── FreeTacticalMap.tsx   # Canvas-based vector radar map
│   │   ├── HardwareConnection.tsx# MAVLink & Serial hardware interface modal
│   │   ├── Header.tsx       # Tactical HUD top bar with quick actions
│   │   ├── LandingPage.tsx  # Hero landing with fast-launch shortcuts
│   │   ├── LidarPanel.tsx   # LiDAR point cloud scanner display
│   │   ├── LiveMap.tsx      # Leaflet geospatial mapping module
│   │   ├── LiveMonitoring.tsx# 4-quadrant multi-spectral tactical wall
│   │   ├── LoginPage.tsx    # Secure access portal & operator authentication
│   │   ├── MainContent.tsx  # Dynamic view switcher for command center
│   │   ├── MissionPlanner.tsx # Autonomous route generation & execution
│   │   ├── Sidebar.tsx      # Tactical view navigation bar
│   │   ├── TacticalWaypointsPanel.tsx # Waypoint table & sequence editor
│   │   └── TelemetryPanel.tsx # Attitude, GPS satellite, & speed readouts
│   ├── data.ts              # Initial UAV fleet profiles and mission presets
│   ├── store.tsx            # Global state management & real-time telemetry loop
│   ├── types.ts             # TypeScript interfaces for drones, sensors, and waypoints
│   ├── App.tsx              # Main page routing & view state controller
│   └── main.tsx             # Application bootstrap & entry point
├── metadata.json            # AI Studio applet configuration & permissions
├── package.json             # NPM dependencies and operational scripts
├── tsconfig.json            # TypeScript compiler configuration
└── vite.config.ts           # Vite bundler & plugin pipeline configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun** / **yarn** / **pnpm**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nxtboi/DRS.git
   cd DRS
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

### Production Build

To build the static production bundle:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 🔐 Operator Access & Testing

The application includes an integrated authentication gateway. For demonstration or development environments, click **Quick Fill Demo Credentials** or input the following:

- **Operator ID**: `DRS-TACTICAL-01`
- **Security PIN**: `••••` (Any 4-digit code)

---

## 🎮 Workflow & Operation Guide

1. **Launch Experience**:
   - Access the **Landing Page** to choose between **Launch System** (Command Center) or **Explore System** (Fleet Database).
2. **Explore System**:
   - Search across active drones by callsign (`DRN-01 Alpha`, `DRN-02 Falcon`, etc.).
   - Switch between **Table View** and **Cards View**.
   - Dispatch immediate status changes (`Hover`, `Autonomous`, `Return to Home`).
   - Click **MONITOR** on any UAV to enter direct multi-spectral surveillance for that unit.
3. **Command Center Operations**:
   - **Tactical Map**: Monitor real-time coordinates, toggle between Canvas radar and map layers.
   - **Live Monitoring**: Inspect real-time 4K RGB, Thermal FLIR, LiDAR scans, and Voice frequency feeds simultaneously.
   - **Mission Planner**: Select patrol routes or generate custom waypoints.
   - **Hardware Connect**: Verify physical or simulated MAVLink telemetry links.

---

## 📄 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
