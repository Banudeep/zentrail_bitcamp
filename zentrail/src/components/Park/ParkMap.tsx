import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  GeoJSON,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaHiking, FaCampground, FaMoon, FaSun, FaGlobe } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

// Create custom park icon
const parkIcon = L.icon({
  iconUrl: "/assets/park-marker.svg",
  iconSize: [32, 42],
  iconAnchor: [16, 42], // Bottom center of the pin
  popupAnchor: [0, -42], // Top center of the pin
});

// Create highlighted park icon
const highlightedParkIcon = L.icon({
  iconUrl: "/assets/park-marker-highlighted.svg",
  iconSize: [40, 52],
  iconAnchor: [20, 52], // Bottom center of the pin
  popupAnchor: [0, -52], // Top center of the pin
});

// Create campground icon
const campgroundIcon = L.icon({
  iconUrl: "/assets/campground-marker.svg",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";
console.log("Environment variables:", {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  API_URL,
});

interface ParkDesignation {
  name: string;
  description: string;
  abbreviation: string;
  id: string;
}

interface ParkAlias {
  parkId: string;
  current: boolean;
  name: string;
  id: string;
}

interface ParkBoundary {
  _id: string;
  parkCode: string;
  boundaryData: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      id: string;
      geometry: {
        type: "MultiPolygon";
        coordinates: number[][][][];
      };
      properties: {
        alternateName: string;
        designationId: string;
        designation: ParkDesignation;
        aliases: ParkAlias[];
        name: string;
      };
    }>;
  };
}

interface StateBoundary {
  geometry: {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };
  name: string;
  abbreviation: string;
  id: string | null;
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };
  properties: {
    name: string;
    stateCode: string;
  };
}

interface Park {
  id: string;
  parkCode: string;
  name: string;
  fullName: string;
  latitude: string;
  longitude: string;
  states: string;
  designation: string;
  description: string;
  images: {
    url: string;
    title: string;
    caption: string;
    credit: string;
  }[];
}

interface TrailFeature {
  type: "Feature";
  properties: {
    TRLNAME: string;
    TRLALTNAME: string;
    TRLSTATUS: string;
    TRLSURFACE: string;
    TRLTYPE: string;
    TRLCLASS: string;
    TRLUSE: string;
    SEASONAL: string;
    SEASDESC: string;
    MAINTAINER: string;
    NOTES: string;
    UNITCODE: string;
    UNITNAME: string;
  };
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: number[][] | number[][][];
  };
}

interface Campground {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  type: string;
  amenities: string[];
  accessibility: {
    wheelchairAccess: boolean;
    internetInfo: string;
    cellPhoneInfo: string;
    rvAllowed: boolean;
    rvInfo: string;
    additionalInfo: string;
  };
}

interface Trail extends TrailFeature {
  _id: string;
}

interface ParkMapProps {
  stateCode: string;
  selectedPark: string;
  onParkSelect: (parkCode: string) => void;
}

const stateCoordinates: { [key: string]: [number, number] } = {
  AL: [32.806671, -86.79113], // Alabama
  AK: [61.370716, -152.404419], // Alaska
  AZ: [34.048927, -111.093735], // Arizona
  AR: [34.969704, -92.373123], // Arkansas
  CA: [36.778259, -119.417931], // California
  CO: [39.550051, -105.782066], // Colorado
  CT: [41.603222, -73.087749], // Connecticut
  DE: [38.910832, -75.52767], // Delaware
  FL: [27.994402, -81.760254], // Florida
  GA: [32.165623, -82.900078], // Georgia
  HI: [19.896767, -155.582779], // Hawaii
  ID: [44.068203, -114.742043], // Idaho
  IL: [40.633125, -89.398529], // Illinois
  IN: [40.267194, -86.134902], // Indiana
  IA: [41.878003, -93.097702], // Iowa
  KS: [39.011902, -98.484246], // Kansas
  KY: [37.839333, -84.270018], // Kentucky
  LA: [30.984298, -91.962333], // Louisiana
  ME: [45.253783, -69.445469], // Maine
  MD: [39.045753, -76.641273], // Maryland
  MA: [42.407211, -71.382439], // Massachusetts
  MI: [44.314844, -85.602364], // Michigan
  MN: [46.729553, -94.6859], // Minnesota
  MS: [32.354668, -89.398529], // Mississippi
  MO: [37.964253, -91.831833], // Missouri
  MT: [46.879682, -110.362566], // Montana
  NE: [41.492537, -99.901813], // Nebraska
  NV: [38.80261, -116.419389], // Nevada
  NH: [43.193852, -71.572395], // New Hampshire
  NJ: [40.058324, -74.405661], // New Jersey
  NM: [34.51994, -105.87009], // New Mexico
  NY: [43.299428, -74.217933], // New York
  NC: [35.759573, -79.0193], // North Carolina
  ND: [47.551493, -101.002012], // North Dakota
  OH: [40.417287, -82.907123], // Ohio
  OK: [35.007752, -97.092877], // Oklahoma
  OR: [43.804133, -120.554201], // Oregon
  PA: [41.203322, -77.194525], // Pennsylvania
  RI: [41.580095, -71.477429], // Rhode Island
  SC: [33.836081, -81.163725], // South Carolina
  SD: [43.969515, -99.901813], // South Dakota
  TN: [35.517491, -86.580447], // Tennessee
  TX: [31.968599, -99.901813], // Texas
  UT: [39.32098, -111.093731], // Utah
  VT: [44.558803, -72.577841], // Vermont
  VA: [37.431573, -78.656894], // Virginia
  WA: [47.751076, -120.740135], // Washington
  WV: [38.597626, -80.454903], // West Virginia
  WI: [43.78444, -88.787868], // Wisconsin
  WY: [43.075968, -107.290284], // Wyoming
};

// Create batch processing utility
const processBatch = <T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => R | null
): R[] => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    batch.forEach((item) => {
      try {
        const result = processor(item);
        if (result) results.push(result);
      } catch (error) {
        console.warn("Error processing item:", error);
      }
    });
  }
  return results;
};

const MapZoomHandler: React.FC<{
  stateCode: string;
  selectedPark: string;
  onParkSelect: (parkCode: string) => void;
  isDarkMap: boolean;
  onToggleMapTheme: () => void;
  containerHeight?: number;
}> = ({
  stateCode,
  selectedPark,
  onParkSelect,
  isDarkMap,
  onToggleMapTheme,
  containerHeight = 710,
}) => {
  const map = useMap();
  const navigate = useNavigate();
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedBoundary, setSelectedBoundary] = useState<ParkBoundary | null>(
    null
  );
  const [stateBoundary, setStateBoundary] = useState<StateBoundary | null>(
    null
  );
  const [trails, setTrails] = useState<TrailFeature[]>([]);
  const [showTrails, setShowTrails] = useState(true); // Show trails by default
  const [isProcessingTrails, setIsProcessingTrails] = useState(false);
  const [campgrounds, setCampgrounds] = useState<Campground[]>([]);
  const [showCampgrounds, setShowCampgrounds] = useState(false);

  // Cleanup function for abortion of fetch requests
  const abortController = React.useRef<AbortController | null>(null);
  // Track if we're currently fetching to prevent duplicate requests
  const isFetchingTrailsRef = React.useRef(false);
  const isFetchingCampgroundsRef = React.useRef(false);
  const isFetchingParkBoundaryRef = React.useRef(false);
  const isFetchingStateBoundaryRef = React.useRef(false);
  // Store map in ref to avoid dependency issues
  const mapRef = React.useRef(map);

  // Update map ref when it changes
  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  const fetchCampgrounds = React.useCallback(async () => {
    if (!selectedPark || isFetchingCampgroundsRef.current) return;

    isFetchingCampgroundsRef.current = true;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/campgrounds/park/${selectedPark}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const campgroundData = await response.json();
      setCampgrounds(campgroundData || []);
    } catch (error) {
      console.error("Error fetching campgrounds:", error);
      setCampgrounds([]);
    } finally {
      isFetchingCampgroundsRef.current = false;
    }
  }, [selectedPark]);

  useEffect(() => {
    fetchCampgrounds();
  }, [selectedPark]); // Only depend on selectedPark, not the callback

  const fetchTrails = React.useCallback(async () => {
    if (!selectedPark || isFetchingTrailsRef.current) return;

    // Abort previous request if exists
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    isFetchingTrailsRef.current = true;
    setIsProcessingTrails(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/trails/unit/${selectedPark}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const trailsData = await response.json();

      console.log(
        `[Trails] Fetched ${
          Array.isArray(trailsData) ? trailsData.length : 0
        } trails for park: ${selectedPark}`
      );

      if (!Array.isArray(trailsData)) {
        console.warn("Trails data is not an array:", trailsData);
        setTrails([]);
        return;
      }

      if (trailsData.length === 0) {
        console.log(`[Trails] No trails found for park: ${selectedPark}`);
        setTrails([]);
        return;
      }

      // Process trails in batches of 50 to prevent UI blocking
      const formattedTrails = processBatch(trailsData, 50, (trail: Trail) => {
        if (!trail?.geometry?.coordinates) {
          console.warn(
            "[Trails] Trail missing geometry:",
            trail?.properties?.TRLNAME
          );
          return null;
        }

        try {
          const coordinates =
            trail.geometry.type === "MultiLineString"
              ? (trail.geometry.coordinates as number[][][]).flat()
              : (trail.geometry.coordinates as number[][]);

          // GeoJSON uses [longitude, latitude] format
          // Validate: lng should be -180 to 180, lat should be -90 to 90
          const validCoordinates = coordinates
            .filter((coord): coord is number[] => {
              if (!Array.isArray(coord) || coord.length < 2) return false;
              const [lng, lat] = coord;
              return (
                !isNaN(lng) &&
                !isNaN(lat) &&
                Math.abs(lng) <= 180 &&
                Math.abs(lat) <= 90
              );
            })
            .map((coord) => [coord[0], coord[1]]); // Keep as [lng, lat]

          if (validCoordinates.length < 2) {
            console.warn(
              `[Trails] Trail has insufficient valid coordinates: ${trail?.properties?.TRLNAME}`
            );
            return null;
          }

          return {
            type: "Feature" as const,
            properties: trail.properties || {},
            geometry: {
              type: "LineString" as const,
              coordinates: validCoordinates,
            },
          };
        } catch (error) {
          console.warn(
            "Error processing trail:",
            error,
            trail?.properties?.TRLNAME
          );
          return null;
        }
      });

      console.log(
        `[Trails] Successfully processed ${formattedTrails.length} out of ${trailsData.length} trails`
      );
      setTrails(formattedTrails);

      // Auto-show trails if we have valid trails
      if (formattedTrails.length > 0 && !showTrails) {
        console.log("[Trails] Auto-showing trails since we have valid data");
        setShowTrails(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Fetch aborted");
      } else {
        console.error("Error fetching trails:", error);
        setTrails([]);
      }
    } finally {
      setIsProcessingTrails(false);
      isFetchingTrailsRef.current = false;
    }
  }, [selectedPark]); // Removed isProcessingTrails from dependencies

  useEffect(() => {
    fetchTrails();
  }, [selectedPark]); // Only depend on selectedPark, not the callback

  const handlePlanTrip = (parkCode: string) => {
    navigate(`/plan/${parkCode}`, { state: { from: "explore" } });
  };

  useEffect(() => {
    const fetchParks = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No auth token found");
          return;
        }

        const response = await fetch(`${API_URL}/api/parks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setParks(data);
      } catch (error) {
        console.error("Error fetching parks:", error);
      }
    };

    fetchParks();
  }, []);

  useEffect(() => {
    if (!selectedPark || isFetchingParkBoundaryRef.current) {
      if (!selectedPark) {
        setSelectedBoundary(null);
      }
      return;
    }

    const fetchParkBoundary = async () => {
      isFetchingParkBoundaryRef.current = true;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/api/park-boundaries/${selectedPark}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const boundaryData = await response.json();
        setSelectedBoundary(boundaryData);

        // If boundary exists, fit the map to the boundary
        if (
          boundaryData &&
          boundaryData.boundaryData &&
          boundaryData.boundaryData.features[0]
        ) {
          // Ensure map size is up to date, then fit bounds
          mapRef.current.invalidateSize();
          // Use setTimeout to ensure size is updated before fitting bounds
          setTimeout(() => {
            const geoJsonLayer = L.geoJSON(
              boundaryData.boundaryData.features[0]
            );
            const bounds = geoJsonLayer.getBounds();
            // Calculate padding based on visible viewport size
            const mapSize = mapRef.current.getSize();
            const paddingX = Math.max(20, mapSize.x * 0.05); // 5% of width, min 20px
            const paddingY = Math.max(20, mapSize.y * 0.05); // 5% of height, min 20px
            mapRef.current.fitBounds(bounds, {
              padding: [paddingY, paddingX],
              animate: true,
              duration: 1.0,
            });
          }, 100);
        }
      } catch (error) {
        console.error("Error fetching park boundary:", error);
        setSelectedBoundary(null);
      } finally {
        isFetchingParkBoundaryRef.current = false;
      }
    };

    fetchParkBoundary();
  }, [selectedPark]); // Removed map from dependencies, using ref instead

  useEffect(() => {
    if (selectedPark && parks.length > 0) {
      const selectedParkData = parks.find(
        (park) => park.parkCode === selectedPark
      );
      if (selectedParkData) {
        const lat = parseFloat(selectedParkData.latitude);
        const lng = parseFloat(selectedParkData.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          // Ensure map size is up to date before zooming
          mapRef.current.invalidateSize();
          // Use setTimeout to ensure size is updated before setting view
          setTimeout(() => {
            mapRef.current.setView([lat, lng], 10, {
              animate: true,
              duration: 1.0,
            });
          }, 100);
          return;
        }
      }
    }
  }, [selectedPark, parks]); // Removed map from dependencies, using ref instead

  // Also zoom when park boundary is loaded (for better fit)
  useEffect(() => {
    if (selectedPark && selectedBoundary?.geometry) {
      try {
        // Ensure map size is up to date, then fit bounds
        mapRef.current.invalidateSize();
        // Use setTimeout to ensure size is updated before fitting bounds
        setTimeout(() => {
          const feature: GeoJSONFeature = {
            type: "Feature",
            geometry: selectedBoundary.geometry,
            properties: {},
          };
          const geoJsonLayer = L.geoJSON(feature);
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            // Calculate padding based on visible viewport size
            const mapSize = mapRef.current.getSize();
            const paddingX = Math.max(20, mapSize.x * 0.05); // 5% of width, min 20px
            const paddingY = Math.max(20, mapSize.y * 0.05); // 5% of height, min 20px
            mapRef.current.fitBounds(bounds, {
              padding: [paddingY, paddingX],
              animate: true,
              duration: 1.0,
            });
          }
        }, 100);
      } catch (error) {
        console.error("Error fitting bounds to park boundary:", error);
      }
    }
  }, [selectedPark, selectedBoundary]);

  useEffect(() => {
    // Only zoom to state if no park is selected
    if (!selectedPark) {
      console.log("stateCode in parkmap", stateCode);
      if (stateCode && stateCoordinates[stateCode]) {
        const [lat, lng] = stateCoordinates[stateCode];
        mapRef.current.setView([lat, lng], 6, {
          animate: true,
          duration: 1.0,
        });
      } else {
        mapRef.current.setView([37.0902, -95.7129], 4, {
          animate: true,
          duration: 1.0,
        });
      }
    }
  }, [stateCode, selectedPark]);

  useEffect(() => {
    if (!stateCode || isFetchingStateBoundaryRef.current) {
      if (!stateCode) {
        setStateBoundary(null);
      }
      return;
    }

    const fetchStateBoundary = async () => {
      isFetchingStateBoundaryRef.current = true;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/api/state-boundaries/${stateCode}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const boundaryData = await response.json();
        console.log("State boundary data:", boundaryData);
        setStateBoundary(boundaryData);

        // If boundary exists, fit the map to the boundary
        if (boundaryData?.geometry) {
          const feature: GeoJSONFeature = {
            type: "Feature",
            geometry: boundaryData.geometry,
            properties: {
              name: boundaryData.name,
              stateCode: boundaryData.abbreviation,
            },
          };
          const geoJsonLayer = L.geoJSON(feature);
          const bounds = geoJsonLayer.getBounds();
          // Ensure map size is up to date
          mapRef.current.invalidateSize();
          // Calculate padding based on visible viewport size
          const mapSize = mapRef.current.getSize();
          const paddingX = Math.max(20, mapSize.x * 0.05); // 5% of width, min 20px
          const paddingY = Math.max(20, mapSize.y * 0.05); // 5% of height, min 20px
          mapRef.current.fitBounds(bounds, {
            padding: [paddingY, paddingX],
            animate: true,
            duration: 1.0,
          });
        }
      } catch (error) {
        console.error("Error fetching state boundary:", error);
        setStateBoundary(null);
      } finally {
        isFetchingStateBoundaryRef.current = false;
      }
    };

    fetchStateBoundary();
  }, [stateCode]); // Removed map from dependencies, using ref instead

  const boundaryStyle = {
    fillColor: "#2d5a27", // Dark green for park boundaries
    fillOpacity: 0.2,
    color: "#2d5a27", // Dark green border
    weight: 2,
    opacity: 0.8,
  };

  const stateBoundaryStyle = {
    fillColor: "#2B4C7E", // Blue fill
    fillOpacity: 0.2,
    color: "#2B4C7E", // Blue border
    weight: 3,
    opacity: 1,
  };

  const getTrailStyle = (trail: TrailFeature) => {
    // Default style
    const baseStyle = {
      weight: 2,
      opacity: 0.8,
      dashArray: "5, 5",
    };

    // Debug logging
    console.log("Trail TRLCLASS:", trail.properties.TRLCLASS);

    // Color based on trail difficulty (TRLCLASS)
    if (trail.properties.TRLCLASS) {
      const difficulty = trail.properties.TRLCLASS.toLowerCase().trim();
      console.log("Processed difficulty:", difficulty);

      // Check if difficulty string contains any of the keywords
      if (
        difficulty.includes("easy") ||
        difficulty.includes("class 1") ||
        difficulty.includes("1") ||
        difficulty.includes("easiest")
      ) {
        return { ...baseStyle, color: "#4CAF50" }; // Bright green for easy trails
      } else if (
        difficulty.includes("moderate") ||
        difficulty.includes("class 2") ||
        difficulty.includes("2")
      ) {
        return { ...baseStyle, color: "#8BC34A" }; // Light green for moderate trails
      } else if (
        difficulty.includes("difficult") ||
        difficulty.includes("class 3") ||
        difficulty.includes("3") ||
        difficulty.includes("strenuous")
      ) {
        return { ...baseStyle, color: "#FFC107" }; // Yellow for difficult trails
      } else if (
        difficulty.includes("very difficult") ||
        difficulty.includes("class 4") ||
        difficulty.includes("4") ||
        difficulty.includes("very strenuous")
      ) {
        return { ...baseStyle, color: "#FF5722" }; // Orange for very difficult trails
      } else if (
        difficulty.includes("most difficult") ||
        difficulty.includes("class 5") ||
        difficulty.includes("5") ||
        difficulty.includes("most strenuous")
      ) {
        return { ...baseStyle, color: "#F44336" }; // Red for most difficult trails
      } else {
        console.log("Unknown difficulty:", difficulty);
        return { ...baseStyle, color: "#9E9E9E" }; // Gray for unknown difficulty
      }
    }

    return { ...baseStyle, color: "#9E9E9E" }; // Default gray
  };

  return (
    <>
      {/* Map theme toggle button */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 z-[1000]">
        <button
          onClick={onToggleMapTheme}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-1.5 md:p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1 md:gap-2"
          title={isDarkMap ? "Switch to light map" : "Switch to dark map"}
        >
          {isDarkMap ? (
            <>
              <FaSun className="text-base md:text-lg" />
              <span className="hidden md:inline text-sm font-medium">
                Light Map
              </span>
            </>
          ) : (
            <>
              <FaMoon className="text-base md:text-lg" />
              <span className="hidden md:inline text-sm font-medium">
                Dark Map
              </span>
            </>
          )}
        </button>
      </div>

      {/* Map controls container - Zoom and USA button */}
      <div
        className="absolute right-2 md:right-4 z-[1000] flex flex-col items-end gap-1.5 md:gap-2"
        style={{
          bottom: containerHeight ? Math.max(50, containerHeight * 0.06) : 50,
        }}
      >
        {/* Zoom to USA button - positioned below zoom controls */}
        <button
          onClick={() => {
            map.setView([37.0902, -95.7129], 4, {
              animate: true,
              duration: 1.0,
            });
          }}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-1.5 md:px-3 md:py-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center gap-1 md:gap-2"
          title="Zoom to USA"
        >
          <FaGlobe className="text-base md:text-lg flex-shrink-0" />
          <span className="hidden md:inline text-xs md:text-sm font-medium whitespace-nowrap">
            USA
          </span>
        </button>
      </div>

      {/* Add trail toggle button */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 z-[1000] bg-white dark:bg-gray-800 p-1.5 md:p-2 rounded-lg shadow-lg flex flex-row gap-1 md:gap-2 map-controls">
        <button
          onClick={() => setShowTrails(!showTrails)}
          className={`flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-md transition-colors duration-200 ${
            showTrails
              ? "bg-[#4CAF50] dark:bg-gray-600 text-white dark:text-gray-200"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <FaHiking className="text-base md:text-lg" />
          <span className="hidden md:inline text-sm font-medium">
            {showTrails ? "Hide Trails" : "Show Trails"}
          </span>
        </button>

        <button
          onClick={() => setShowCampgrounds(!showCampgrounds)}
          className={`flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-md transition-colors duration-200 ${
            showCampgrounds
              ? "bg-[#FFA726] dark:bg-gray-600 text-white dark:text-gray-200"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <FaCampground className="text-base md:text-lg" />
          <span className="hidden md:inline text-sm font-medium">
            {showCampgrounds ? "Hide Campgrounds" : "Show Campgrounds"}
          </span>
        </button>

        {/* Trail difficulty legend */}
        {showTrails && (
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg">
            <div className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
              Trail Difficulty:
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-1 bg-[#4CAF50] legend-color"></div>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Easy
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-1 bg-[#8BC34A] legend-color"></div>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Moderate
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[#FFC107] legend-color"></div>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Difficult
              </span>
            </div>
          </div>
        )}
      </div>

      {stateBoundary?.geometry && (
        <GeoJSON
          key={stateBoundary.id || stateBoundary.abbreviation}
          data={
            {
              type: "Feature",
              geometry: stateBoundary.geometry,
              properties: {
                name: stateBoundary.name,
                stateCode: stateBoundary.abbreviation,
              },
            } as GeoJSONFeature
          }
          style={stateBoundaryStyle}
          onEachFeature={(feature, layer) => {
            layer.on({
              mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: 0.4,
                  weight: 4,
                  opacity: 1,
                });
              },
              mouseout: (e) => {
                const layer = e.target;
                layer.setStyle(stateBoundaryStyle);
              },
            });

            layer.bindPopup(`
              <div class="text-center">
                <strong class="block text-[#2B4C7E] text-sm mb-1">
                  ${feature.properties.name}
                </strong>
              </div>
            `);
          }}
        />
      )}
      {selectedBoundary?.boundaryData?.features[0] && (
        <GeoJSON
          key={selectedBoundary._id}
          data={selectedBoundary.boundaryData.features[0]}
          style={boundaryStyle}
          onEachFeature={(feature, layer) => {
            layer.on({
              mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: 0.4,
                  weight: 3,
                  opacity: 1,
                });
              },
              mouseout: (e) => {
                const layer = e.target;
                layer.setStyle(boundaryStyle);
              },
            });

            layer.bindPopup(`
              <div class="text-center">
                <strong class="block text-[#2d5a27] text-sm mb-1">
                  ${feature.properties.name}
                </strong>
                <span class="text-xs text-gray-600">
                  ${feature.properties.designation.name}
                </span>
              </div>
            `);
          }}
        />
      )}
      {showTrails &&
        trails.map((trail, index) => (
          <GeoJSON
            key={`trail-${index}-${trail.properties.TRLNAME}`}
            data={trail}
            style={getTrailStyle(trail)}
            onEachFeature={(feature, layer) => {
              layer.on({
                mouseover: (e) => {
                  const layer = e.target;
                  const currentStyle = getTrailStyle(feature as TrailFeature);
                  layer.setStyle({
                    ...currentStyle,
                    weight: 3,
                    opacity: 1,
                    dashArray: "0",
                  });
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle(getTrailStyle(feature as TrailFeature));
                },
              });

              layer.bindPopup(`
              <div class="text-center">
                <strong class="block text-black text-sm mb-1">
                  ${feature.properties.TRLNAME}
                </strong>
                ${
                  feature.properties.TRLALTNAME
                    ? `
                  <span class="block text-xs text-gray-600 mb-1">
                    ${feature.properties.TRLALTNAME}
                  </span>
                `
                    : ""
                }
                <div class="text-xs text-gray-600">
                  ${
                    feature.properties.TRLSTATUS &&
                    feature.properties.TRLSTATUS !== "Unknown"
                      ? `<p>Status: ${feature.properties.TRLSTATUS}</p>`
                      : ""
                  }
                  ${
                    feature.properties.TRLSURFACE &&
                    feature.properties.TRLSURFACE !== "Unknown"
                      ? `<p>Surface: ${feature.properties.TRLSURFACE}</p>`
                      : ""
                  }
                  ${
                    feature.properties.TRLTYPE &&
                    feature.properties.TRLTYPE !== "Unknown"
                      ? `<p>Type: ${feature.properties.TRLTYPE}</p>`
                      : ""
                  }
                  ${
                    feature.properties.TRLCLASS &&
                    feature.properties.TRLCLASS !== "Unknown"
                      ? `<p>Class: ${feature.properties.TRLCLASS}</p>`
                      : ""
                  }
                  ${
                    feature.properties.TRLUSE &&
                    feature.properties.TRLUSE !== "Unknown"
                      ? `<p>Use: ${feature.properties.TRLUSE}</p>`
                      : ""
                  }
                  ${
                    feature.properties.SEASONAL === "Yes" &&
                    feature.properties.SEASDESC
                      ? `
                    <p class="text-red-600">Seasonal: ${feature.properties.SEASDESC}</p>
                  `
                      : ""
                  }
                  ${
                    feature.properties.MAINTAINER &&
                    feature.properties.MAINTAINER !== "Unknown"
                      ? `<p>Maintainer: ${feature.properties.MAINTAINER}</p>`
                      : ""
                  }
                  ${
                    feature.properties.NOTES
                      ? `<p>Notes: ${feature.properties.NOTES}</p>`
                      : ""
                  }
                </div>
              </div>
            `);
            }}
          />
        ))}
      {showCampgrounds &&
        campgrounds.map((campground, index) => (
          <Marker
            key={`campground-${index}-${campground.name}`}
            position={[campground.latitude, campground.longitude]}
            icon={campgroundIcon}
            eventHandlers={{
              click: () => {
                map.setView([campground.latitude, campground.longitude], 12, {
                  animate: true,
                  duration: 1,
                });
              },
              mouseover: (e) => {
                const marker = e.target;
                marker.openPopup();
              },
            }}
          >
            <Popup>
              <div className="text-center min-w-[250px]">
                <strong className="block text-[#FFA726] text-lg mb-2">
                  {campground.name}
                </strong>
                <div className="text-xs text-gray-600">
                  <p className="mb-1">
                    <span className="font-medium">Type:</span> {campground.type}
                  </p>
                  {campground.amenities && campground.amenities.length > 0 && (
                    <p className="mb-1">
                      <span className="font-medium">Amenities:</span>{" "}
                      {campground.amenities.join(", ")}
                    </p>
                  )}
                  {campground.accessibility && (
                    <>
                      {campground.accessibility.wheelchairAccess && (
                        <p className="mb-1">♿ Wheelchair Accessible</p>
                      )}
                      {campground.accessibility.rvAllowed && (
                        <p className="mb-1">🚐 RV Allowed</p>
                      )}
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-2 mb-3">
                  <p className="line-clamp-2">{campground.description}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      {parks.map((park) => {
        const lat = parseFloat(park.latitude);
        const lng = parseFloat(park.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          return (
            <Marker
              key={park.parkCode}
              position={[lat, lng]}
              icon={
                selectedPark === park.parkCode ? highlightedParkIcon : parkIcon
              }
              zIndexOffset={selectedPark === park.parkCode ? 1000 : 0}
              eventHandlers={{
                click: () => {
                  onParkSelect(park.parkCode);
                  // Ensure map size is up to date before zooming
                  map.invalidateSize();
                  // Use setTimeout to ensure size is updated before setting view
                  setTimeout(() => {
                    map.setView([lat, lng], 10, {
                      animate: true,
                      duration: 1,
                    });
                  }, 100);
                },
                mouseover: (e) => {
                  const marker = e.target;
                  marker.openPopup();
                },
              }}
            >
              <Popup>
                <div className="text-center min-w-[250px]">
                  <strong className="block text-[#2B4C7E] text-lg mb-2">
                    {park.name}
                  </strong>
                  <img
                    src={park.images[0]?.url}
                    alt={park.name}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                    onError={(e) => {
                      e.currentTarget.src = `https://source.unsplash.com/400x300/?${encodeURIComponent(
                        park.name
                      )},national+park`;
                    }}
                  />
                  <div className="text-xs text-gray-600">
                    <p className="mb-1">
                      <span className="font-medium">Location:</span>{" "}
                      {park.latitude}, {park.longitude}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">State:</span> {park.states}
                    </p>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 mb-3">
                    <p className="line-clamp-2">{park.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePlanTrip(park.parkCode)}
                      className="flex-1 bg-[#97a88c] text-white py-1.5 px-3 rounded-md hover:bg-[#7a8971] transition-colors duration-200 text-sm"
                    >
                      Plan Trip
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }
        return null;
      })}
    </>
  );
};

// Map theme aware tile layer component
const MapThemeTileLayer: React.FC<{ isDarkMap: boolean }> = ({ isDarkMap }) => {
  return isDarkMap ? (
    <TileLayer
      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      subdomains="abcd"
      className="dark-map-tiles"
    />
  ) : (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
  );
};

const ParkMap: React.FC<ParkMapProps> = ({
  stateCode,
  selectedPark,
  onParkSelect,
}) => {
  const [isDarkMap, setIsDarkMap] = useState(false);
  const { isDarkMode } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Initialize map theme based on global dark mode
  useEffect(() => {
    setIsDarkMap(isDarkMode);
  }, [isDarkMode]);

  // Measure container size for responsive button positioning
  useEffect(() => {
    const updateSize = () => {
      if (mapContainerRef.current) {
        setContainerSize({
          width: mapContainerRef.current.offsetWidth,
          height: mapContainerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleToggleMapTheme = () => {
    setIsDarkMap((prev) => !prev);
  };

  return (
    <div ref={mapContainerRef} className="w-full h-[710px] relative">
      <MapContainer
        center={[37.0902, -95.7129]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <MapThemeTileLayer isDarkMap={isDarkMap} />
        <MapZoomHandler
          stateCode={stateCode}
          selectedPark={selectedPark}
          onParkSelect={onParkSelect}
          isDarkMap={isDarkMap}
          onToggleMapTheme={handleToggleMapTheme}
          containerHeight={containerSize.height}
        />
      </MapContainer>
    </div>
  );
};

// Memoize to prevent re-mounting when props change
export default React.memo(ParkMap);
