import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useTheme } from "../../context/ThemeContext";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaArrowLeft,
  FaHiking,
  FaCampground,
  FaComments,
  FaTimes,
  FaDownload,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
  ZoomControl,
} from "react-leaflet";
import { Feature, Geometry, FeatureCollection } from "geojson";
import { PathOptions, LineCapShape, LineJoinShape } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import Logger from "../../utils/logger";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Park {
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  parkCode: string;
  activities: Array<{
    id: string;
    name: string;
  }>;
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
        name: string;
        designation: {
          name: string;
        };
      };
    }>;
  };
}

interface ChatResponse {
  response: string;
  relevant_parks: Park[];
}

interface Trail {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
  properties: {
    TRLNAME: string;
    TRLCLASS: string;
    TRLUSE: string;
    TRLALTNAME?: string;
    TRLSTATUS?: string;
    TRLSURFACE?: string;
    TRLTYPE?: string;
    SEASONAL?: string;
    SEASDESC?: string;
    MAINTAINER?: string;
    NOTES?: string;
  };
}

interface Campground {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  reservationUrl: string;
}

interface ChatMessage {
  text: string;
  isUser: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";
const CHATBOT_API_URL =
  import.meta.env.VITE_CHATBOT_API_URL || "http://localhost:8000";

const transformToGeoJSON = (trail: any): Trail | null => {
  try {
    if (
      !trail.geometry?.coordinates ||
      !Array.isArray(trail.geometry.coordinates)
    ) {
      return null;
    }

    const coordinates =
      trail.geometry.type === "MultiLineString"
        ? trail.geometry.coordinates.flat()
        : trail.geometry.coordinates;

    const validCoordinates = coordinates
      .filter(
        (coord: any): coord is number[] =>
          Array.isArray(coord) &&
          coord.length >= 2 &&
          !isNaN(coord[0]) &&
          !isNaN(coord[1]) &&
          Math.abs(coord[0]) <= 180 &&
          Math.abs(coord[1]) <= 90
      )
      .map((coord: number[]) => coord.slice(0, 2));

    if (validCoordinates.length < 2) return null;

    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: validCoordinates,
      },
      properties: trail.properties || {},
    };
  } catch (error) {
    console.warn("Error transforming trail:", error);
    return null;
  }
};

const boundaryStyle: PathOptions = {
  fillColor: "#2C3930",
  fillOpacity: 0.12,
  color: "#2C3930",
  weight: 1.5,
  opacity: 1,
  dashArray: undefined,
  lineCap: "butt" as LineCapShape,
  lineJoin: "miter" as LineJoinShape,
};

const MapController: React.FC<{
  park: Park | null;
  parkBoundary: ParkBoundary | null;
  trails: Trail[];
  campgrounds: Campground[];
}> = React.memo(
  ({ park, parkBoundary, trails, campgrounds }) => {
    const map = useMap();
    const initialBoundSet = useRef(false);

    useEffect(() => {
      if (!map || initialBoundSet.current) return;

      try {
        const bounds = L.latLngBounds([]);
        let hasFeatures = false;

        // Add park boundary to bounds
        if (parkBoundary?.boundaryData?.features[0]) {
          const boundaryLayer = L.geoJSON(
            parkBoundary.boundaryData.features[0],
            {
              style: {
                weight: 1.5,
                opacity: 1,
                color: "#2C3930",
                fillOpacity: 0.12,
                fillColor: "#2C3930",
              },
            }
          );
          bounds.extend(boundaryLayer.getBounds());
          hasFeatures = true;
        }

        // Add trails to bounds
        if (trails.length > 0) {
          const trailsCollection: FeatureCollection = {
            type: "FeatureCollection",
            features: trails as Feature[],
          };
          const trailsLayer = L.geoJSON(trailsCollection);
          bounds.extend(trailsLayer.getBounds());
          hasFeatures = true;
        }

        // Add campgrounds to bounds
        if (campgrounds.length > 0) {
          campgrounds.forEach((campground) => {
            bounds.extend([campground.latitude, campground.longitude]);
          });
          hasFeatures = true;
        }

        if (hasFeatures) {
          // Fit the map to the bounds with some padding
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 11,
            animate: true,
          });
          initialBoundSet.current = true;
        } else if (park) {
          // Fallback to park center if no features
          const lat = parseFloat(park.latitude);
          const lng = parseFloat(park.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], 10, { animate: true });
            initialBoundSet.current = true;
          }
        }
      } catch (error) {
        console.error("Error setting map view:", error);
        if (park) {
          const lat = parseFloat(park.latitude);
          const lng = parseFloat(park.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], 10, { animate: true });
            initialBoundSet.current = true;
          }
        }
      }

      return () => {
        if (map) {
          try {
            initialBoundSet.current = false;
            map.setView([39.8283, -98.5795], 4, { animate: true });
          } catch (error) {
            console.error("Error resetting map view:", error);
          }
        }
      };
    }, [map, park, parkBoundary, trails, campgrounds]);

    return null;
  },
  (prevProps, nextProps) => {
    return (
      prevProps.park?.latitude === nextProps.park?.latitude &&
      prevProps.park?.longitude === nextProps.park?.longitude &&
      prevProps.parkBoundary?._id === nextProps.parkBoundary?._id &&
      prevProps.trails === nextProps.trails &&
      prevProps.campgrounds === nextProps.campgrounds
    );
  }
);

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

const getTrailStyle = (feature: Feature<Geometry> | undefined): PathOptions => {
  if (!feature) {
    return {
      weight: 2,
      opacity: 0.8,
      dashArray: "5, 5",
      color: "#9E9E9E",
    };
  }

  const trail = feature as unknown as Trail;
  const difficultyColors = {
    easy: "#4CAF50",
    moderate: "#FFA726",
    difficult: "#E53935",
  };

  const baseStyle = {
    weight: 2,
    opacity: 0.8,
    dashArray: "5, 5",
  };

  if (trail.properties.TRLCLASS) {
    const difficulty = trail.properties.TRLCLASS.toLowerCase();
    if (difficulty.includes("easy") || difficulty.includes("class 1")) {
      return { ...baseStyle, color: difficultyColors.easy };
    } else if (
      difficulty.includes("moderate") ||
      difficulty.includes("class 2")
    ) {
      return { ...baseStyle, color: difficultyColors.moderate };
    } else if (
      difficulty.includes("difficult") ||
      difficulty.includes("class 3")
    ) {
      return { ...baseStyle, color: difficultyColors.difficult };
    }
  }
  return { ...baseStyle, color: "#9E9E9E" };
};
const campgroundIcon = L.icon({
  iconUrl: "/assets/campground-marker.svg", // Replace with the actual path to your icon
  iconSize: [25, 41], // Adjust size as needed
  iconAnchor: [12, 41], // Adjust anchor point as needed
  popupAnchor: [1, -34], // Adjust popup anchor as needed
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  shadowSize: [41, 41], // Adjust shadow size as needed
});
//
// const Plan: React.FC = () => {
const Plan: React.FC = () => {
  const { parkCode } = useParams<{ parkCode?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const [isDarkMap, setIsDarkMap] = useState(false);

  // Initialize map theme based on global dark mode
  useEffect(() => {
    setIsDarkMap(isDarkMode);
  }, [isDarkMode]);

  const [state, setState] = useState(() => ({
    query: "",
    loading: false,
    error: null as string | null,
    currentPark: null as Park | null,
    parkActivities: [] as Array<{ id: string; name: string }>,
    trails: [] as Trail[],
    campgrounds: [] as Campground[],
    showTrails: true,
    showCampgrounds: false,
    chatResponse: null as ChatResponse | null,
    loadingTrails: false,
    messages: [] as ChatMessage[],
  }));
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [parkBoundary, setParkBoundary] = useState<ParkBoundary | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const makeAuthenticatedRequest = useCallback(
    async (url: string, options: { method?: string; data?: any } = {}) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      try {
        const response = await axios({
          url,
          method: options.method || "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: options.data,
          signal: abortControllerRef.current.signal,
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            localStorage.removeItem("token");
            navigate("/signin");
            throw new Error("Authentication failed - please sign in again");
          }
          throw new Error(
            error.response?.data?.message || "API request failed"
          );
        }
        throw error;
      }
    },
    [navigate]
  );

  const debouncedHandleSendMessage = useCallback(
    async (userQuery: string) => {
      setState((prev) => ({
        ...prev,
        loading: true,
        messages: [...prev.messages, { text: userQuery, isUser: true }],
      }));

      try {
        const response = await axios.post(
          `${CHATBOT_API_URL}/chat`,
          {
            query: userQuery,
            parkCode: parkCode,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        setState((prev) => ({
          ...prev,
          chatResponse: response.data,
          loading: false,
          messages: [
            ...prev.messages,
            { text: response.data.response, isUser: false },
          ],
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to get response",
          loading: false,
          messages: [
            ...prev.messages,
            {
              text: "Sorry, I encountered an error processing your request.",
              isUser: false,
            },
          ],
        }));
        Logger.error("Plan", "Chat request failed", error);
      }
    },
    [parkCode]
  );

  const fetchTrails = useCallback(
    async (unitCode: string) => {
      setState((prev) => ({ ...prev, loadingTrails: true }));
      try {
        const trailsData = await makeAuthenticatedRequest(
          `${API_URL}/api/trails/unit/${unitCode}`
        );
        const validTrails = (Array.isArray(trailsData) ? trailsData : [])
          .map(transformToGeoJSON)
          .filter((trail): trail is Trail => trail !== null);

        setState((prev) => ({
          ...prev,
          trails: validTrails,
          loadingTrails: false,
        }));
      } catch (error) {
        console.error("Error fetching trails:", error);
        setState((prev) => ({
          ...prev,
          trails: [],
          loadingTrails: false,
          error:
            error instanceof Error ? error.message : "Failed to load trails",
        }));
      }
    },
    [makeAuthenticatedRequest]
  );

  const fetchCampgrounds = useCallback(
    async (unitCode: string) => {
      try {
        const campgroundsData = await makeAuthenticatedRequest(
          `${API_URL}/api/campgrounds/park/${unitCode}`
        );
        setState((prev) => ({
          ...prev,
          campgrounds: campgroundsData || [],
        }));
      } catch (error) {
        console.error("Error fetching campgrounds:", error);
        setState((prev) => ({
          ...prev,
          campgrounds: [],
          error:
            error instanceof Error
              ? error.message
              : "Failed to load campgrounds",
        }));
      }
    },
    [makeAuthenticatedRequest]
  );

  useEffect(() => {
    if (!parkCode) return;

    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    const fetchParkData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const parkData = await makeAuthenticatedRequest(
          `${API_URL}/api/parks/park/${parkCode}`
        );
        setState((prev) => ({
          ...prev,
          currentPark: parkData,
          parkActivities: parkData.activities || [],
        }));

        await fetchTrails(parkCode);
        await fetchCampgrounds(parkCode);
        await debouncedHandleSendMessage(
          `Tell me about activities and attractions in ${parkData.name}`
        );
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          timeoutRef.current = setTimeout(
            () => fetchParkData(),
            RETRY_DELAY * retryCount
          );
          return;
        }

        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load park details",
          loading: false,
        }));
        Logger.error("Plan", "Error fetching park details", error);
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchParkData();
  }, [
    parkCode,
    makeAuthenticatedRequest,
    debouncedHandleSendMessage,
    fetchTrails,
    fetchCampgrounds,
  ]);

  useEffect(() => {
    if (!parkCode) return;

    const fetchParkBoundary = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_URL}/api/park-boundaries/${parkCode}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setParkBoundary(response.data);
      } catch (error) {
        console.error("Error fetching park boundary:", error);
        setParkBoundary(null);
      }
    };

    fetchParkBoundary();
  }, [parkCode]);

  const groupActivities = (activities: Array<{ id: string; name: string }>) => {
    const categories = {
      hiking: ["Hiking", "Day Hiking", "Backpacking", "Walking"],
      camping: [
        "Camping",
        "Backcountry Camping",
        "Car or Front Country Camping",
        "RV Camping",
      ],
      wildlife: ["Wildlife Viewing", "Birdwatching", "Animal Watching"],
      water: [
        "Swimming",
        "Boating",
        "Kayaking",
        "Canoeing",
        "Fishing",
        "Paddling",
      ],
      winter: [
        "Snow Play",
        "Cross-Country Skiing",
        "Snowshoeing",
        "Winter Sports",
      ],
      other: [],
    };

    return activities.reduce((acc, activity) => {
      let categoryFound = false;
      for (const [category, keywords] of Object.entries(categories)) {
        if (
          keywords.some((keyword) =>
            activity.name.toLowerCase().includes(keyword.toLowerCase())
          )
        ) {
          if (!acc[category]) acc[category] = [];
          acc[category].push(activity);
          categoryFound = true;
          break;
        }
      }
      if (!categoryFound) {
        if (!acc.other) acc.other = [];
        acc.other.push(activity);
      }
      return acc;
    }, {} as Record<string, typeof activities>);
  };

  const handleTrailFeature = useCallback((feature: Trail, layer: any) => {
    const handleMouseOver = (e: any) => {
      const layer = e.target;
      const currentStyle = getTrailStyle(feature);
      layer.setStyle({
        ...currentStyle,
        weight: 3,
        opacity: 1,
        dashArray: "0",
      });
    };

    const handleMouseOut = (e: any) => {
      const layer = e.target;
      layer.setStyle(getTrailStyle(feature));
    };

    layer.on({
      mouseover: handleMouseOver,
      mouseout: handleMouseOut,
    });

    layer.bindPopup(`
            <div class="text-center">
                <strong class="block text-black text-sm mb-1">
                    ${feature.properties.TRLNAME}
                </strong>
                ${
                  feature.properties.TRLALTNAME
                    ? `<span class="block text-xs text-gray-600 mb-1">
                            ${feature.properties.TRLALTNAME}
                        </span>`
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
                        ? `<p class="text-red-600">Seasonal: ${feature.properties.SEASDESC}</p>`
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
  }, []);

  const predefinedQueries = parkCode
    ? [
        `What are the best hiking trails in ${
          state.currentPark?.name || "this park"
        }?`,
        `What are the camping options in ${
          state.currentPark?.name || "this park"
        }?`,
        `What's the best time to visit ${
          state.currentPark?.name || "this park"
        }?`,
        `What are the must-see attractions in ${
          state.currentPark?.name || "this park"
        }?`,
        `What activities are available in ${
          state.currentPark?.name || "this park"
        }?`,
      ]
    : [
        "Show me parks with hiking trails",
        "Which parks are best for camping?",
        "Parks with astronomy activities",
        "Family-friendly parks",
        "Parks with water activities",
      ];

  const mapCenter = useMemo(() => [39.8283, -98.5795] as [number, number], []);

  const handleDownloadPDF = async () => {
    if (!state.currentPark || !mapRef.current) return;

    try {
      setState((prev) => ({ ...prev, loading: true }));

      // Wait for any map animations to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Capture the map with current view
      const mapCanvas = await html2canvas(mapRef.current, {
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        scale: 2, // Higher resolution
        logging: false,
        backgroundColor: null,
      });

      // Create PDF with landscape orientation for better map display
      const pdf = new jsPDF("l", "mm", "a4"); // Changed to landscape
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add park name as header
      pdf.setFontSize(24);
      pdf.setTextColor(44, 57, 48); // #2C3930
      pdf.text(state.currentPark.name, pageWidth / 2, 15, { align: "center" });

      // Add description
      pdf.setFontSize(11);
      pdf.setTextColor(77, 94, 86);
      const splitDescription = pdf.splitTextToSize(
        state.currentPark.description,
        pageWidth - 20
      );
      pdf.text(splitDescription, 10, 25);

      // Calculate space used by description
      const descriptionHeight = splitDescription.length * 5; // Approximate height of description

      // Add map image - make it as large as possible while maintaining aspect ratio
      const mapImage = mapCanvas.toDataURL("image/jpeg", 1.0);
      const mapAspectRatio = mapCanvas.width / mapCanvas.height;

      // Calculate maximum available space for map
      const maxMapWidth = pageWidth - 20; // 10mm margin on each side
      const maxMapHeight = pageHeight - (40 + descriptionHeight); // Leave space for header and description

      let mapWidth = maxMapWidth;
      let mapHeight = mapWidth / mapAspectRatio;

      // If height is too large, scale based on height instead
      if (mapHeight > maxMapHeight) {
        mapHeight = maxMapHeight;
        mapWidth = mapHeight * mapAspectRatio;
      }

      // Center map horizontally
      const mapX = (pageWidth - mapWidth) / 2;
      const mapY = 30 + descriptionHeight;

      // Add high-quality map image
      pdf.addImage(
        mapImage,
        "JPEG",
        mapX,
        mapY,
        mapWidth,
        mapHeight,
        undefined,
        "FAST"
      );

      // Add a new page for activities and other information
      pdf.addPage("p"); // Switch back to portrait for the rest of the content

      // Reset page dimensions for portrait orientation
      const portraitWidth = pdf.internal.pageSize.getWidth();
      const portraitHeight = pdf.internal.pageSize.getHeight();

      // Add activities section
      let yPosition = 20;
      pdf.setFontSize(16);
      pdf.setTextColor(44, 57, 48);
      pdf.text("Available Activities", 10, yPosition);

      // Add activities by category
      yPosition += 8;
      pdf.setFontSize(11);
      const groupedActivities = groupActivities(state.parkActivities);

      Object.entries(groupedActivities).forEach(([category, activities]) => {
        if (yPosition > portraitHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        // Category header
        pdf.setFontSize(13);
        pdf.setTextColor(43, 76, 126);
        const categoryName =
          category.charAt(0).toUpperCase() + category.slice(1);
        pdf.text(categoryName, 10, yPosition);
        yPosition += 6;

        // Activities in category
        pdf.setFontSize(11);
        pdf.setTextColor(77, 94, 86);
        activities.forEach((activity) => {
          if (yPosition > portraitHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`• ${activity.name}`, 15, yPosition);
          yPosition += 5;
        });

        yPosition += 5;
      });

      // Add trails section if available
      if (state.showTrails && state.trails.length > 0) {
        if (yPosition > portraitHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(44, 57, 48);
        pdf.text("Trails", 10, yPosition);
        yPosition += 8;

        pdf.setFontSize(11);
        pdf.setTextColor(77, 94, 86);
        state.trails.forEach((trail) => {
          if (yPosition > portraitHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`• ${trail.properties.TRLNAME}`, 15, yPosition);
          if (
            trail.properties.TRLCLASS &&
            trail.properties.TRLCLASS !== "Unknown"
          ) {
            pdf.text(
              `  Difficulty: ${trail.properties.TRLCLASS}`,
              20,
              yPosition + 4
            );
            yPosition += 8;
          } else {
            yPosition += 5;
          }
        });
      }

      // Add campgrounds section if available
      if (state.showCampgrounds && state.campgrounds.length > 0) {
        if (yPosition > portraitHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(44, 57, 48);
        pdf.text("Campgrounds", 10, yPosition);
        yPosition += 8;

        pdf.setFontSize(11);
        pdf.setTextColor(77, 94, 86);
        state.campgrounds.forEach((campground) => {
          if (yPosition > portraitHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`• ${campground.name}`, 15, yPosition);
          const splitDesc = pdf.splitTextToSize(
            campground.description,
            portraitWidth - 30
          );
          pdf.text(splitDesc, 20, yPosition + 4);
          yPosition += 8 + splitDesc.length * 4;
        });
      }

      // Save the PDF
      pdf.save(`${state.currentPark.name.replace(/\s+/g, "_")}_guide.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] to-[#d3d9cf] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => {
              // Check if we have location state indicating where we came from
              const from = (location.state as any)?.from;
              if (from === "home") {
                navigate("/Home");
              } else if (from === "explore") {
                navigate("/explore");
              } else {
                // Fallback: go back in history, or to explore if no history
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/explore");
                }
              }
            }}
            className="inline-flex items-center gap-2 text-[#4d5e56] dark:text-gray-300 hover:text-[#97a88c] dark:hover:text-gray-100 transition-colors duration-200"
          >
            <FaArrowLeft className="text-sm" />
            <span>
              {(() => {
                const from = (location.state as any)?.from;
                if (from === "home") return "Back to Home";
                if (from === "explore") return "Back to Explore";
                return "Back";
              })()}
            </span>
          </button>

          {state.currentPark && (
            <button
              onClick={handleDownloadPDF}
              disabled={state.loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B4C7E] dark:bg-gray-700 text-white rounded-lg hover:bg-[#1A365D] dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50"
            >
              <FaDownload className="text-sm" />
              <span>
                {state.loading ? "Generating PDF..." : "Download Park Guide"}
              </span>
            </button>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center text-[#4d5e56] dark:text-gray-200 px-4">
          {state.currentPark
            ? `Plan Your Visit to ${state.currentPark.name}`
            : "Plan Your Park Visit"}
        </h1>
        {state.currentPark && (
          <p className="text-justify text-[#4d5e56] dark:text-gray-300 text-xs md:text-sm leading-relaxed mb-6 md:mb-8 max-w-3xl mx-auto px-4">
            {state.currentPark.description}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4 md:space-y-6 order-2 lg:order-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-[#4d5e56] dark:text-gray-200">
                Available Activities
              </h2>
              {state.parkActivities.length > 0 && (
                <div className="space-y-4">
                  {Object.entries(groupActivities(state.parkActivities)).map(
                    ([category, activities]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="text-base md:text-lg font-semibold text-[#2B4C7E] dark:text-gray-300 capitalize">
                          {category}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {activities.map((activity) => (
                            <button
                              key={activity.id}
                              onClick={() =>
                                debouncedHandleSendMessage(
                                  `Tell me about ${activity.name} in ${state.currentPark?.name}`
                                )
                              }
                              className="bg-[#97a88c]/10 dark:bg-gray-700/50 text-[#4d5e56] dark:text-gray-300 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm border border-[#97a88c]/20 dark:border-gray-600 hover:bg-[#97a88c]/20 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                            >
                              {activity.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden relative h-[400px] md:h-[500px] lg:h-[600px] border border-gray-200 dark:border-gray-700 order-1 lg:order-2">
            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-[1000] flex flex-col sm:flex-row gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    showTrails: !prev.showTrails,
                  }))
                }
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md transition-colors duration-200 text-xs md:text-sm touch-manipulation ${
                  state.showTrails
                    ? "bg-[#4CAF50] text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <FaHiking className="text-sm md:text-lg" />
                <span className="font-medium hidden sm:inline">
                  {state.showTrails ? "Hide Trails" : "Show Trails"}
                </span>
                <span className="font-medium sm:hidden">Trails</span>
              </button>
              <button
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    showCampgrounds: !prev.showCampgrounds,
                  }))
                }
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md transition-colors duration-200 text-xs md:text-sm touch-manipulation ${
                  state.showCampgrounds
                    ? "bg-[#FFA726] text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <FaCampground className="text-sm md:text-lg" />
                <span className="font-medium">Campgrounds</span>
              </button>

              {/* Trail difficulty legend popup */}
              {state.showTrails && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    Trail Difficulty:
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-1 bg-[#4CAF50]"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      Easy
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-1 bg-[#FFA726]"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      Moderate
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-[#E53935]"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      Difficult
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div ref={mapRef} className="h-[800px] relative">
              {/* Map theme toggle button */}
              <div className="absolute top-2 left-2 md:top-4 md:left-4 z-[1000]">
                <button
                  onClick={() => setIsDarkMap((prev) => !prev)}
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-1.5 md:p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1 md:gap-2"
                  title={
                    isDarkMap ? "Switch to light map" : "Switch to dark map"
                  }
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
              <MapContainer
                key={state.currentPark?.parkCode || "default"}
                center={mapCenter}
                zoom={4}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
                attributionControl={false}
                zoomControl={false}
              >
                <ZoomControl position="bottomright" />
                <MapThemeTileLayer isDarkMap={isDarkMap} />
                <MapController
                  park={state.currentPark}
                  parkBoundary={parkBoundary}
                  trails={state.trails}
                  campgrounds={state.campgrounds}
                />

                {parkBoundary?.boundaryData?.features[0] && (
                  <GeoJSON
                    key={parkBoundary._id}
                    data={parkBoundary.boundaryData.features[0]}
                    style={boundaryStyle}
                    onEachFeature={(feature, layer) => {
                      layer.on({
                        mouseover: (e) => {
                          const layer = e.target;
                          layer.setStyle({
                            fillColor: "#2C3930",
                            fillOpacity: 0.25,
                            color: "#2C3930",
                            weight: 2,
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
                          <strong class="block text-[#2C3930] text-sm mb-1">
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

                {state.showTrails &&
                  state.trails.map((trail, index) => (
                    <GeoJSON
                      key={`trail-${trail.properties.TRLNAME}-${index}`}
                      data={trail}
                      style={getTrailStyle}
                      onEachFeature={handleTrailFeature}
                    />
                  ))}
                {state.showCampgrounds &&
                  state.campgrounds?.map((campground, index) => (
                    <Marker
                      key={`campground-${index}`}
                      position={[campground.latitude, campground.longitude]}
                      icon={campgroundIcon}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100">
                            {campground.name}
                          </h3>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {campground.description}
                          </p>
                          <button
                            onClick={() =>
                              window.open(campground.reservationUrl)
                            }
                            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            Make Reservation
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-[#4d5e56] dark:text-gray-200 mb-2">
                Trail Difficulty
              </h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#4CAF50]"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Easy
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FFA726]"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Moderate
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#E53935]"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Difficult
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 bg-[#2B4C7E] dark:bg-gray-700 text-white p-3 md:p-4 rounded-full shadow-lg hover:bg-[#1A365D] dark:hover:bg-gray-600 transition-colors duration-200 z-50 touch-manipulation"
        aria-label="Toggle chatbot"
      >
        {isChatOpen ? (
          <FaTimes size={20} className="md:w-6 md:h-6" />
        ) : (
          <FaComments size={20} className="md:w-6 md:h-6" />
        )}
      </button>

      {isChatOpen && (
        <div className="fixed bottom-20 left-4 right-4 md:bottom-24 md:left-6 md:right-auto md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-120px)] md:max-h-[600px] flex flex-col">
          <div className="p-4 bg-[#2B4C7E] dark:bg-gray-700 text-white rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">TrailGuide AI Assistant</h3>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-white hover:text-gray-200 dark:hover:text-gray-300"
            >
              <FaTimes />
            </button>
          </div>
          <div className="p-3 md:p-4 h-[300px] md:h-[400px] overflow-y-auto flex flex-col space-y-3 md:space-y-4 bg-gray-50 dark:bg-gray-900">
            {state.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.isUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[80%] p-2 md:p-3 rounded-lg text-sm md:text-base ${
                    message.isUser
                      ? "bg-[#2B4C7E] dark:bg-gray-700 text-white rounded-br-none"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                </div>
              </div>
            ))}
            {state.loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 md:p-3 rounded-lg rounded-bl-none text-sm md:text-base">
                  <p>Thinking...</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={state.query}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, query: e.target.value }))
                }
                placeholder={
                  state.currentPark
                    ? `Ask about ${state.currentPark.name}...`
                    : "Ask about national parks..."
                }
                className="flex-1 p-2 md:p-3 text-sm md:text-base bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B4C7E] dark:focus:ring-gray-500"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && state.query.trim()) {
                    debouncedHandleSendMessage(state.query);
                    setState((prev) => ({ ...prev, query: "" }));
                  }
                }}
              />
              <button
                onClick={() => {
                  if (state.query.trim()) {
                    debouncedHandleSendMessage(state.query);
                    setState((prev) => ({ ...prev, query: "" }));
                  }
                }}
                className="bg-[#2B4C7E] dark:bg-gray-700 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg hover:bg-[#1A365D] dark:hover:bg-gray-600 transition-colors duration-200 text-sm md:text-base touch-manipulation"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Plan);
