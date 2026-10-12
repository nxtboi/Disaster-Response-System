/**
 * Pixhawk Flight Controller Hardware Manager
 * Manages Web Serial API connection, MAVLink parsing, compass, GPS, telemetry, and simulation.
 */

import { MavlinkParser, DecodedMavPacket, MavMsgId } from "./mavlink";

export interface PixhawkGPS {
  lat: number;
  lng: number;
  altMSL: number;
  altAGL: number;
  fixType: string;
  fixTypeCode: number;
  satCount: number;
  hdop: number;
  vdop: number;
  groundspeedKmh: number;
  headingDeg: number;
  lastFixTime: number;
}

export interface PixhawkCompass {
  headingDeg: number; // 0 - 360
  pitchDeg: number;   // -90 to +90 (nose up/down)
  rollDeg: number;    // -180 to +180 (bank left/right)
  yawDeg: number;
  xMag: number;       // milligauss
  yMag: number;
  zMag: number;
  magMagnitude: number;
  isCalibrated: boolean;
}

export interface PixhawkTelemetry {
  autopilot: string;
  vehicleType: string;
  isArmed: boolean;
  flightMode: string;
  batteryVolts: number;
  batteryAmps: number;
  batteryPercent: number;
  airspeedKmh: number;
  groundspeedKmh: number;
  climbRateMs: number;
  throttlePercent: number;
  baroAltM: number;
  packetRateHz: number;
  cpuLoadPercent: number;
}

export interface PixhawkSerialState {
  connected: boolean;
  isSimulated: boolean;
  baudRate: number;
  portInfo: string;
  rxPackets: number;
  txPackets: number;
  rxBytes: number;
  lastPacketTime: number;
  connectionStartTime: number | null;
}

export interface PixhawkLogEntry {
  id: string;
  time: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "ERROR" | "COMMAND";
  text: string;
}

export interface PixhawkPacketEntry {
  id: string;
  time: string;
  name: string;
  msgId: number;
  summary: string;
  hex: string;
}

export interface PixhawkState {
  serial: PixhawkSerialState;
  gps: PixhawkGPS;
  compass: PixhawkCompass;
  telemetry: PixhawkTelemetry;
  statusLogs: PixhawkLogEntry[];
  recentPackets: PixhawkPacketEntry[];
}

export const INITIAL_PIXHAWK_STATE: PixhawkState = {
  serial: {
    connected: false,
    isSimulated: false,
    baudRate: 115200,
    portInfo: "Pixhawk USB / Telemetry Radio",
    rxPackets: 0,
    txPackets: 0,
    rxBytes: 0,
    lastPacketTime: 0,
    connectionStartTime: null,
  },
  gps: {
    lat: 28.4595,
    lng: 77.0266,
    altMSL: 142.5,
    altAGL: 45.0,
    fixType: "3D FIX",
    fixTypeCode: 3,
    satCount: 16,
    hdop: 0.85,
    vdop: 1.12,
    groundspeedKmh: 34.2,
    headingDeg: 42,
    lastFixTime: Date.now(),
  },
  compass: {
    headingDeg: 42,
    pitchDeg: -2.4,
    rollDeg: 1.8,
    yawDeg: 42.0,
    xMag: 228,
    yMag: -145,
    zMag: 412,
    magMagnitude: 504,
    isCalibrated: true,
  },
  telemetry: {
    autopilot: "ArduPilot (ArduCopter 4.5.1)",
    vehicleType: "Quadrotor",
    isArmed: true,
    flightMode: "LOITER",
    batteryVolts: 15.8,
    batteryAmps: 18.4,
    batteryPercent: 88,
    airspeedKmh: 36.0,
    groundspeedKmh: 34.2,
    climbRateMs: 0.2,
    throttlePercent: 54,
    baroAltM: 45.2,
    packetRateHz: 10,
    cpuLoadPercent: 24,
  },
  statusLogs: [
    {
      id: "log-init-1",
      time: new Date().toLocaleTimeString(),
      severity: "INFO",
      text: "Pixhawk subsystem ready. Ready to open serial port.",
    },
  ],
  recentPackets: [],
};
