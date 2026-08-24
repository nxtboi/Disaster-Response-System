import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Drone, DroneCoordinates, TacticalWaypoint, WaypointAction } from "./types";
import { MOCK_DRONES } from "./data";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

export interface UserAccount {
  username: string;
  role: "admin" | "operator";
}

interface DRSContextType {
  drones: Drone[];
  selectedDroneId: string | null;
  setSelectedDroneId: (id: string | null) => void;
  selectedDrone: Drone | undefined;
  activeView: string;
  setActiveView: (view: string) => void;
  systemStatus: "ALL SYSTEMS OPERATIONAL" | "WARNINGS DETECTED" | "CRITICAL ERRORS";
  updateDroneTelemetry: (id: string, updates: Partial<Drone>) => void;
  userLocation: UserLocation | null;
  setUserLocation: (loc: UserLocation | null) => void;
  isLocatingUser: boolean;
  userLocationError: string | null;
  requestUserLocation: (deployFleetNearby?: boolean) => Promise<UserLocation | null>;
  deployFleetToLocation: (lat: number, lng: number) => void;
  centerMapTarget: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
  setCenterMapTarget: (target: { lat: number; lng: number; zoom?: number; timestamp: number } | null) => void;
  // User Account Context
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;
  // Status Panel Visibility
  isStatusPanelVisible: boolean;
  setIsStatusPanelVisible: (visible: boolean) => void;
  toggleStatusPanel: () => void;
  // Tactical Waypoints
  waypoints: TacticalWaypoint[];
  selectedWaypointId: string | null;
  setSelectedWaypointId: (id: string | null) => void;
  isPlacingWaypoint: boolean;
  setIsPlacingWaypoint: (active: boolean) => void;
  addWaypoint: (coords: DroneCoordinates, options?: Partial<TacticalWaypoint>) => TacticalWaypoint;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, updates: Partial<TacticalWaypoint>) => void;
  clearWaypoints: () => void;
  sendDroneToWaypoint: (droneId: string, waypointId: string) => void;
  executeMissionPath: (droneId: string) => void;
  totalWaypointDistanceKm: number;
  // Fleet Management (Add & Remove Drones)
  addDrone: (customData?: Partial<Drone>) => Drone;
  removeDrone: (id: string) => void;
  addAlert: (droneId: string, message: string) => void;
}

const DEFAULT_WAYPOINTS: TacticalWaypoint[] = [
  {
    id: "wp-1",
    index: 1,
    name: "Alpha Point",
    coordinates: { lat: 28.4610, lng: 77.0240 },
    altitude: 120,
    speed: 35,
    action: "Fly-Through",
    assignedDroneId: "DRN-01",
    createdAt: Date.now() - 120000,
  },
  {
    id: "wp-2",
    index: 2,
    name: "Bravo Sector",
    coordinates: { lat: 28.4645, lng: 77.0295 },
    altitude: 90,
    speed: 25,
    action: "Hover & Scan",
    assignedDroneId: "DRN-01",
    createdAt: Date.now() - 60000,
  },
  {
    id: "wp-3",
    index: 3,
    name: "Charlie Perim",
    coordinates: { lat: 28.4580, lng: 77.0320 },
    altitude: 100,
    speed: 40,
    action: "Reconnaissance",
    assignedDroneId: "DRN-01",
    createdAt: Date.now() - 30000,
  },
];

function getStoredWaypoints(username: string): TacticalWaypoint[] {
  try {
    const key = `drs_waypoints_v2_${(username || "operator").trim().toLowerCase()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading waypoints from localStorage:", err);
  }
  return DEFAULT_WAYPOINTS;
}

function saveStoredWaypoints(username: string, waypointsList: TacticalWaypoint[]) {
  try {
    const key = `drs_waypoints_v2_${(username || "operator").trim().toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(waypointsList));
  } catch (err) {
    console.error("Error saving waypoints to localStorage:", err);
  }
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

const DRSContext = createContext<DRSContextType | undefined>(undefined);

export function DRSProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const auth = localStorage.getItem("drs_auth_session");
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.isAuthenticated && parsed?.username) {
          return {
            username: parsed.username,
            role: parsed.role === "admin" ? "admin" : "operator",
          };
        }
      }
      const saved = localStorage.getItem("drs_current_user");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return { username: "operator", role: "operator" };
  });

  const [drones, setDrones] = useState<Drone[]>(MOCK_DRONES);
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>("DRN-01");
  const [activeView, setActiveView] = useState("Dashboard");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [userLocationError, setUserLocationError] = useState<string | null>(null);
  const [centerMapTarget, setCenterMapTarget] = useState<{ lat: number; lng: number; zoom?: number; timestamp: number } | null>(null);
  const [isStatusPanelVisible, setIsStatusPanelVisible] = useState(true);

  const toggleStatusPanel = () => setIsStatusPanelVisible((prev) => !prev);

  // Tactical Waypoints State - Persisted per user account
  const [waypoints, setWaypoints] = useState<TacticalWaypoint[]>(() => {
    return getStoredWaypoints(currentUser.username);
  });
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false);

  // Sync waypoints and storage on account switch
  useEffect(() => {
    if (currentUser?.username) {
      try {
        localStorage.setItem("drs_current_user", JSON.stringify(currentUser));
      } catch (_) {}
      const loaded = getStoredWaypoints(currentUser.username);
      setWaypoints(loaded);
    }
  }, [currentUser?.username]);

  // Persist waypoints whenever they change
  useEffect(() => {
    if (currentUser?.username) {
      saveStoredWaypoints(currentUser.username, waypoints);
    }
  }, [waypoints, currentUser?.username]);

  const addWaypoint = (coords: DroneCoordinates, options?: Partial<TacticalWaypoint>): TacticalWaypoint => {
    const nextIndex = waypoints.length + 1;
    const newWp: TacticalWaypoint = {
      id: `wp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      index: nextIndex,
      name: options?.name || `Waypoint ${String(nextIndex).padStart(2, "0")}`,
      coordinates: {
        lat: Number(coords.lat.toFixed(6)),
        lng: Number(coords.lng.toFixed(6)),
      },
      altitude: options?.altitude || 100,
      speed: options?.speed || 35,
      action: options?.action || "Fly-Through",
      assignedDroneId: options?.assignedDroneId || selectedDroneId || "DRN-01",
      createdAt: Date.now(),
    };

    setWaypoints((prev) => {
      const updated = [...prev, newWp];
      if (currentUser?.username) {
        saveStoredWaypoints(currentUser.username, updated);
      }
      return updated;
    });
    setSelectedWaypointId(newWp.id);
    return newWp;
  };

  const removeWaypoint = (id: string) => {
    setWaypoints((prev) => {
      const filtered = prev.filter((w) => w.id !== id);
      const updated = filtered.map((w, idx) => ({ ...w, index: idx + 1 }));
      if (currentUser?.username) {
        saveStoredWaypoints(currentUser.username, updated);
      }
      return updated;
    });
    if (selectedWaypointId === id) {
      setSelectedWaypointId(null);
    }
  };

  const updateWaypoint = (id: string, updates: Partial<TacticalWaypoint>) => {
    setWaypoints((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, ...updates } : w));
      if (currentUser?.username) {
        saveStoredWaypoints(currentUser.username, updated);
      }
      return updated;
    });
  };

  const clearWaypoints = () => {
    setWaypoints([]);
    setSelectedWaypointId(null);
    if (currentUser?.username) {
      saveStoredWaypoints(currentUser.username, []);
    }
  };

  const sendDroneToWaypoint = (droneId: string, waypointId: string) => {
    const wp = waypoints.find((w) => w.id === waypointId);
    if (!wp) return;

    setDrones((prevDrones) =>
      prevDrones.map((drone) => {
        if (drone.id !== droneId) return drone;

        const currentPos = drone.coordinates;
        const newPath = [...drone.path, wp.coordinates];

        return {
          ...drone,
          coordinates: wp.coordinates,
          path: newPath,
          flightMode: "Autonomous",
          telemetry: {
            ...drone.telemetry,
            altitude: wp.altitude,
            speed: wp.speed || 35,
            distanceFromOperator: calculateDistanceKm(
              userLocation ? userLocation.lat : drone.operatorCoordinates.lat,
              userLocation ? userLocation.lng : drone.operatorCoordinates.lng,
              wp.coordinates.lat,
              wp.coordinates.lng
            ),
          },
        };
      })
    );

    setCenterMapTarget({
      lat: wp.coordinates.lat,
      lng: wp.coordinates.lng,
      zoom: 16,
      timestamp: Date.now(),
    });
  };

  const executeMissionPath = (droneId: string) => {
    if (waypoints.length === 0) return;

    const allWpCoords = waypoints.map((w) => w.coordinates);
    const lastWp = waypoints[waypoints.length - 1];

    setDrones((prevDrones) =>
      prevDrones.map((drone) => {
        if (drone.id !== droneId) return drone;

        return {
          ...drone,
          coordinates: lastWp.coordinates,
          path: [...drone.path, ...allWpCoords],
          missionActive: true,
          flightMode: "Autonomous",
          telemetry: {
            ...drone.telemetry,
            altitude: lastWp.altitude,
            speed: 45,
          },
        };
      })
    );

    setCenterMapTarget({
      lat: lastWp.coordinates.lat,
      lng: lastWp.coordinates.lng,
      zoom: 15,
      timestamp: Date.now(),
    });
  };

  // Calculate total waypoint flight corridor distance
  const totalWaypointDistanceKm = React.useMemo(() => {
    if (waypoints.length < 2) return 0;
    let dist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      dist += calculateDistanceKm(
        waypoints[i].coordinates.lat,
        waypoints[i].coordinates.lng,
        waypoints[i + 1].coordinates.lat,
        waypoints[i + 1].coordinates.lng
      );
    }
    return Number(dist.toFixed(2));
  }, [waypoints]);

  const updateDroneTelemetry = (id: string, updates: Partial<Drone>) => {
    setDrones((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates, isHardwareLinked: true } : d)));
  };

  const addDrone = (customData?: Partial<Drone>): Drone => {
    const existingNums = drones
      .map((d) => {
        const match = d.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : drones.length + 1;
    const nextId = customData?.id || `DRN-${String(nextNum).padStart(2, "0")}`;
    const nextName = customData?.name || `Drone ${String(nextNum).padStart(2, "0")}`;

    const baseLat = userLocation ? userLocation.lat : 28.4550;
    const baseLng = userLocation ? userLocation.lng : 77.0200;
    
    // Spread coordinates slightly so drones don't stack on exact same spot
    const offsetLat = (Math.random() - 0.5) * 0.008;
    const offsetLng = (Math.random() - 0.5) * 0.008;
    const droneCoords: DroneCoordinates = customData?.coordinates || {
      lat: Number((baseLat + offsetLat).toFixed(6)),
      lng: Number((baseLng + offsetLng).toFixed(6)),
    };

    const newDrone: Drone = {
      id: nextId,
      name: nextName,
      status: customData?.status || "Online",
      battery: customData?.battery !== undefined ? customData.battery : 100,
      gpsStatus: customData?.gpsStatus || "Connected",
      cameraStatus: customData?.cameraStatus || "Active",
      lidarStatus: customData?.lidarStatus || "Active",
      flightMode: customData?.flightMode || "Autonomous",
      coordinates: droneCoords,
      homeCoordinates: customData?.homeCoordinates || { lat: baseLat, lng: baseLng },
      operatorCoordinates: customData?.operatorCoordinates || { lat: baseLat, lng: baseLng },
      telemetry: {
        altitude: customData?.telemetry?.altitude ?? 75,
        speed: customData?.telemetry?.speed ?? 30,
        heading: customData?.telemetry?.heading ?? Math.floor(Math.random() * 360),
        verticalSpeed: customData?.telemetry?.verticalSpeed ?? 0,
        horizontalSpeed: customData?.telemetry?.horizontalSpeed ?? 8.2,
        satelliteCount: customData?.telemetry?.satelliteCount ?? 14,
        distanceFromOperator: customData?.telemetry?.distanceFromOperator ?? calculateDistanceKm(baseLat, baseLng, droneCoords.lat, droneCoords.lng),
      },
      path: [
        { lat: baseLat, lng: baseLng },
        droneCoords,
      ],
      missionActive: customData?.missionActive ?? false,
      alerts: customData?.alerts || [],
      isHardwareLinked: customData?.isHardwareLinked ?? false,
    };

    setDrones((prev) => [...prev, newDrone]);
    setSelectedDroneId(newDrone.id);
    return newDrone;
  };

  const removeDrone = (id: string) => {
    setDrones((prev) => {
      const remaining = prev.filter((d) => d.id !== id);
      return remaining;
    });

    if (selectedDroneId === id) {
      setDrones((current) => {
        const nextDrone = current.find((d) => d.id !== id);
        setSelectedDroneId(nextDrone ? nextDrone.id : null);
        return current;
      });
    }

    setWaypoints((prevWps) =>
      prevWps.map((wp) => (wp.assignedDroneId === id ? { ...wp, assignedDroneId: null } : wp))
    );
  };

  const addAlert = (droneId: string, message: string) => {
    setDrones((prev) =>
      prev.map((d) => {
        if (d.id === droneId) {
          return {
            ...d,
            alerts: [message, ...d.alerts.filter((a) => a !== message)].slice(0, 15),
          };
        }
        return d;
      })
    );
  };

  const deployFleetToLocation = (lat: number, lng: number) => {
    setDrones((prevDrones) => [
      {
        ...prevDrones[0],
        coordinates: { lat: lat + 0.0035, lng: lng + 0.004 },
        homeCoordinates: { lat, lng },
        operatorCoordinates: { lat, lng },
        path: [
          { lat, lng },
          { lat: lat + 0.002, lng: lng + 0.002 },
          { lat: lat + 0.0035, lng: lng + 0.004 },
        ],
        telemetry: {
          ...prevDrones[0].telemetry,
          distanceFromOperator: calculateDistanceKm(lat, lng, lat + 0.0035, lng + 0.004),
        },
      },
      {
        ...prevDrones[1],
        coordinates: { lat: lat - 0.004, lng: lng + 0.005 },
        homeCoordinates: { lat, lng },
        operatorCoordinates: { lat, lng },
        path: [
          { lat, lng },
          { lat: lat - 0.004, lng: lng + 0.005 },
        ],
        telemetry: {
          ...prevDrones[1].telemetry,
          distanceFromOperator: calculateDistanceKm(lat, lng, lat - 0.004, lng + 0.005),
        },
      },
      {
        ...prevDrones[2],
        coordinates: { lat: lat + 0.001, lng: lng - 0.003 },
        homeCoordinates: { lat, lng },
        operatorCoordinates: { lat, lng },
        path: [],
        telemetry: {
          ...prevDrones[2].telemetry,
          distanceFromOperator: 0.1,
        },
      },
      {
        ...prevDrones[3],
        coordinates: { lat: lat + 0.0001, lng: lng + 0.0001 },
        homeCoordinates: { lat, lng },
        operatorCoordinates: { lat, lng },
        path: [],
        telemetry: {
          ...prevDrones[3].telemetry,
          distanceFromOperator: 0.01,
        },
      },
    ]);

    setCenterMapTarget({ lat, lng, zoom: 15, timestamp: Date.now() });
  };

  const requestUserLocation = (deployFleetNearby = false): Promise<UserLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setUserLocationError("Geolocation is not supported by this browser.");
        resolve(null);
        return;
      }

      setIsLocatingUser(true);
      setUserLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setUserLocation(loc);
          setIsLocatingUser(false);

          if (deployFleetNearby) {
            deployFleetToLocation(loc.lat, loc.lng);
          } else {
            setCenterMapTarget({ lat: loc.lat, lng: loc.lng, zoom: 15, timestamp: Date.now() });
          }

          resolve(loc);
        },
        (error) => {
          setIsLocatingUser(false);
          let errorMsg = "Unable to retrieve user location.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = "Location access was denied. Please allow GPS permissions in your browser.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = "Location information is currently unavailable.";
          } else if (error.code === error.TIMEOUT) {
            errorMsg = "Location request timed out.";
          }
          setUserLocationError(errorMsg);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  };

  // Attempt initial GPS check seamlessly
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setUserLocation(loc);
        },
        () => {
          // Silent fallback on initial load if user hasn't prompted yet
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  // Live simulation tick
  useEffect(() => {
    const interval = setInterval(() => {
      setDrones((prevDrones) =>
        prevDrones.map((drone) => {
          if (drone.status !== "Online" || drone.isHardwareLinked) return drone;

          // Simulate movement
          const newLat = drone.coordinates.lat + (Math.random() - 0.5) * 0.0001;
          const newLng = drone.coordinates.lng + (Math.random() - 0.5) * 0.0001;

          const opLat = userLocation ? userLocation.lat : drone.operatorCoordinates.lat;
          const opLng = userLocation ? userLocation.lng : drone.operatorCoordinates.lng;

          return {
            ...drone,
            coordinates: { lat: newLat, lng: newLng },
            path: [...drone.path.slice(-50), { lat: newLat, lng: newLng }],
            telemetry: {
              ...drone.telemetry,
              speed: Math.max(0, drone.telemetry.speed + (Math.random() - 0.5) * 2),
              distanceFromOperator: calculateDistanceKm(opLat, opLng, newLat, newLng),
            },
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [userLocation]);

  const selectedDrone = drones.find((d) => d.id === selectedDroneId);

  const systemStatus = drones.some((d) => d.alerts.some((a) => a.toLowerCase().includes("critical") || d.battery < 10))
    ? "CRITICAL ERRORS"
    : drones.some((d) => d.alerts.length > 0)
    ? "WARNINGS DETECTED"
    : "ALL SYSTEMS OPERATIONAL";

  return (
    <DRSContext.Provider
      value={{
        drones,
        selectedDroneId,
        setSelectedDroneId,
        selectedDrone,
        activeView,
        setActiveView,
        systemStatus,
        updateDroneTelemetry,
        userLocation,
        setUserLocation,
        isLocatingUser,
        userLocationError,
        requestUserLocation,
        deployFleetToLocation,
        centerMapTarget,
        setCenterMapTarget,
        currentUser,
        setCurrentUser,
        isStatusPanelVisible,
        setIsStatusPanelVisible,
        toggleStatusPanel,
        waypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        isPlacingWaypoint,
        setIsPlacingWaypoint,
        addWaypoint,
        removeWaypoint,
        updateWaypoint,
        clearWaypoints,
        sendDroneToWaypoint,
        executeMissionPath,
        totalWaypointDistanceKm,
        addDrone,
        removeDrone,
        addAlert,
      }}
    >
      {children}
    </DRSContext.Provider>
  );
}

export function useDRS() {
  const context = useContext(DRSContext);
  if (context === undefined) {
    throw new Error("useDRS must be used within a DRSProvider");
  }
  return context;
}

