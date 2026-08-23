import { useState, useEffect } from "react";
import { Drone } from "../../types";
import { CameraSourceInfo, getAvailableCameraSources } from "./CameraTypes";

export function useCameraSources(drones: Drone[], onlyAvailable: boolean = true) {
  const [hardwareDevices, setHardwareDevices] = useState<MediaDeviceInfo[]>([]);

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

  const sources = getAvailableCameraSources(drones, hardwareDevices, onlyAvailable);
  const allSources = getAvailableCameraSources(drones, hardwareDevices, false);

  return {
    sources, // only available sources when onlyAvailable = true
    allSources,
    hardwareDevices,
  };
}
