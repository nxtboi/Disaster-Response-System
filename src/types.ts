export type ConnectionStatus = "Online" | "Offline" | "Standby" | "Charging";

export interface DroneCoordinates {
  lat: number;
  lng: number;
}

export interface Telemetry {
  altitude: number; // in meters
  speed: number; // in km/h
  heading: number; // degrees
  verticalSpeed: number; // m/s
  horizontalSpeed: number; // m/s
  satelliteCount: number;
  distanceFromOperator: number; // in km
}

export interface Drone {
  id: string;
  name: string;
  status: ConnectionStatus;
  battery: number;
  gpsStatus: "Connected" | "Disconnected" | "Weak";
  cameraStatus: "Active" | "Inactive" | "Error";
  lidarStatus: "Active" | "Inactive" | "Scanning";
  flightMode: "Manual" | "Autonomous" | "Return to Home" | "Hover";
  coordinates: DroneCoordinates;
  homeCoordinates: DroneCoordinates;
  operatorCoordinates: DroneCoordinates;
  telemetry: Telemetry;
  path: DroneCoordinates[];
  missionActive: boolean;
  alerts: string[];
  isHardwareLinked?: boolean;
}

export type WaypointAction = "Fly-Through" | "Hover & Scan" | "Drop Payload" | "Reconnaissance" | "Orbit";

export interface TacticalWaypoint {
  id: string;
  index: number;
  name: string;
  coordinates: DroneCoordinates;
  altitude: number; // in meters
  speed?: number; // km/h
  action: WaypointAction;
  assignedDroneId?: string | null;
  createdAt: number;
}

