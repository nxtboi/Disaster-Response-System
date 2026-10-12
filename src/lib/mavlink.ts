/**
 * MAVLink v1 / v2 Protocol Decoder & Encoder for Pixhawk Flight Controllers
 * Supports ArduPilot (ArduCopter/Plane/Rover) and PX4 Autopilots.
 */

export const MAVLINK_V1_STX = 0xFE;
export const MAVLINK_V2_STX = 0xFD;

export enum MavMsgId {
  HEARTBEAT = 0,
  SYS_STATUS = 1,
  SYSTEM_TIME = 2,
  GPS_RAW_INT = 24,
  RAW_IMU = 27,
  SCALED_IMU = 26,
  ATTITUDE = 30,
  ATTITUDE_QUATERNION = 31,
  GLOBAL_POSITION_INT = 33,
  RC_CHANNELS = 65,
  VFR_HUD = 74,
  COMMAND_LONG = 76,
  COMMAND_ACK = 77,
  NAV_CONTROLLER_OUTPUT = 62,
  BATTERY_STATUS = 147,
  HOME_POSITION = 242,
  STATUSTEXT = 253,
}

export interface DecodedMavPacket {
  version: 1 | 2;
  seq: number;
  sysId: number;
  compId: number;
  msgId: number;
  msgName: string;
  payload: any;
  rawHex: string;
  timestamp: number;
}

export const ARDUPILOT_COPTER_MODES: Record<number, string> = {
  0: "STABILIZE",
  1: "ACRO",
  2: "ALT_HOLD",
  3: "AUTO",
  4: "GUIDED",
  5: "LOITER",
  6: "RTL",
  7: "CIRCLE",
  9: "LAND",
  11: "DRIFT",
  13: "SPORT",
  14: "FLIP",
  15: "AUTOTUNE",
  16: "POSHOLD",
  17: "BRAKE",
  18: "THROW",
  19: "AVOID_ADSB",
  20: "GUIDED_NOGPS",
  21: "SMART_RTL",
  22: "FLOWHOLD",
  23: "FOLLOW",
  24: "ZIGZAG",
  25: "SYSTEMID",
  26: "AUTOROTATE",
  27: "AUTO_RTL",
};

export const PX4_CUSTOM_MODES: Record<number, string> = {
  1: "MANUAL",
  2: "ALTCTL",
  3: "POSCTL",
  4: "AUTO_MISSION",
  5: "AUTO_LOITER",
  6: "AUTO_RTL",
  7: "ACRO",
  8: "OFFBOARD",
  9: "STABILIZED",
  10: "AUTO_TAKEOFF",
  11: "AUTO_LAND",
};

export const GPS_FIX_TYPE_NAMES: Record<number, string> = {
  0: "NO GPS",
  1: "NO FIX",
  2: "2D FIX",
  3: "3D FIX",
  4: "DGPS",
  5: "RTK FLOAT",
  6: "RTK FIXED",
  7: "STATIC",
  8: "PPP",
};

export class MavlinkParser {
  private buffer: Uint8Array = new Uint8Array(0);

  /**
   * Append raw byte chunk to parser buffer and extract all valid packets
   */
  public parse(newBytes: Uint8Array): DecodedMavPacket[] {
    const combined = new Uint8Array(this.buffer.length + newBytes.length);
    combined.set(this.buffer);
    combined.set(newBytes, this.buffer.length);
    this.buffer = combined;

    const packets: DecodedMavPacket[] = [];
    let offset = 0;

    while (offset < this.buffer.length) {
      const magic = this.buffer[offset];

      if (magic === MAVLINK_V1_STX) {
        // MAVLink v1 frame: [STX(1), LEN(1), SEQ(1), SYS(1), COMP(1), MSGID(1), PAYLOAD(LEN), CRC(2)] = LEN + 8 bytes
        if (offset + 1 >= this.buffer.length) break;
        const payloadLen = this.buffer[offset + 1];
        const packetLen = payloadLen + 8;

        if (offset + packetLen > this.buffer.length) {
          // Packet incomplete, wait for more bytes
          break;
        }

        const packetBytes = this.buffer.slice(offset, offset + packetLen);
        const parsed = this.decodeV1(packetBytes);
        if (parsed) {
          packets.push(parsed);
          offset += packetLen;
          continue;
        } else {
          // Bad CRC or corrupted, shift 1 byte forward
          offset += 1;
          continue;
        }
      } else if (magic === MAVLINK_V2_STX) {
        // MAVLink v2 frame: [STX(1), LEN(1), INC_FLAGS(1), CMP_FLAGS(1), SEQ(1), SYS(1), COMP(1), MSGID(3), PAYLOAD(LEN), CRC(2), [SIG(13)]]
        if (offset + 1 >= this.buffer.length) break;
        const payloadLen = this.buffer[offset + 1];
        if (offset + 2 >= this.buffer.length) break;
        const incFlags = this.buffer[offset + 2];
        const hasSignature = (incFlags & 0x01) !== 0;
        const headerLen = 10;
        const packetLen = headerLen + payloadLen + 2 + (hasSignature ? 13 : 0);

        if (offset + packetLen > this.buffer.length) {
          break;
        }

        const packetBytes = this.buffer.slice(offset, offset + packetLen);
        const parsed = this.decodeV2(packetBytes);
        if (parsed) {
          packets.push(parsed);
          offset += packetLen;
          continue;
        } else {
          offset += 1;
          continue;
        }
      } else {
        // Skip unknown byte
        offset += 1;
      }
    }

    // Retain unparsed residual
    this.buffer = this.buffer.slice(offset);
    return packets;
  }

  private decodeV1(bytes: Uint8Array): DecodedMavPacket | null {
    try {
      const len = bytes[1];
      const seq = bytes[2];
      const sysId = bytes[3];
      const compId = bytes[4];
      const msgId = bytes[5];
      const payload = bytes.slice(6, 6 + len);

      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const decodedPayload = this.decodeMessagePayload(msgId, view, payload);

      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(" ");

      return {
        version: 1,
        seq,
        sysId,
        compId,
        msgId,
        msgName: this.getMsgName(msgId),
        payload: decodedPayload,
        rawHex: hex,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  private decodeV2(bytes: Uint8Array): DecodedMavPacket | null {
    try {
      const len = bytes[1];
      const seq = bytes[4];
      const sysId = bytes[5];
      const compId = bytes[6];
      const msgId = bytes[7] | (bytes[8] << 8) | (bytes[9] << 16);
      const payload = bytes.slice(10, 10 + len);

      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const decodedPayload = this.decodeMessagePayload(msgId, view, payload);

      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(" ");

      return {
        version: 2,
        seq,
        sysId,
        compId,
        msgId,
        msgName: this.getMsgName(msgId),
        payload: decodedPayload,
        rawHex: hex,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  private getMsgName(msgId: number): string {
    switch (msgId) {
      case MavMsgId.HEARTBEAT:
        return "HEARTBEAT";
      case MavMsgId.SYS_STATUS:
        return "SYS_STATUS";
      case MavMsgId.GPS_RAW_INT:
        return "GPS_RAW_INT";
      case MavMsgId.ATTITUDE:
        return "ATTITUDE";
      case MavMsgId.GLOBAL_POSITION_INT:
        return "GLOBAL_POSITION_INT";
      case MavMsgId.VFR_HUD:
        return "VFR_HUD";
      case MavMsgId.RAW_IMU:
        return "RAW_IMU";
      case MavMsgId.STATUSTEXT:
        return "STATUSTEXT";
      case MavMsgId.BATTERY_STATUS:
        return "BATTERY_STATUS";
      default:
        return `MSG_${msgId}`;
    }
  }

  private decodeMessagePayload(msgId: number, view: DataView, rawBytes: Uint8Array): any {
    switch (msgId) {
      case MavMsgId.HEARTBEAT: {
        // uint32_t custom_mode, uint8_t type, uint8_t autopilot, uint8_t base_mode, uint8_t system_status, uint8_t mavlink_version
        if (view.byteLength < 9) return {};
        const customMode = view.getUint32(0, true);
        const type = view.getUint8(4);
        const autopilot = view.getUint8(5);
        const baseMode = view.getUint8(6);
        const systemStatus = view.getUint8(7);
        const isArmed = (baseMode & 128) !== 0;

        let autopilotName = "ArduPilot";
        if (autopilot === 12) autopilotName = "PX4 Autopilot";
        else if (autopilot === 3) autopilotName = "ArduPilot Mega";

        let vehicleType = "Quadrotor";
        if (type === 1) vehicleType = "Fixed-Wing";
        else if (type === 2) vehicleType = "Quadrotor";
        else if (type === 3) vehicleType = "Coaxial";
        else if (type === 4) vehicleType = "Helicopter";
        else if (type === 10) vehicleType = "Rover";
        else if (type === 13) vehicleType = "Hexacopter";
        else if (type === 14) vehicleType = "Octocopter";
        else if (type === 22) vehicleType = "VTOL";

        const modeName = ARDUPILOT_COPTER_MODES[customMode] || PX4_CUSTOM_MODES[customMode] || `MODE_${customMode}`;

        return {
          customMode,
          modeName,
          isArmed,
          baseMode,
          autopilot,
          autopilotName,
          vehicleType,
          systemStatus,
        };
      }

      case MavMsgId.SYS_STATUS: {
        // uint32_t onboard_control_sensors_present, enabled, health, uint16_t load, uint16_t voltage_battery, int16_t current_battery, int8_t battery_remaining, uint16_t drop_rate_comm
        if (view.byteLength < 17) return {};
        const voltageMv = view.getUint16(12, true); // mV
        const currentCa = view.getInt16(14, true); // cA (10mA)
        const batteryRemaining = view.getInt8(16); // %
        const dropRate = view.getUint16(17, true); // drop rate

        return {
          voltage: voltageMv > 0 ? Number((voltageMv / 1000).toFixed(2)) : 14.8,
          current: currentCa >= 0 ? Number((currentCa / 100).toFixed(1)) : 0,
          batteryRemaining: batteryRemaining >= 0 && batteryRemaining <= 100 ? batteryRemaining : 100,
          dropRateComm: dropRate,
        };
      }

      case MavMsgId.GPS_RAW_INT: {
        // uint64_t time_usec, uint8_t fix_type, int32_t lat, int32_t lon, int32_t alt, uint16_t eph, uint16_t epv, uint16_t vel, uint16_t cog, uint8_t satellites_visible
        if (view.byteLength < 29) return {};
        const fixType = view.getUint8(8);
        const latE7 = view.getInt32(9, true);
        const lonE7 = view.getInt32(13, true);
        const altMm = view.getInt32(17, true);
        const eph = view.getUint16(21, true); // HDOP * 100
        const epv = view.getUint16(23, true); // VDOP * 100
        const velCms = view.getUint16(25, true); // cm/s
        const cogCdeg = view.getUint16(27, true); // cdeg (0.01 deg)
        const satVisible = view.getUint8(29);

        return {
          fixType,
          fixName: GPS_FIX_TYPE_NAMES[fixType] || "UNKNOWN",
          lat: latE7 !== 0 ? latE7 / 1e7 : null,
          lng: lonE7 !== 0 ? lonE7 / 1e7 : null,
          altMSL: Number((altMm / 1e3).toFixed(1)),
          hdop: Number((eph / 100).toFixed(2)),
          vdop: Number((epv / 100).toFixed(2)),
          groundspeedKmh: Number(((velCms / 100) * 3.6).toFixed(1)),
          cog: Number((cogCdeg / 100).toFixed(1)),
          satellitesVisible: satVisible,
        };
      }

      case MavMsgId.ATTITUDE: {
        // uint32_t time_boot_ms, float roll, float pitch, float yaw, float rollspeed, float pitchspeed, float yawspeed
        if (view.byteLength < 28) return {};
        const rollRad = view.getFloat32(4, true);
        const pitchRad = view.getFloat32(8, true);
        const yawRad = view.getFloat32(12, true);
        const rollSpeed = view.getFloat32(16, true);
        const pitchSpeed = view.getFloat32(20, true);
        const yawSpeed = view.getFloat32(24, true);

        const rad2deg = 180 / Math.PI;
        const rollDeg = Number((rollRad * rad2deg).toFixed(1));
        const pitchDeg = Number((pitchRad * rad2deg).toFixed(1));
        let yawDeg = Number((yawRad * rad2deg).toFixed(1));
        if (yawDeg < 0) yawDeg += 360;

        return {
          rollDeg,
          pitchDeg,
          yawDeg,
          rollSpeed: Number(rollSpeed.toFixed(2)),
          pitchSpeed: Number(pitchSpeed.toFixed(2)),
          yawSpeed: Number(yawSpeed.toFixed(2)),
        };
      }

      case MavMsgId.GLOBAL_POSITION_INT: {
        // uint32_t time_boot_ms, int32_t lat, int32_t lon, int32_t alt, int32_t relative_alt, int16_t vx, int16_t vy, int16_t vz, uint16_t hdg
        if (view.byteLength < 28) return {};
        const latE7 = view.getInt32(4, true);
        const lonE7 = view.getInt32(8, true);
        const altMm = view.getInt32(12, true); // MSL
        const relativeAltMm = view.getInt32(16, true); // AGL
        const vxCms = view.getInt16(20, true);
        const vyCms = view.getInt16(22, true);
        const vzCms = view.getInt16(24, true);
        const hdgCdeg = view.getUint16(26, true);

        const groundspeedMs = Math.sqrt((vxCms / 100) ** 2 + (vyCms / 100) ** 2);

        return {
          lat: latE7 / 1e7,
          lng: lonE7 / 1e7,
          altMSL: Number((altMm / 1e3).toFixed(1)),
          altAGL: Number((relativeAltMm / 1e3).toFixed(1)),
          climbRateMs: Number((-vzCms / 100).toFixed(1)),
          groundspeedKmh: Number((groundspeedMs * 3.6).toFixed(1)),
          heading: hdgCdeg !== 65535 ? Number((hdgCdeg / 100).toFixed(1)) : 0,
        };
      }

      case MavMsgId.VFR_HUD: {
        // float airspeed, float groundspeed, int16_t heading, uint16_t throttle, float alt, float climb
        if (view.byteLength < 20) return {};
        const airspeed = view.getFloat32(0, true);
        const groundspeed = view.getFloat32(4, true);
        const heading = view.getInt16(8, true);
        const throttle = view.getUint16(10, true);
        const alt = view.getFloat32(12, true);
        const climb = view.getFloat32(16, true);

        return {
          airspeedKmh: Number((airspeed * 3.6).toFixed(1)),
          groundspeedKmh: Number((groundspeed * 3.6).toFixed(1)),
          heading: heading >= 0 ? heading : (heading + 360) % 360,
          throttlePercent: throttle,
          altitudeM: Number(alt.toFixed(1)),
          climbRateMs: Number(climb.toFixed(1)),
        };
      }

      case MavMsgId.RAW_IMU: {
        // uint64_t time_usec, int16_t xacc, int16_t yacc, int16_t zacc, int16_t xgyro, int16_t ygyro, int16_t zgyro, int16_t xmag, int16_t ymag, int16_t zmag
        if (view.byteLength < 26) return {};
        const xmag = view.getInt16(20, true);
        const ymag = view.getInt16(22, true);
        const zmag = view.getInt16(24, true);

        return {
          xMag: xmag,
          yMag: ymag,
          zMag: zmag,
          magMagnitude: Math.round(Math.sqrt(xmag * xmag + ymag * ymag + zmag * zmag)),
        };
      }

      case MavMsgId.STATUSTEXT: {
        // uint8_t severity, char text[50]
        if (view.byteLength < 1) return {};
        const severity = view.getUint8(0);
        let text = "";
        for (let i = 1; i < Math.min(view.byteLength, 51); i++) {
          const charCode = view.getUint8(i);
          if (charCode === 0) break;
          text += String.fromCharCode(charCode);
        }

        const severityNames: Record<number, string> = {
          0: "EMERGENCY",
          1: "ALERT",
          2: "CRITICAL",
          3: "ERROR",
          4: "WARNING",
          5: "NOTICE",
          6: "INFO",
          7: "DEBUG",
        };

        return {
          severity,
          severityName: severityNames[severity] || "INFO",
          text: text.trim(),
        };
      }

      default:
        return { rawLength: rawBytes.length };
    }
  }

  /**
   * Builds a MAVLink v1 REQUEST_DATA_STREAM packet to instruct Pixhawk to stream all telemetry
   */
  public static buildRequestDataStream(
    streamId: number = 0, // 0 = all streams
    rateHz: number = 4,   // 4 Hz
    startStop: number = 1 // 1 = start
  ): Uint8Array {
    // MSG_ID 66: REQUEST_DATA_STREAM
    // Payload: target_system(1), target_component(1), req_stream_id(1), req_message_rate(2), start_stop(1)
    const payload = new Uint8Array(6);
    const view = new DataView(payload.buffer);
    view.setUint8(0, 1); // target system (Pixhawk)
    view.setUint8(1, 1); // target component (Autopilot)
    view.setUint8(2, streamId);
    view.setUint16(3, rateHz, true);
    view.setUint8(5, startStop);

    return MavlinkParser.buildV1Packet(66, 255, 190, payload);
  }

  /**
   * Builds an ARM / DISARM command packet
   */
  public static buildArmDisarmCommand(arm: boolean): Uint8Array {
    // MSG_ID 76: COMMAND_LONG
    // param1: 1 (ARM) or 0 (DISARM)
    // param2: 0 (default)
    // command: 400 (MAV_CMD_COMPONENT_ARM_DISARM)
    const payload = new Uint8Array(33);
    const view = new DataView(payload.buffer);
    view.setFloat32(0, arm ? 1.0 : 0.0, true); // param 1: 1=arm, 0=disarm
    view.setFloat32(4, 0, true);
    view.setFloat32(8, 0, true);
    view.setFloat32(12, 0, true);
    view.setFloat32(16, 0, true);
    view.setFloat32(20, 0, true);
    view.setFloat32(24, 0, true);
    view.setUint16(28, 400, true); // MAV_CMD_COMPONENT_ARM_DISARM
    view.setUint8(30, 1); // target_system
    view.setUint8(31, 1); // target_component
    view.setUint8(32, 0); // confirmation

    return MavlinkParser.buildV1Packet(76, 255, 190, payload);
  }

  /**
   * Helper to construct a standard MAVLink v1 frame with X.25 CRC
   */
  public static buildV1Packet(
    msgId: number,
    sysId: number,
    compId: number,
    payload: Uint8Array
  ): Uint8Array {
    const len = payload.length;
    const packet = new Uint8Array(len + 8);
    packet[0] = MAVLINK_V1_STX;
    packet[1] = len;
    packet[2] = Math.floor(Math.random() * 255); // sequence
    packet[3] = sysId;
    packet[4] = compId;
    packet[5] = msgId;
    packet.set(payload, 6);

    // Compute MAVLink X.25 CRC
    let crc = 0xffff;
    for (let i = 1; i < len + 6; i++) {
      let b = packet[i] ^ (crc & 0xff);
      b ^= (b << 4) & 0xff;
      crc = (crc >> 8) ^ (b << 8) ^ (b << 3) ^ (b >> 4);
    }
    // CRC extra byte (magic constant per message ID)
    const crcExtra = MavlinkParser.getCrcExtra(msgId);
    let b = crcExtra ^ (crc & 0xff);
    b ^= (b << 4) & 0xff;
    crc = (crc >> 8) ^ (b << 8) ^ (b << 3) ^ (b >> 4);

    packet[len + 6] = crc & 0xff;
    packet[len + 7] = (crc >> 8) & 0xff;

    return packet;
  }

  private static getCrcExtra(msgId: number): number {
    switch (msgId) {
      case 0:
        return 50;
      case 1:
        return 124;
      case 24:
        return 24;
      case 30:
        return 39;
      case 33:
        return 104;
      case 66:
        return 148;
      case 74:
        return 20;
      case 76:
        return 152;
      case 253:
        return 83;
      default:
        return 0;
    }
  }
}
