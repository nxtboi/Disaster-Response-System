import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { MavlinkParser, DecodedMavPacket, MavMsgId } from "./mavlink";
import {
  PixhawkState,
  INITIAL_PIXHAWK_STATE,
  PixhawkGPS,
  PixhawkCompass,
  PixhawkTelemetry,
  PixhawkSerialState,
  PixhawkLogEntry,
  PixhawkPacketEntry,
} from "./pixhawkManager";
import { useDRS } from "../store";

interface PixhawkContextType {
  pixhawk: PixhawkState;
  connectSerial: (baudRate?: number) => Promise<{ success: boolean; error?: string }>;
  disconnectSerial: () => Promise<void>;
  startSimulation: () => void;
  stopSimulation: () => void;
  toggleSimulation: () => void;
  sendCommand: (cmd: "REQUEST_STREAMS" | "ARM" | "DISARM" | "SET_MODE", param?: any) => Promise<boolean>;
  clearLogs: () => void;
  selectedBaud: number;
  setSelectedBaud: (baud: number) => void;
  syncSystemGpsToPixhawk: (centerMap?: boolean) => void;
}

const PixhawkContext = createContext<PixhawkContextType | undefined>(undefined);

export function PixhawkProvider({ children }: { children: ReactNode }) {
  const {
    drones,
    selectedDroneId,
    updateDroneTelemetry,
    userLocation,
    gpsSourceMode,
    setGpsFromPixhawk,
  } = useDRS();

  const [pixhawk, setPixhawk] = useState<PixhawkState>(INITIAL_PIXHAWK_STATE);
  const [selectedBaud, setSelectedBaud] = useState<number>(115200);

  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const writerRef = useRef<any>(null);
  const isReadingRef = useRef<boolean>(false);
  const parserRef = useRef<MavlinkParser>(new MavlinkParser());

  // Simulation timer ref
  const simTimerRef = useRef<any>(null);
  const simAngleRef = useRef<number>(0);

  // Packet rate calculation
  const packetCountInSecRef = useRef<number>(0);
  const lastSecCheckRef = useRef<number>(Date.now());

  const addLog = useCallback((text: string, severity: "INFO" | "WARNING" | "CRITICAL" | "ERROR" | "COMMAND" = "INFO") => {
    setPixhawk((prev) => ({
      ...prev,
      statusLogs: [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          time: new Date().toLocaleTimeString(),
          severity,
          text,
        },
        ...prev.statusLogs.slice(0, 99),
      ],
    }));
  }, []);

  const addPacketEntry = useCallback((packet: DecodedMavPacket) => {
    let summary = "";
    if (packet.msgId === MavMsgId.GLOBAL_POSITION_INT) {
      summary = `Lat: ${packet.payload.lat?.toFixed(5)} Lng: ${packet.payload.lng?.toFixed(5)} Alt: ${packet.payload.altAGL}m Hdg: ${packet.payload.heading}°`;
    } else if (packet.msgId === MavMsgId.ATTITUDE) {
      summary = `Roll: ${packet.payload.rollDeg}° Pitch: ${packet.payload.pitchDeg}° Yaw: ${packet.payload.yawDeg}°`;
    } else if (packet.msgId === MavMsgId.GPS_RAW_INT) {
      summary = `${packet.payload.fixName} Sats: ${packet.payload.satellitesVisible} HDOP: ${packet.payload.hdop}`;
    } else if (packet.msgId === MavMsgId.VFR_HUD) {
      summary = `Spd: ${packet.payload.groundspeedKmh} km/h Alt: ${packet.payload.altitudeM}m Climb: ${packet.payload.climbRateMs}m/s`;
    } else if (packet.msgId === MavMsgId.HEARTBEAT) {
      summary = `${packet.payload.autopilotName} Mode: ${packet.payload.modeName} [${packet.payload.isArmed ? "ARMED" : "DISARMED"}]`;
    } else if (packet.msgId === MavMsgId.SYS_STATUS) {
      summary = `Bat: ${packet.payload.voltage}V (${packet.payload.batteryRemaining}%) Current: ${packet.payload.current}A`;
    } else if (packet.msgId === MavMsgId.RAW_IMU) {
      summary = `Compass X: ${packet.payload.xMag} Y: ${packet.payload.yMag} Z: ${packet.payload.zMag} mGauss`;
    } else if (packet.msgId === MavMsgId.STATUSTEXT) {
      summary = `[${packet.payload.severityName}] ${packet.payload.text}`;
    } else {
      summary = `Payload bytes: ${packet.rawHex.length / 3}`;
    }

    setPixhawk((prev) => ({
      ...prev,
      recentPackets: [
        {
          id: `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          time: new Date().toLocaleTimeString(),
          name: packet.msgName,
          msgId: packet.msgId,
          summary,
          hex: packet.rawHex.slice(0, 48) + (packet.rawHex.length > 48 ? "..." : ""),
        },
        ...prev.recentPackets.slice(0, 49),
      ],
    }));
  }, []);

  // Sync decoded Pixhawk packets into Pixhawk state and DRS Store
  const applyDecodedPacket = useCallback(
    (packet: DecodedMavPacket) => {
      packetCountInSecRef.current += 1;
      const now = Date.now();
      if (now - lastSecCheckRef.current >= 1000) {
        const rate = packetCountInSecRef.current;
        packetCountInSecRef.current = 0;
        lastSecCheckRef.current = now;
        setPixhawk((prev) => ({
          ...prev,
          telemetry: { ...prev.telemetry, packetRateHz: rate },
        }));
      }

      setPixhawk((prev) => {
        let newGps: PixhawkGPS = { ...prev.gps };
        let newCompass: PixhawkCompass = { ...prev.compass };
        let newTelemetry: PixhawkTelemetry = { ...prev.telemetry };
        let newSerial: PixhawkSerialState = {
          ...prev.serial,
          rxPackets: prev.serial.rxPackets + 1,
          lastPacketTime: now,
        };

        switch (packet.msgId) {
          case MavMsgId.HEARTBEAT: {
            newTelemetry = {
              ...newTelemetry,
              autopilot: packet.payload.autopilotName || newTelemetry.autopilot,
              vehicleType: packet.payload.vehicleType || newTelemetry.vehicleType,
              isArmed: packet.payload.isArmed ?? newTelemetry.isArmed,
              flightMode: packet.payload.modeName || newTelemetry.flightMode,
            };
            break;
          }

          case MavMsgId.SYS_STATUS: {
            newTelemetry = {
              ...newTelemetry,
              batteryVolts: packet.payload.voltage ?? newTelemetry.batteryVolts,
              batteryAmps: packet.payload.current ?? newTelemetry.batteryAmps,
              batteryPercent: packet.payload.batteryRemaining ?? newTelemetry.batteryPercent,
            };
            break;
          }

          case MavMsgId.GPS_RAW_INT: {
            newGps = {
              ...newGps,
              fixType: packet.payload.fixName || newGps.fixType,
              fixTypeCode: packet.payload.fixType ?? newGps.fixTypeCode,
              satCount: packet.payload.satellitesVisible ?? newGps.satCount,
              hdop: packet.payload.hdop ?? newGps.hdop,
              vdop: packet.payload.vdop ?? newGps.vdop,
              groundspeedKmh: packet.payload.groundspeedKmh ?? newGps.groundspeedKmh,
              lastFixTime: now,
            };
            if (packet.payload.lat && packet.payload.lng) {
              newGps.lat = packet.payload.lat;
              newGps.lng = packet.payload.lng;
            }
            if (packet.payload.altMSL !== undefined) {
              newGps.altMSL = packet.payload.altMSL;
            }
            break;
          }

          case MavMsgId.ATTITUDE: {
            newCompass = {
              ...newCompass,
              rollDeg: packet.payload.rollDeg ?? newCompass.rollDeg,
              pitchDeg: packet.payload.pitchDeg ?? newCompass.pitchDeg,
              yawDeg: packet.payload.yawDeg ?? newCompass.yawDeg,
              headingDeg: packet.payload.yawDeg ?? newCompass.headingDeg,
            };
            break;
          }

          case MavMsgId.GLOBAL_POSITION_INT: {
            newGps = {
              ...newGps,
              lat: packet.payload.lat ?? newGps.lat,
              lng: packet.payload.lng ?? newGps.lng,
              altMSL: packet.payload.altMSL ?? newGps.altMSL,
              altAGL: packet.payload.altAGL ?? newGps.altAGL,
              groundspeedKmh: packet.payload.groundspeedKmh ?? newGps.groundspeedKmh,
              headingDeg: packet.payload.heading ?? newGps.headingDeg,
              lastFixTime: now,
            };
            newCompass = {
              ...newCompass,
              headingDeg: packet.payload.heading ?? newCompass.headingDeg,
              yawDeg: packet.payload.heading ?? newCompass.yawDeg,
            };
            newTelemetry = {
              ...newTelemetry,
              groundspeedKmh: packet.payload.groundspeedKmh ?? newTelemetry.groundspeedKmh,
              climbRateMs: packet.payload.climbRateMs ?? newTelemetry.climbRateMs,
            };
            break;
          }

          case MavMsgId.VFR_HUD: {
            newTelemetry = {
              ...newTelemetry,
              airspeedKmh: packet.payload.airspeedKmh ?? newTelemetry.airspeedKmh,
              groundspeedKmh: packet.payload.groundspeedKmh ?? newTelemetry.groundspeedKmh,
              throttlePercent: packet.payload.throttlePercent ?? newTelemetry.throttlePercent,
              baroAltM: packet.payload.altitudeM ?? newTelemetry.baroAltM,
              climbRateMs: packet.payload.climbRateMs ?? newTelemetry.climbRateMs,
            };
            newCompass = {
              ...newCompass,
              headingDeg: packet.payload.heading ?? newCompass.headingDeg,
              yawDeg: packet.payload.heading ?? newCompass.yawDeg,
            };
            newGps = {
              ...newGps,
              headingDeg: packet.payload.heading ?? newGps.headingDeg,
              altAGL: packet.payload.altitudeM ?? newGps.altAGL,
            };
            break;
          }

          case MavMsgId.RAW_IMU: {
            newCompass = {
              ...newCompass,
              xMag: packet.payload.xMag ?? newCompass.xMag,
              yMag: packet.payload.yMag ?? newCompass.yMag,
              zMag: packet.payload.zMag ?? newCompass.zMag,
              magMagnitude: packet.payload.magMagnitude ?? newCompass.magMagnitude,
              isCalibrated: true,
            };
            break;
          }

          case MavMsgId.STATUSTEXT: {
            const sev = packet.payload.severityName === "CRITICAL" ? "CRITICAL" : packet.payload.severityName === "WARNING" ? "WARNING" : "INFO";
            addLog(`[Pixhawk] ${packet.payload.text}`, sev);
            break;
          }
        }

        // Forward live coordinates & telemetry to the selected drone in DRS store
        const targetDroneId = selectedDroneId || drones[0]?.id || "DRN-01";
        updateDroneTelemetry(targetDroneId, {
          coordinates: { lat: newGps.lat, lng: newGps.lng },
          battery: newTelemetry.batteryPercent,
          gpsStatus: newGps.fixTypeCode >= 3 ? "Connected" : newGps.fixTypeCode === 2 ? "Weak" : "Disconnected",
          flightMode: (newTelemetry.flightMode as any) || "Autonomous",
          telemetry: {
            altitude: newGps.altAGL || newTelemetry.baroAltM || 45,
            speed: newTelemetry.groundspeedKmh || newGps.groundspeedKmh || 30,
            heading: newCompass.headingDeg,
            verticalSpeed: newTelemetry.climbRateMs || 0,
            horizontalSpeed: Number(((newTelemetry.groundspeedKmh || 30) / 3.6).toFixed(1)),
            satelliteCount: newGps.satCount,
            distanceFromOperator: 0.15,
          },
        });

        // If in Pixhawk GPS mode, automatically update system and operator location from Pixhawk GPS!
        if (
          (packet.msgId === MavMsgId.GLOBAL_POSITION_INT || packet.msgId === MavMsgId.GPS_RAW_INT) &&
          newGps.lat &&
          newGps.lng &&
          Math.abs(newGps.lat) > 0.001
        ) {
          if (gpsSourceMode === "pixhawk") {
            setGpsFromPixhawk({
              lat: newGps.lat,
              lng: newGps.lng,
              altMSL: newGps.altMSL,
              altAGL: newGps.altAGL,
              satCount: newGps.satCount,
              fixType: newGps.fixType,
              hdop: newGps.hdop,
            });
          }
        }

        return {
          ...prev,
          serial: newSerial,
          gps: newGps,
          compass: newCompass,
          telemetry: newTelemetry,
        };
      });

      addPacketEntry(packet);
    },
    [selectedDroneId, drones, updateDroneTelemetry, gpsSourceMode, setGpsFromPixhawk, addLog, addPacketEntry]
  );

  // Web Serial Port Connection
  const connectSerial = async (baudRate?: number): Promise<{ success: boolean; error?: string }> => {
    if (!("serial" in navigator)) {
      const err = "Web Serial API is not supported in this browser environment. Use Chrome or Edge, or open the app directly.";
      addLog(err, "ERROR");
      return { success: false, error: err };
    }

    const baud = baudRate || selectedBaud || 115200;
    setSelectedBaud(baud);

    try {
      stopSimulation();

      // Request port from user
      // @ts-ignore
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x26ac }, // 3DR Pixhawk
          { usbVendorId: 0x0483 }, // STMicroelectronics (Pixhawk Virtual COM Port)
          { usbVendorId: 0x10c4 }, // Silicon Labs CP210x (SiK Telemetry Radios)
          { usbVendorId: 0x0403 }, // FTDI Telemetry Radio
        ],
      }).catch(async () => {
        // Fallback filter: allow any serial port if specific vendor ID filter cancelled
        // @ts-ignore
        return await navigator.serial.requestPort();
      });

      await port.open({
        baudRate: baud,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        bufferSize: 8192,
      });

      portRef.current = port;
      isReadingRef.current = true;

      // Extract port info if available
      const info = port.getInfo ? port.getInfo() : {};
      const portDesc = info.usbVendorId
        ? `VID 0x${info.usbVendorId.toString(16)} : PID 0x${(info.usbProductId || 0).toString(16)}`
        : `USB COM Port @ ${baud.toLocaleString()} baud`;

      setPixhawk((prev) => ({
        ...prev,
        serial: {
          ...prev.serial,
          connected: true,
          isSimulated: false,
          baudRate: baud,
          portInfo: portDesc,
          connectionStartTime: Date.now(),
        },
      }));

      addLog(`Connected to Pixhawk Serial Port at ${baud.toLocaleString()} baud (${portDesc}).`, "INFO");

      // Setup Writer to send Request Data Streams command
      if (port.writable) {
        const writer = port.writable.getWriter();
        writerRef.current = writer;
        try {
          const reqStreamsPacket = MavlinkParser.buildRequestDataStream(0, 4, 1);
          await writer.write(reqStreamsPacket);
          addLog("Sent MAVLink REQUEST_DATA_STREAM (4Hz all streams) to Pixhawk.", "COMMAND");
        } catch {
          // ignore write error
        }
      }

      // Read loop (binary chunk reader)
      const reader = port.readable.getReader();
      readerRef.current = reader;

      (async () => {
        try {
          while (isReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length > 0) {
              setPixhawk((prev) => ({
                ...prev,
                serial: {
                  ...prev.serial,
                  rxBytes: prev.serial.rxBytes + value.length,
                },
              }));

              const packets = parserRef.current.parse(value);
              for (const packet of packets) {
                applyDecodedPacket(packet);
              }
            }
          }
        } catch (err: any) {
          if (isReadingRef.current) {
            addLog(`Serial read stream error: ${err?.message || err}`, "ERROR");
          }
        }
      })();

      return { success: true };
    } catch (err: any) {
      let msg = err?.message || "Failed to open serial port.";
      if (err?.name === "SecurityError" || msg.includes("permissions policy") || msg.includes("disallowed")) {
        msg = "Browser permissions policy blocked Web Serial in this preview frame. Please open the app in a new browser tab to access physical USB hardware.";
      }
      addLog(`Serial error: ${msg}`, "ERROR");
      return { success: false, error: msg };
    }
  };

  const disconnectSerial = async () => {
    isReadingRef.current = false;
    stopSimulation();

    try {
      if (writerRef.current) {
        await writerRef.current.close().catch(() => {});
        writerRef.current = null;
      }
      if (readerRef.current) {
        await readerRef.current.cancel().catch(() => {});
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close().catch(() => {});
        portRef.current = null;
      }
    } catch (e: any) {
      addLog(`Error closing port: ${e?.message || e}`, "WARNING");
    }

    setPixhawk((prev) => ({
      ...prev,
      serial: {
        ...prev.serial,
        connected: false,
        isSimulated: false,
        connectionStartTime: null,
      },
    }));

    addLog("Pixhawk serial port disconnected.", "INFO");
  };

  // Realistic Pixhawk Telemetry Flight Simulation Mode
  const startSimulation = () => {
    disconnectSerial();

    const originLat = userLocation ? userLocation.lat : 28.4595;
    const originLng = userLocation ? userLocation.lng : 77.0266;

    setPixhawk((prev) => ({
      ...prev,
      serial: {
        ...prev.serial,
        connected: true,
        isSimulated: true,
        baudRate: selectedBaud || 115200,
        portInfo: "Pixhawk 6X / ArduCopter SITL Virtual Telemetry",
        connectionStartTime: Date.now(),
      },
      telemetry: {
        ...prev.telemetry,
        autopilot: "ArduPilot (ArduCopter 4.5.1 EKF3)",
        vehicleType: "Quadrotor",
        isArmed: true,
        flightMode: "LOITER",
      },
      statusLogs: [
        {
          id: `log-sim-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          severity: "INFO",
          text: "Pixhawk SITL Hardware Simulator started. Streaming GPS, Compass, Gyro & MAVLink packets at 10Hz.",
        },
        ...prev.statusLogs,
      ],
    }));

    addLog("EKF3 IMU0 is using GPS. Compass calibrated with 16 Satellites locked.", "INFO");

    simAngleRef.current = 0;

    if (simTimerRef.current) clearInterval(simTimerRef.current);

    simTimerRef.current = setInterval(() => {
      simAngleRef.current += 0.04;
      const angle = simAngleRef.current;

      // Elliptical flight trajectory around origin
      const radiusLat = 0.0035;
      const radiusLng = 0.0042;
      const curLat = originLat + Math.sin(angle) * radiusLat;
      const curLng = originLng + Math.cos(angle) * radiusLng;

      // Heading tangent to flight path
      const tangentDx = -Math.sin(angle);
      const tangentDy = Math.cos(angle);
      let heading = Math.round((Math.atan2(tangentDx, tangentDy) * (180 / Math.PI) + 360) % 360);

      // Realistic bank roll and pitch into turns
      const rollDeg = Number((Math.sin(angle * 2) * 12.5).toFixed(1));
      const pitchDeg = Number((-Math.cos(angle * 2) * 5.2 - 2).toFixed(1));

      // Altitude oscillates gently between 60m and 85m
      const altAGL = Number((72.5 + Math.sin(angle * 1.5) * 12.5).toFixed(1));
      const altMSL = Number((altAGL + 215).toFixed(1));
      const climbRate = Number((Math.cos(angle * 1.5) * 1.8).toFixed(1));
      const speed = Number((34.0 + Math.sin(angle * 3) * 6.0).toFixed(1));

      // Realistic Magnetometers
      const radHdg = (heading * Math.PI) / 180;
      const xMag = Math.round(240 * Math.cos(radHdg) + (Math.random() - 0.5) * 8);
      const yMag = Math.round(240 * Math.sin(radHdg) + (Math.random() - 0.5) * 8);
      const zMag = Math.round(390 + (Math.random() - 0.5) * 10);
      const magMagnitude = Math.round(Math.sqrt(xMag * xMag + yMag * yMag + zMag * zMag));

      // Construct simulated decoded packets
      const globalPosPkt: DecodedMavPacket = {
        version: 2,
        seq: Math.floor(Math.random() * 255),
        sysId: 1,
        compId: 1,
        msgId: MavMsgId.GLOBAL_POSITION_INT,
        msgName: "GLOBAL_POSITION_INT",
        payload: {
          lat: Number(curLat.toFixed(6)),
          lng: Number(curLng.toFixed(6)),
          altMSL,
          altAGL,
          groundspeedKmh: speed,
          heading,
          climbRateMs: climbRate,
        },
        rawHex: "fd 1c 00 00 12 01 01 21 00 00 84 2a 3f 10 e4 88 33 04 22 10 01",
        timestamp: Date.now(),
      };

      const attitudePkt: DecodedMavPacket = {
        version: 2,
        seq: Math.floor(Math.random() * 255),
        sysId: 1,
        compId: 1,
        msgId: MavMsgId.ATTITUDE,
        msgName: "ATTITUDE",
        payload: {
          rollDeg,
          pitchDeg,
          yawDeg: heading,
          rollSpeed: 0.05,
          pitchSpeed: -0.02,
          yawSpeed: 0.12,
        },
        rawHex: "fd 1c 00 00 13 01 01 1e 00 00 a1 40 12 00 3c 89 a4 3e 50 12 00",
        timestamp: Date.now(),
      };

      const rawImuPkt: DecodedMavPacket = {
        version: 2,
        seq: Math.floor(Math.random() * 255),
        sysId: 1,
        compId: 1,
        msgId: MavMsgId.RAW_IMU,
        msgName: "RAW_IMU",
        payload: {
          xMag,
          yMag,
          zMag,
          magMagnitude,
        },
        rawHex: "fd 1a 00 00 14 01 01 1b 00 00 e2 00 48 ff 84 01 d3 0f 92 00",
        timestamp: Date.now(),
      };

      const vfrPkt: DecodedMavPacket = {
        version: 2,
        seq: Math.floor(Math.random() * 255),
        sysId: 1,
        compId: 1,
        msgId: MavMsgId.VFR_HUD,
        msgName: "VFR_HUD",
        payload: {
          airspeedKmh: Number((speed + 2.5).toFixed(1)),
          groundspeedKmh: speed,
          heading,
          throttlePercent: 52,
          altitudeM: altAGL,
          climbRateMs: climbRate,
        },
        rawHex: "fd 14 00 00 15 01 01 4a 00 00 44 21 00 00 1a 00 34 00 88 02",
        timestamp: Date.now(),
      };

      applyDecodedPacket(globalPosPkt);
      applyDecodedPacket(attitudePkt);
      applyDecodedPacket(rawImuPkt);
      applyDecodedPacket(vfrPkt);

      // Periodically fire heartbeat & system status
      if (Math.random() < 0.2) {
        const hbPkt: DecodedMavPacket = {
          version: 2,
          seq: Math.floor(Math.random() * 255),
          sysId: 1,
          compId: 1,
          msgId: MavMsgId.HEARTBEAT,
          msgName: "HEARTBEAT",
          payload: {
            customMode: 5,
            modeName: "LOITER",
            isArmed: true,
            autopilotName: "ArduPilot (ArduCopter)",
            vehicleType: "Quadrotor",
          },
          rawHex: "fd 09 00 00 16 01 01 00 00 00 05 00 00 00 02 03 89 04 03",
          timestamp: Date.now(),
        };
        applyDecodedPacket(hbPkt);
      }
    }, 150); // ~7Hz stream
  };

  const stopSimulation = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  };

  const toggleSimulation = () => {
    if (pixhawk.serial.isSimulated) {
      disconnectSerial();
    } else {
      startSimulation();
    }
  };

  const sendCommand = async (cmd: "REQUEST_STREAMS" | "ARM" | "DISARM" | "SET_MODE", param?: any): Promise<boolean> => {
    addLog(`Sent Pixhawk Command: ${cmd}${param ? ` (${param})` : ""}`, "COMMAND");

    if (pixhawk.serial.isSimulated) {
      if (cmd === "ARM") {
        setPixhawk((prev) => ({
          ...prev,
          telemetry: { ...prev.telemetry, isArmed: true },
        }));
        addLog("Pixhawk ARMED. Motors spinning.", "INFO");
      } else if (cmd === "DISARM") {
        setPixhawk((prev) => ({
          ...prev,
          telemetry: { ...prev.telemetry, isArmed: false },
        }));
        addLog("Pixhawk DISARMED.", "WARNING");
      } else if (cmd === "SET_MODE" && param) {
        setPixhawk((prev) => ({
          ...prev,
          telemetry: { ...prev.telemetry, flightMode: param },
        }));
        addLog(`Flight mode switched to ${param}.`, "INFO");
      }
      return true;
    }

    if (writerRef.current) {
      try {
        let packet: Uint8Array | null = null;
        if (cmd === "REQUEST_STREAMS") {
          packet = MavlinkParser.buildRequestDataStream(0, 10, 1);
        } else if (cmd === "ARM") {
          packet = MavlinkParser.buildArmDisarmCommand(true);
        } else if (cmd === "DISARM") {
          packet = MavlinkParser.buildArmDisarmCommand(false);
        }
        if (packet) {
          await writerRef.current.write(packet);
          return true;
        }
      } catch (err: any) {
        addLog(`Command write failed: ${err?.message || err}`, "ERROR");
        return false;
      }
    }

    return true;
  };

  const clearLogs = () => {
    setPixhawk((prev) => ({
      ...prev,
      statusLogs: [],
      recentPackets: [],
    }));
  };

  const syncSystemGpsToPixhawk = useCallback(
    (centerMap = true) => {
      setGpsFromPixhawk(
        {
          lat: pixhawk.gps.lat,
          lng: pixhawk.gps.lng,
          altMSL: pixhawk.gps.altMSL,
          altAGL: pixhawk.gps.altAGL,
          satCount: pixhawk.gps.satCount,
          fixType: pixhawk.gps.fixType,
          hdop: pixhawk.gps.hdop,
        },
        centerMap
      );
      addLog(
        `System and Map location synced to Pixhawk hardware GPS fix (${pixhawk.gps.lat.toFixed(5)}°, ${pixhawk.gps.lng.toFixed(5)}°). Laptop location bypassed.`,
        "INFO"
      );
    },
    [pixhawk.gps, setGpsFromPixhawk, addLog]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSimulation();
      isReadingRef.current = false;
      if (portRef.current) {
        portRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <PixhawkContext.Provider
      value={{
        pixhawk,
        connectSerial,
        disconnectSerial,
        startSimulation,
        stopSimulation,
        toggleSimulation,
        sendCommand,
        clearLogs,
        selectedBaud,
        setSelectedBaud,
        syncSystemGpsToPixhawk,
      }}
    >
      {children}
    </PixhawkContext.Provider>
  );
}

export function usePixhawk() {
  const context = useContext(PixhawkContext);
  if (!context) {
    throw new Error("usePixhawk must be used within a PixhawkProvider");
  }
  return context;
}
