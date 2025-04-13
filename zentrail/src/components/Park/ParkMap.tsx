import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  GeoJSON,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaHiking } from "react-icons/fa";

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
  states: string;
  description: string;
  images: {
    url: string;
    title: string;
    caption: string;
    credit: string;
  }[];
  designation: string;
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

const MapZoomHandler: React.FC<{
  stateCode: string;
  selectedPark: string;
  onParkSelect: (parkCode: string) => void;
}> = ({ stateCode, selectedPark, onParkSelect }) => {
  const map = useMap();
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedBoundary, setSelectedBoundary] = useState<ParkBoundary | null>(
    null
  );
  const [stateBoundary, setStateBoundary] = useState<StateBoundary | null>(
    null
  );
  const [trails, setTrails] = useState<TrailFeature[]>([]);
  const [showTrails, setShowTrails] = useState(false);

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
    const fetchParkBoundary = async () => {
      if (selectedPark) {
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
            const geoJsonLayer = L.geoJSON(
              boundaryData.boundaryData.features[0]
            );
            const bounds = geoJsonLayer.getBounds();
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        } catch (error) {
          console.error("Error fetching park boundary:", error);
          setSelectedBoundary(null);
        }
      } else {
        setSelectedBoundary(null);
      }
    };

    fetchParkBoundary();
  }, [selectedPark, map]);

  useEffect(() => {
    if (selectedPark && parks.length > 0) {
      const selectedParkData = parks.find(
        (park) => park.parkCode === selectedPark
      );
      if (selectedParkData) {
        const lat = parseFloat(selectedParkData.latitude);
        const lng = parseFloat(selectedParkData.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          map.setView([lat, lng], 10);
          return;
        }
      }
    }
  }, [selectedPark, parks, map]);

  useEffect(() => {
    console.log("stateCode in parkmap", stateCode);
    if (stateCode && stateCoordinates[stateCode]) {
      const [lat, lng] = stateCoordinates[stateCode];
      map.setView([lat, lng], 6);
    } else {
      map.setView([37.0902, -95.7129], 4);
    }
  }, [stateCode]);

  useEffect(() => {
    const fetchStateBoundary = async () => {
      if (stateCode) {
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
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        } catch (error) {
          console.error("Error fetching state boundary:", error);
          setStateBoundary(null);
        }
      } else {
        setStateBoundary(null);
      }
    };

    fetchStateBoundary();
  }, [stateCode, map]);

  useEffect(() => {
    const fetchTrails = async () => {
      if (selectedPark) {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${API_URL}/api/trails/unit/${selectedPark}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const trailsData = await response.json();
          console.log("Raw trails data:", trailsData);

          // Ensure trailsData is an array and has valid data
          if (!Array.isArray(trailsData)) {
            console.error("Trails data is not an array:", trailsData);
            setTrails([]);
            return;
          }

          // Format trails with proper error handling
          const formattedTrails = trailsData
            .filter((trail: Trail) => {
              // Check if trail has required properties
              if (!trail || !trail.geometry || !trail.geometry.coordinates) {
                console.warn("Invalid trail data:", trail);
                return false;
              }
              return true;
            })
            .map((trail: Trail) => {
              console.log("Trail properties:", trail.properties);
              // Handle both LineString and MultiLineString
              const coordinates =
                trail.geometry.type === "MultiLineString"
                  ? (trail.geometry.coordinates as number[][][]).flat()
                  : (trail.geometry.coordinates as number[][]);

              // Filter and process coordinates
              const validCoordinates = coordinates
                .filter(
                  (coord): coord is number[] =>
                    Array.isArray(coord) && coord.length >= 2
                )
                .map((coord) => coord.slice(0, 2));

              return {
                type: "Feature" as const,
                properties: trail.properties || {},
                geometry: {
                  type: "LineString" as const,
                  coordinates: validCoordinates,
                },
              };
            })
            .filter((trail) => trail.geometry.coordinates.length > 0);

          setTrails(formattedTrails);
        } catch (error) {
          console.error("Error fetching trails:", error);
          setTrails([]);
        }
      } else {
        setTrails([]);
      }
    };

    fetchTrails();
  }, [selectedPark]);

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
      {/* Add trail toggle button */}
      <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded-lg shadow-lg">
        <button
          onClick={() => setShowTrails(!showTrails)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ${
            showTrails ? "bg-[#4CAF50] text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          <FaHiking className="text-lg" />
          <span className="text-sm font-medium">
            {showTrails ? "Hide Trails" : "Show Trails"}
          </span>
        </button>
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
                  map.setView([lat, lng], 10, {
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
                  <strong className="block text-[#2B4C7E] text-lg mb-2">
                    {park.name}
                  </strong>
                  <img
                    src={park.images[0].url}
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
                  <div className="text-xs text-gray-600 mt-2">
                    <p className="line-clamp-2">{park.description}</p>
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

const ParkMap: React.FC<ParkMapProps> = ({
  stateCode,
  selectedPark,
  onParkSelect,
}) => {
  return (
    <div className="w-full h-[710px]">
      <MapContainer
        center={[37.0902, -95.7129]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapZoomHandler
          stateCode={stateCode}
          selectedPark={selectedPark}
          onParkSelect={onParkSelect}
        />
      </MapContainer>
    </div>
  );
};

export default ParkMap;
