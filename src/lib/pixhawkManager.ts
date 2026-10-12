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

export interface KnownAutopilotHardware {
  usbVendorId: number;
  usbProductId?: number;
  manufacturer: string;
  deviceType: string;
}

export const KNOWN_PIXHAWK_DEVICES: KnownAutopilotHardware[] = [
  { usbVendorId: 0x26ac, manufacturer: "3DR / mRo", deviceType: "Pixhawk 1 / PX4 FMU" },
  { usbVendorId: 0x0483, manufacturer: "STMicroelectronics", deviceType: "Pixhawk Virtual COM / STM32 Bootloader" },
  { usbVendorId: 0x3162, manufacturer: "Holybro", deviceType: "Pixhawk 4 / 5X / 6X / 6C / Kakute" },
  { usbVendorId: 0x2dae, manufacturer: "CubePilot / Hex", deviceType: "Cube Black / Orange / Yellow / Purple" },
  { usbVendorId: 0x1209, manufacturer: "ArduPilot / Generic", deviceType: "ArduPilot ChibiOS / PX4 Autopilot" },
  { usbVendorId: 0x10c4, manufacturer: "Silicon Labs", deviceType: "CP210x Telemetry Radio (SiK 433/915MHz)" },
  { usbVendorId: 0x0403, manufacturer: "FTDI", deviceType: "FT232 / FTDI Telemetry Radio Bridge" },
  { usbVendorId: 0x1a86, manufacturer: "WCH", deviceType: "CH340 / CH341 Telemetry / Pixhawk Clone" },
  { usbVendorId: 0x067b, manufacturer: "Prolific", deviceType: "PL2303 Serial USB Adapter" },
  { usbVendorId: 0x303a, manufacturer: "Espressif", deviceType: "ESP32 MAVLink WiFi / USB Bridge" },
  { usbVendorId: 0x2e8a, manufacturer: "Raspberry Pi", deviceType: "RP2040 / Pico Flight Companion" },
  { usbVendorId: 0x2341, manufacturer: "Arduino", deviceType: "Arduino Autopilot / Mega 2560" },
];

export function getDeviceDescription(info: { usbVendorId?: number; usbProductId?: number }): string {
  if (!info.usbVendorId) return "Generic Serial / COM Port";
  const match = KNOWN_PIXHAWK_DEVICES.find((d) => d.usbVendorId === info.usbVendorId);
  const vidHex = `0x${info.usbVendorId.toString(16).toUpperCase().padStart(4, "0")}`;
  const pidHex = info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase().padStart(4, "0")}` : null;
  if (match) {
    return `${match.manufacturer} - ${match.deviceType} [VID ${vidHex}${pidHex ? ` : PID ${pidHex}` : ""}]`;
  }
  return `USB Serial Device [VID ${vidHex}${pidHex ? ` : PID ${pidHex}` : ""}]`;
}
