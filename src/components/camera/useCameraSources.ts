import { useState, useEffect } from "react";
import { Drone } from "../../types";
import { CameraSourceInfo, getAvailableCameraSources } from "./CameraTypes";
import { useVisitorCameras } from "./useVisitorCameras";

export function useCameraSources(
  drones: Drone[],
  onlyAvailable: boolean = true,
  currentUsername: string = "Operator"
) {
  const [hardwareDevices, setHardwareDevices] = useState<MediaDeviceInfo[]>([]);
  const {
    visitors,
    visitorSources,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
    toggleBroadcasting,
    switchCameraFacing,
    facingMode,
    activeVisitorCount,
    realDeviceCount,
    myDeviceId,
  } = useVisitorCameras(currentUsername);

  useEffect(() => {
    let isMounted = true;

    const queryDevices = async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
          const allDevs = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allDevs.filter((d) => d.kind === "videoinput");
          if (isMounted) {
            setHardwareDevices(videoInputs);
          }
        }
      } catch (err) {
        console.warn("Could not enumerate camera devices", err);
      }
    };

    queryDevices();

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", queryDevices);
    }

    return () => {
      isMounted = false;
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener("devicechange", queryDevices);
      }
    };
  }, []);

  const sources = getAvailableCameraSources(drones, hardwareDevices, onlyAvailable, visitorSources);
  const allSources = getAvailableCameraSources(drones, hardwareDevices, false, visitorSources);

  return {
    sources, // only available sources when onlyAvailable = true
    allSources,
    hardwareDevices,
    visitors,
    visitorSources,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
    toggleBroadcasting,
    switchCameraFacing,
    facingMode,
    activeVisitorCount,
    realDeviceCount,
    myDeviceId,
  };
}
