import { Drone } from "../../types";

export type LensType =
  | "rgb-gimbal"
  | "thermal-flir"
  | "belly-downward"
  | "fpv-nose"
  | "wide-360"
  | "lidar-pointcloud"
  | "device-webcam"
  | "visitor-camera"
  | "ground-cctv";

export type VisionMode = "normal" | "nvg" | "thermal" | "mono";

export type CameraLayoutMode = "1x1" | "1x2" | "2x2" | "1+3" | "3x2" | "3x3";

export interface CameraSourceInfo {
  id: string; // e.g. "DRN-01-rgb-gimbal" or "ground-dock" or "device-webcam" or "visitor-field-01"
  deviceId?: string; // Optional physical WebRTC deviceId
  label: string;
  shortLabel: string;
  droneId?: string;
  droneName?: string;
  lensType: LensType;
  lensName: string;
  resolution: string;
  fov: string;
  status: "ONLINE" | "STANDBY" | "OFFLINE";
  sensorSpec: string;
  visitorId?: string;
  visitorName?: string;
  visitorRole?: string;
  visitorLocation?: string;
  visitorLatency?: number;
  visitorBattery?: number;
  isSelf?: boolean;
  stream?: MediaStream;
}

export interface WindowSlotConfig {
  slotId: string;
  cameraSourceId: string;
  visionMode: VisionMode;
  zoom: 1 | 2 | 4;
  showAiBoxes: boolean;
  isPtzOpen: boolean;
  ptz: { pan: number; tilt: number };
  isMuted: boolean;
}

// Built-in fixed / auxiliary cameras (e.g. Ground Station Dock, Security Mast, User Device)
export const AUXILIARY_CAMERAS: CameraSourceInfo[] = [
  {
    id: "device-webcam",
    label: "Operator Live Device Webcam",
    shortLabel: "OPERATOR CAM",
    lensType: "device-webcam",
    lensName: "Local Sensor",
    resolution: "1080p 60FPS",
    fov: "84° Wide",
    status: "ONLINE",
    sensorSpec: "Direct WebRTC Optical Feed",
  },
  {
    id: "ground-dock-01",
    label: "Base Station Hangar & Launchpad Cam",
    shortLabel: "HQ DOCK CAM",
    lensType: "ground-cctv",
    lensName: "Dock Cam 01",
    resolution: "4K 30FPS",
    fov: "110° Static",
    status: "ONLINE",
    sensorSpec: "Fixed 8MP Wide Optical",
  },
  {
    id: "ground-mast-perimeter",
    label: "Sector A Perimeter Security Mast",
    shortLabel: "MAST NORTH",
    lensType: "ground-cctv",
    lensName: "Mast Cam 02",
    resolution: "1440p 60FPS",
    fov: "90° PTZ",
    status: "ONLINE",
    sensorSpec: "Elevated 30m Thermal/Optical",
  },
];

// Generate all available camera sources for the current drones list and detected hardware devices
export function getAvailableCameraSources(
  drones: Drone[],
  hardwareDevices?: MediaDeviceInfo[],
  onlyAvailable: boolean = false,
  visitorSources?: CameraSourceInfo[]
): CameraSourceInfo[] {
  const sources: CameraSourceInfo[] = [];

  // Add visitor and field operator cameras first or alongside
  if (visitorSources && visitorSources.length > 0) {
    sources.push(...visitorSources);
  }

  // Add all drone-mounted cameras
  drones.forEach((drone) => {
    const isDroneAvailable =
      drone.status === "Online" &&
      drone.cameraStatus === "Active";

    const cameraStatus: "ONLINE" | "STANDBY" | "OFFLINE" = isDroneAvailable
      ? "ONLINE"
      : drone.status === "Offline" || drone.cameraStatus === "Error" || drone.cameraStatus === "Inactive"
      ? "OFFLINE"
      : "STANDBY";

    // 1. Forward 4K RGB Gimbal
    sources.push({
      id: `${drone.id}-rgb-gimbal`,
      label: `${drone.name} • 4K RGB Main Gimbal`,
      shortLabel: `${drone.name} FWD`,
      droneId: drone.id,
      droneName: drone.name,
      lensType: "rgb-gimbal",
      lensName: "4K RGB Gimbal",
      resolution: "4K UHD 60FPS",
      fov: "84° Zoom",
      status: cameraStatus,
      sensorSpec: "1/1.3\" CMOS 48MP F/1.7",
    });

    // 2. FLIR Thermal Radiometric
    sources.push({
      id: `${drone.id}-thermal-flir`,
      label: `${drone.name} • FLIR Radiometric Thermal`,
      shortLabel: `${drone.name} FLIR`,
      droneId: drone.id,
      droneName: drone.name,
      lensType: "thermal-flir",
      lensName: "FLIR Thermal IR",
      resolution: "640x512 30Hz",
      fov: "45° Fixed",
      status: cameraStatus,
      sensorSpec: "LWIR 640x512 <30mK NETD",
    });

    // 3. Downward Belly Precision Cam
    sources.push({
      id: `${drone.id}-belly-downward`,
      label: `${drone.name} • Downward Precision Belly Cam`,
      shortLabel: `${drone.name} BELLY`,
      droneId: drone.id,
      droneName: drone.name,
      lensType: "belly-downward",
      lensName: "Downward Optical Flow",
      resolution: "1080p 60FPS",
      fov: "95° Nadir",
      status: cameraStatus,
      sensorSpec: "Nadir Laser/Optical Landing Sensor",
    });

    // 4. FPV Pilot Nose Cam
    sources.push({
      id: `${drone.id}-fpv-nose`,
      label: `${drone.name} • FPV Low-Latency Pilot Cam`,
      shortLabel: `${drone.name} FPV`,
      droneId: drone.id,
      droneName: drone.name,
      lensType: "fpv-nose",
      lensName: "FPV Cockpit Nose",
      resolution: "1080p 120FPS",
      fov: "155° Ultrawide",
      status: cameraStatus,
      sensorSpec: "Ultra-Low Latency 12ms RF",
    });

    // 5. 360° Wide Surveillance Lens
    sources.push({
      id: `${drone.id}-wide-360`,
      label: `${drone.name} • 360° Sector Panoramic Cam`,
      shortLabel: `${drone.name} 360°`,
      droneId: drone.id,
      droneName: drone.name,
      lensType: "wide-360",
      lensName: "360° Panoramic",
      resolution: "4K 30FPS",
      fov: "180° Panoramic",
      status: cameraStatus,
      sensorSpec: "Dual Fisheye Panoramic Rig",
    });

    // 6. LiDAR Point Cloud Mesh
    sources.push({
      id: `${drone.id}-lidar-pointcloud`,
      label: `${drone.name} • LiDAR 3D Depth Matrix`,
      shortLabel: `${drone.name} LiDAR`,
      droneId: drone.id,
      droneName: drone.name,
      lensType: "lidar-pointcloud",
      lensName: "3D LiDAR Scanner",
      resolution: "240k pts/sec",
      fov: "360°x40°",
      status: cameraStatus,
      sensorSpec: "Solid-State LiDAR Array",
    });
  });

  // Physical Webcams / Connected Video Devices
  if (hardwareDevices && hardwareDevices.length > 0) {
    hardwareDevices.forEach((dev, idx) => {
      const devName = dev.label || `Device Camera ${idx + 1}`;
      sources.push({
        id: dev.deviceId ? `device-webcam-${dev.deviceId}` : `device-webcam-${idx}`,
        deviceId: dev.deviceId,
        label: `Local • ${devName}`,
        shortLabel: devName.length > 15 ? `${devName.slice(0, 14)}…` : devName.toUpperCase(),
        lensType: "device-webcam",
        lensName: devName,
        resolution: "1080p 60FPS",
        fov: "84° Wide",
        status: "ONLINE",
        sensorSpec: "Direct Hardware WebRTC Feed",
      });
    });
  } else {
    // Default Operator Cam entry
    sources.push({
      id: "device-webcam",
      label: "Operator Live Device Webcam",
      shortLabel: "OPERATOR CAM",
      lensType: "device-webcam",
      lensName: "Local Sensor",
      resolution: "1080p 60FPS",
      fov: "84° Wide",
      status: "ONLINE",
      sensorSpec: "Direct WebRTC Optical Feed",
    });
  }

  // Base Station and Perimeter CCTVs
  sources.push(
    {
      id: "ground-dock-01",
      label: "Base Station Hangar & Launchpad Cam",
      shortLabel: "HQ DOCK CAM",
      lensType: "ground-cctv",
      lensName: "Dock Cam 01",
      resolution: "4K 30FPS",
      fov: "110° Static",
      status: "ONLINE",
      sensorSpec: "Fixed 8MP Wide Optical",
    },
    {
      id: "ground-mast-perimeter",
      label: "Sector A Perimeter Security Mast",
      shortLabel: "MAST NORTH",
      lensType: "ground-cctv",
      lensName: "Mast Cam 02",
      resolution: "1440p 60FPS",
      fov: "90° PTZ",
      status: "ONLINE",
      sensorSpec: "Elevated 30m Thermal/Optical",
    }
  );

  if (onlyAvailable) {
    return sources.filter((s) => s.status === "ONLINE");
  }

  return sources;
}
