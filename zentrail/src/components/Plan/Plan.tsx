import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHiking, FaCampground, FaComments, FaTimes } from 'react-icons/fa';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import { Feature, Geometry } from 'geojson';
import { PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import Logger from '../../utils/logger';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';
const CHATBOT_API_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8000';

const transformToGeoJSON = (trail: any): Trail | null => {
    try {
        if (!trail.geometry?.coordinates || !Array.isArray(trail.geometry.coordinates)) {
            return null;
        }

        const coordinates = trail.geometry.type === "MultiLineString"
            ? trail.geometry.coordinates.flat()
            : trail.geometry.coordinates;

        const validCoordinates = coordinates
            .filter((coord: any): coord is number[] => 
                Array.isArray(coord) && coord.length >= 2 &&
                !isNaN(coord[0]) && !isNaN(coord[1]) &&
                Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90
            )
            .map((coord: number[]) => coord.slice(0, 2));

        if (validCoordinates.length < 2) return null;

        return {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: validCoordinates
            },
            properties: trail.properties || {}
        };
    } catch (error) {
        console.warn("Error transforming trail:", error);
        return null;
    }
};

const MapController: React.FC<{ park: Park | null }> = React.memo(({ park }) => {
    const map = useMap();

    useEffect(() => {
        if (park && map) {
            const lat = parseFloat(park.latitude);
            const lng = parseFloat(park.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                try {
                    map.setView([lat, lng], 12, { animate: false });
                } catch (error) {
                    console.error('Error setting map view:', error);
                }
            }
        }
        return () => {
            if (map) {
                try {
                    map.setView([39.8283, -98.5795], 4, { animate: false });
                } catch (error) {
                    console.error('Error resetting map view:', error);
                }
            }
        };
    }, [park?.latitude, park?.longitude, map]);

    return null;
}, (prevProps, nextProps) => {
    return prevProps.park?.latitude === nextProps.park?.latitude &&
           prevProps.park?.longitude === nextProps.park?.longitude;
});

const getTrailStyle = (feature: Feature<Geometry> | undefined): PathOptions => {
    if (!feature) {
        return {
            weight: 2,
            opacity: 0.8,
            dashArray: "5, 5",
            color: '#9E9E9E'
        };
    }

    const trail = feature as unknown as Trail;
    const difficultyColors = {
        easy: '#4CAF50',
        moderate: '#FFA726',
        difficult: '#E53935'
    };

    const baseStyle = {
        weight: 2,
        opacity: 0.8,
        dashArray: "5, 5"
    };

    if (trail.properties.TRLCLASS) {
        const difficulty = trail.properties.TRLCLASS.toLowerCase();
        if (difficulty.includes('easy') || difficulty.includes('class 1')) {
            return { ...baseStyle, color: difficultyColors.easy };
        } else if (difficulty.includes('moderate') || difficulty.includes('class 2')) {
            return { ...baseStyle, color: difficultyColors.moderate };
        } else if (difficulty.includes('difficult') || difficulty.includes('class 3')) {
            return { ...baseStyle, color: difficultyColors.difficult };
        }
    }
    return { ...baseStyle, color: '#9E9E9E' };
};

const Plan: React.FC = () => {
    const { parkCode } = useParams<{ parkCode?: string }>();
    const navigate = useNavigate();
    
    const [state, setState] = useState(() => ({
        query: '',
        loading: false,
        error: null as string | null,
        currentPark: null as Park | null,
        parkActivities: [] as Array<{ id: string; name: string }>,
        trails: [] as Trail[],
        campgrounds: [] as Campground[],
        showTrails: true,
        showCampgrounds: false,
        chatResponse: null as ChatResponse | null,
        loadingTrails: false
    }));
    const [isChatOpen, setIsChatOpen] = useState(false);

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

    const makeAuthenticatedRequest = useCallback(async (url: string, options: { method?: string; data?: any } = {}) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        try {
            const response = await axios({
                url,
                method: options.method || 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: options.data,
                signal: abortControllerRef.current.signal
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/signin');
                    throw new Error('Authentication failed - please sign in again');
                }
                throw new Error(error.response?.data?.message || 'API request failed');
            }
            throw error;
        }
    }, [navigate]);

    const debouncedHandleSendMessage = useCallback((userQuery: string) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setState(prev => ({ ...prev, loading: true, error: null }));

        timeoutRef.current = setTimeout(async () => {
            try {
                const response = await axios.post(`${CHATBOT_API_URL}/chat`, {
                    query: userQuery,
                    parkCode: parkCode
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                setState(prev => ({ 
                    ...prev, 
                    chatResponse: response.data,
                    loading: false 
                }));
            } catch (error) {
                setState(prev => ({
                    ...prev,
                    error: error instanceof Error ? error.message : 'Failed to get response',
                    loading: false
                }));
                Logger.error('Plan', 'Chat request failed', error);
            }
        }, 300);
    }, [parkCode]);

    const fetchTrails = useCallback(async (unitCode: string) => {
        setState(prev => ({ ...prev, loadingTrails: true }));
        try {
            const trailsData = await makeAuthenticatedRequest(`${API_URL}/api/trails/unit/${unitCode}`);
            const validTrails = (Array.isArray(trailsData) ? trailsData : [])
                .map(transformToGeoJSON)
                .filter((trail): trail is Trail => trail !== null);
            
            setState(prev => ({ 
                ...prev, 
                trails: validTrails,
                loadingTrails: false 
            }));
        } catch (error) {
            console.error('Error fetching trails:', error);
            setState(prev => ({ 
                ...prev, 
                trails: [],
                loadingTrails: false,
                error: error instanceof Error ? error.message : 'Failed to load trails'
            }));
        }
    }, [makeAuthenticatedRequest]);

    const fetchCampgrounds = useCallback(async (unitCode: string) => {
        try {
            const campgroundsData = await makeAuthenticatedRequest(`${API_URL}/api/campgrounds/unit/${unitCode}`);
            setState(prev => ({ 
                ...prev, 
                campgrounds: campgroundsData || [] 
            }));
        } catch (error) {
            console.error('Error fetching campgrounds:', error);
            setState(prev => ({ 
                ...prev, 
                campgrounds: [],
                error: error instanceof Error ? error.message : 'Failed to load campgrounds'
            }));
        }
    }, [makeAuthenticatedRequest]);

    useEffect(() => {
        if (!parkCode) return;

        let retryCount = 0;
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        const fetchParkData = async () => {
            setState(prev => ({ ...prev, loading: true, error: null }));

            try {
                const parkData = await makeAuthenticatedRequest(`${API_URL}/api/parks/park/${parkCode}`);
                setState(prev => ({ 
                    ...prev, 
                    currentPark: parkData,
                    parkActivities: parkData.activities || [] 
                }));

                await fetchTrails(parkCode);
                await fetchCampgrounds(parkCode);
                await debouncedHandleSendMessage(`Tell me about activities and attractions in ${parkData.name}`);

            } catch (error) {
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    timeoutRef.current = setTimeout(() => fetchParkData(), RETRY_DELAY * retryCount);
                    return;
                }

                setState(prev => ({
                    ...prev,
                    error: error instanceof Error ? error.message : 'Failed to load park details',
                    loading: false
                }));
                Logger.error('Plan', 'Error fetching park details', error);
            } finally {
                setState(prev => ({ ...prev, loading: false }));
            }
        };

        fetchParkData();
    }, [parkCode, makeAuthenticatedRequest, debouncedHandleSendMessage, fetchTrails, fetchCampgrounds]);

    const groupActivities = (activities: Array<{ id: string; name: string }>) => {
        const categories = {
            hiking: ['Hiking', 'Day Hiking', 'Backpacking', 'Walking'],
            camping: ['Camping', 'Backcountry Camping', 'Car or Front Country Camping', 'RV Camping'],
            wildlife: ['Wildlife Viewing', 'Birdwatching', 'Animal Watching'],
            water: ['Swimming', 'Boating', 'Kayaking', 'Canoeing', 'Fishing', 'Paddling'],
            winter: ['Snow Play', 'Cross-Country Skiing', 'Snowshoeing', 'Winter Sports'],
            other: []
        };

        return activities.reduce((acc, activity) => {
            let categoryFound = false;
            for (const [category, keywords] of Object.entries(categories)) {
                if (keywords.some(keyword => activity.name.toLowerCase().includes(keyword.toLowerCase()))) {
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
                dashArray: "0"
            });
        };

        const handleMouseOut = (e: any) => {
            const layer = e.target;
            layer.setStyle(getTrailStyle(feature));
        };

        layer.on({
            mouseover: handleMouseOver,
            mouseout: handleMouseOut
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
                        feature.properties.TRLSTATUS && feature.properties.TRLSTATUS !== "Unknown"
                            ? `<p>Status: ${feature.properties.TRLSTATUS}</p>`
                            : ""
                    }
                    ${
                        feature.properties.TRLSURFACE && feature.properties.TRLSURFACE !== "Unknown"
                            ? `<p>Surface: ${feature.properties.TRLSURFACE}</p>`
                            : ""
                    }
                    ${
                        feature.properties.TRLTYPE && feature.properties.TRLTYPE !== "Unknown"
                            ? `<p>Type: ${feature.properties.TRLTYPE}</p>`
                            : ""
                    }
                    ${
                        feature.properties.TRLCLASS && feature.properties.TRLCLASS !== "Unknown"
                            ? `<p>Class: ${feature.properties.TRLCLASS}</p>`
                            : ""
                    }
                    ${
                        feature.properties.TRLUSE && feature.properties.TRLUSE !== "Unknown"
                            ? `<p>Use: ${feature.properties.TRLUSE}</p>`
                            : ""
                    }
                    ${
                        feature.properties.SEASONAL === "Yes" && feature.properties.SEASDESC
                            ? `<p class="text-red-600">Seasonal: ${feature.properties.SEASDESC}</p>`
                            : ""
                    }
                    ${
                        feature.properties.MAINTAINER && feature.properties.MAINTAINER !== "Unknown"
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

    const predefinedQueries = parkCode ? [
        `What are the best hiking trails in ${state.currentPark?.name || 'this park'}?`,
        `What are the camping options in ${state.currentPark?.name || 'this park'}?`,
        `What's the best time to visit ${state.currentPark?.name || 'this park'}?`,
        `What are the must-see attractions in ${state.currentPark?.name || 'this park'}?`,
        `What activities are available in ${state.currentPark?.name || 'this park'}?`
    ] : [
        "Show me parks with hiking trails",
        "Which parks are best for camping?",
        "Parks with astronomy activities",
        "Family-friendly parks",
        "Parks with water activities"
    ];

    const mapCenter = useMemo(() => [39.8283, -98.5795] as [number, number], []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] to-[#d3d9cf] p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-4">
                    <Link
                        to="/explore"
                        className="inline-flex items-center gap-2 text-[#4d5e56] hover:text-[#97a88c] transition-colors duration-200"
                    >
                        <FaArrowLeft className="text-sm" />
                        <span>Back to Explore</span>
                    </Link>
                </div>

                <h1 className="text-3xl font-bold mb-2 text-center text-[#4d5e56]">
                    {state.currentPark ? `Plan Your Visit to ${state.currentPark.name}` : 'Plan Your Park Visit'}
                </h1>
                {state.currentPark && (
                    <p className="text-center text-[#4d5e56] mb-8 max-w-2xl mx-auto">
                        {state.currentPark.description}
                    </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-bold mb-4 text-[#4d5e56]">
                                Available Activities
                            </h2>
                            {state.parkActivities.length > 0 && (
                                <div className="space-y-4">
                                    {Object.entries(groupActivities(state.parkActivities)).map(([category, activities]) => (
                                        <div key={category} className="space-y-2">
                                            <h3 className="text-lg font-semibold text-[#2B4C7E] capitalize">
                                                {category}
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {activities.map((activity) => (
                                                    <button
                                                        key={activity.id}
                                                        onClick={() => debouncedHandleSendMessage(`Tell me about ${activity.name} in ${state.currentPark?.name}`)}
                                                        className="bg-[#97a88c]/10 text-[#4d5e56] px-3 py-1 rounded-full text-sm border border-[#97a88c]/20 hover:bg-[#97a88c]/20 transition-colors"
                                                    >
                                                        {activity.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg overflow-hidden relative h-[600px]">
                        <div className="absolute top-4 right-4 z-[1000] flex gap-2 bg-white p-2 rounded-lg shadow-lg">
                            <button
                                onClick={() => setState(prev => ({ ...prev, showTrails: !prev.showTrails }))}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ${
                                    state.showTrails ? "bg-[#4CAF50] text-white" : "bg-gray-100 text-gray-700"
                                }`}
                            >
                                <FaHiking className="text-lg" />
                                <span className="text-sm font-medium">
                                    {state.showTrails ? "Hide Trails" : "Show Trails"}
                                </span>
                            </button>
                            <button
                                onClick={() => setState(prev => ({ ...prev, showCampgrounds: !prev.showCampgrounds }))}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ${
                                    state.showCampgrounds ? "bg-[#FFA726] text-white" : "bg-gray-100 text-gray-700"
                                }`}
                            >
                                <FaCampground className="text-lg" />
                                <span className="text-sm font-medium">Campgrounds</span>
                            </button>
                        </div>

                        <div className="h-[800px]">
                            <MapContainer
                                key={state.currentPark?.parkCode || 'default'}
                                center={mapCenter}
                                zoom={4}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={true}
                                attributionControl={false}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <MapController park={state.currentPark} />
                                {state.showTrails && state.trails.map((trail, index) => (
                                    <GeoJSON
                                        key={`trail-${trail.properties.TRLNAME}-${index}`}
                                        data={trail}
                                        style={getTrailStyle}
                                        onEachFeature={handleTrailFeature}
                                    />
                                ))}
                                {state.showCampgrounds && state.campgrounds?.map((campground, index) => (
                                    <Marker
                                        key={`campground-${index}`}
                                        position={[campground.latitude, campground.longitude]}
                                        icon={campgroundIcon}
                                    >
                                        <Popup>
                                            <div className="p-2">
                                                <h3 className="font-bold">{campground.name}</h3>
                                                <p className="text-sm">{campground.description}</p>
                                                <button
                                                    onClick={() => window.open(campground.reservationUrl)}
                                                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                    Make Reservation
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                        <div className="p-4 border-t border-gray-200">
                            <h3 className="font-semibold text-[#4d5e56] mb-2">Trail Difficulty</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[#4CAF50]"></div>
                                    <span className="text-sm text-gray-600">Easy</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[#FFA726]"></div>
                                    <span className="text-sm text-gray-600">Moderate</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[#E53935]"></div>
                                    <span className="text-sm text-gray-600">Difficult</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="fixed bottom-6 right-6 bg-[#2B4C7E] text-white p-4 rounded-full shadow-lg hover:bg-[#1A365D] transition-colors duration-200 z-50"
            >
                {isChatOpen ? <FaTimes size={24} /> : <FaComments size={24} />}
            </button>

            {isChatOpen && (
                <div className="fixed bottom-24 right-6 w-96 bg-white rounded-lg shadow-2xl z-50">
                    <div className="p-4 bg-[#2B4C7E] text-white rounded-t-lg flex justify-between items-center">
                        <h3 className="font-semibold">TrailGuide AI Assistant</h3>
                        <button onClick={() => setIsChatOpen(false)} className="text-white hover:text-gray-200">
                            <FaTimes />
                        </button>
                    </div>
                    <div className="p-4 max-h-[500px] overflow-y-auto">
                        {state.chatResponse && (
                            <div className="bg-gray-50 p-4 rounded-lg mt-4">
                                <p className="text-gray-800 whitespace-pre-wrap">{state.chatResponse.response}</p>
                            </div>
                        )}

                        <div className="mt-4 flex gap-2">
                            <input
                                type="text"
                                value={state.query}
                                onChange={(e) => setState(prev => ({ ...prev, query: e.target.value }))}
                                placeholder={state.currentPark ? `Ask about ${state.currentPark.name}...` : "Ask about national parks..."}
                                className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B4C7E]"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && state.query.trim()) {
                                        debouncedHandleSendMessage(state.query);
                                        setState(prev => ({ ...prev, query: '' }));
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (state.query.trim()) {
                                        debouncedHandleSendMessage(state.query);
                                        setState(prev => ({ ...prev, query: '' }));
                                    }
                                }}
                                className="bg-[#2B4C7E] text-white px-4 rounded-lg hover:bg-[#1A365D] transition-colors duration-200"
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
