import React, { useState } from "react";
import { useDRS } from "../store";
import { DroneSelectorBar } from "./monitoring/DroneSelectorBar";
import { LiveVideoPanel, CameraLensId } from "./monitoring/LiveVideoPanel";
import { LidarSensorPanel } from "./monitoring/LidarSensorPanel";
import { ThermalCameraPanel } from "./monitoring/ThermalCameraPanel";
import { HumanDetectionPanel } from "./monitoring/HumanDetectionPanel";
import {
  Camera,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Grid,
  Radio,
  Activity,
  CheckCircle2,
  Zap,
  Shield,
  Clock,
  Compass,
  AlertTriangle,
} from "lucide-react";

export type FocusedPanelType = "video" | "lidar" | "thermal" | "human" | null;

export function LiveMonitoring() {
  const { drones, selectedDroneId, setSelectedDroneId, selectedDrone } = useDRS();

  // Active drone ID for this monitoring page
  const activeDroneId = selectedDroneId || drones[0]?.id || "DRN-01";
  const currentDrone = drones.find((d) => d.id === activeDroneId) || drones[0];

  const [selectedCameraId, setSelectedCameraId] = useState<CameraLensId>("rgb-gimbal");
  const [focusedPanel, setFocusedPanel] = useState<FocusedPanelType>(null);
  const [isMasterRecording, setIsMasterRecording] = useState<boolean>(true);
  const [snapshotAllToast, setSnapshotAllToast] = useState<boolean>(false);

  const handleSelectDrone = (droneId: string) => {
    setSelectedDroneId(droneId);
  };

  const handleSnapshotAll = () => {
    setSnapshotAllToast(true);
    setTimeout(() => setSnapshotAllToast(false), 3000);
  };

  const togglePanelMaximize = (panel: FocusedPanelType) => {
    if (focusedPanel === panel) {
      setFocusedPanel(null);
    } else {
      setFocusedPanel(panel);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden text-zinc-100">
      {/* 1. Drone & Camera Switcher Bar at the top */}
      <DroneSelectorBar
        drones={drones}
        selectedDroneId={activeDroneId}
        onSelectDrone={handleSelectDrone}
        selectedCameraId={selectedCameraId}
        onSelectCamera={setSelectedCameraId}
        isMasterRecording={isMasterRecording}
        onToggleMasterRecording={() => setIsMasterRecording(!isMasterRecording)}
        onSnapshotAll={handleSnapshotAll}
      />

      {/* Snapshot Toast Feedback */}
      {snapshotAllToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-cyan-500 text-black font-bold font-mono text-xs rounded-full shadow-2xl animate-bounce flex items-center gap-2">
          <Camera className="w-4 h-4" />
          <span>Synchronized 4-Sensor Snapshot Saved for {currentDrone.id}</span>
        </div>
      )}

      {/* 2. Main Sensor Suite Viewport (4-Quadrant or Focused Fullscreen) */}
      <div className="flex-1 p-3 overflow-hidden">
        {focusedPanel ? (
          // Single Focused Panel View
          <div className="w-full h-full">
            {focusedPanel === "video" && (
              <LiveVideoPanel
                drone={currentDrone}
                isMaximized={true}
                onToggleMaximize={() => togglePanelMaximize("video")}
                isMasterRecording={isMasterRecording}
                selectedCameraId={selectedCameraId}
                onSelectCamera={setSelectedCameraId}
              />
            )}
            {focusedPanel === "lidar" && (
              <LidarSensorPanel
                drone={currentDrone}
                isMaximized={true}
                onToggleMaximize={() => togglePanelMaximize("lidar")}
              />
            )}
            {focusedPanel === "thermal" && (
              <ThermalCameraPanel
                drone={currentDrone}
                isMaximized={true}
                onToggleMaximize={() => togglePanelMaximize("thermal")}
              />
            )}
            {focusedPanel === "human" && (
              <HumanDetectionPanel
                drone={currentDrone}
                isMaximized={true}
                onToggleMaximize={() => togglePanelMaximize("human")}
              />
            )}
          </div>
        ) : (
          // 4-Quadrant Sensor Grid Layout
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-3">
            {/* Quadrant 1: Live Video / Optical Feedback */}
            <div className="w-full h-full min-h-0 min-w-0">
              <LiveVideoPanel
                drone={currentDrone}
                isMaximized={false}
                onToggleMaximize={() => togglePanelMaximize("video")}
                isMasterRecording={isMasterRecording}
                selectedCameraId={selectedCameraId}
                onSelectCamera={setSelectedCameraId}
              />
            </div>

            {/* Quadrant 2: LiDAR 3D Feedback */}
            <div className="w-full h-full min-h-0 min-w-0">
              <LidarSensorPanel
                drone={currentDrone}
                isMaximized={false}
                onToggleMaximize={() => togglePanelMaximize("lidar")}
              />
            </div>

            {/* Quadrant 3: Thermal Camera Feedback */}
            <div className="w-full h-full min-h-0 min-w-0">
              <ThermalCameraPanel
                drone={currentDrone}
                isMaximized={false}
                onToggleMaximize={() => togglePanelMaximize("thermal")}
              />
            </div>

            {/* Quadrant 4: Human Detection Sensor's Data */}
            <div className="w-full h-full min-h-0 min-w-0">
              <HumanDetectionPanel
                drone={currentDrone}
                isMaximized={false}
                onToggleMaximize={() => togglePanelMaximize("human")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
