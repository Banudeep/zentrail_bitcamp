import React, { useEffect, useState, useMemo, useCallback } from "react";
//import axios from "axios";
import { useNavigate } from "react-router-dom";

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
}

interface NationalParkSelectorProps {
  selectedState: string;
  onParkSelect: (parkCode: string) => void;
  searchQuery?: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";
console.log("Environment variables:", {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  API_URL,
});

const NationalParkSelector: React.FC<NationalParkSelectorProps> = ({
  selectedState,
  onParkSelect,
  searchQuery = "",
}) => {
  const navigate = useNavigate();
  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchParks = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication required. Please sign in.");
          setLoading(false);
          return;
        }

        let response;
        if (selectedState === "") {
          response = await fetch(`${API_URL}/api/parks`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          response = await fetch(`${API_URL}/api/parks/${selectedState}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch parks: ${response.status}`);
        }

        const data = await response.json();
        setParks(data);
      } catch (error) {
        console.error("Error fetching parks:", error);
        setError(error instanceof Error ? error.message : "Failed to load parks");
      } finally {
        setLoading(false);
      }
    };

    fetchParks();
  }, [selectedState]);

  // Filter parks by search query (memoized for performance)
  const filteredParks = useMemo(() => {
    if (!searchQuery) return parks;
    const query = searchQuery.toLowerCase();
    return parks.filter((park) => 
      park.name.toLowerCase().includes(query) ||
      park.fullName.toLowerCase().includes(query) ||
      park.description.toLowerCase().includes(query) ||
      park.states.toLowerCase().includes(query)
    );
  }, [parks, searchQuery]);

  const onParkSelectHandler = useCallback((parkCode: string) => {
    console.log("Selected park code:", parkCode);
    // Preserve scroll position to prevent list from jumping
    const scrollPosition = scrollContainerRef.current?.scrollTop;
    onParkSelect(parkCode);
    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (scrollContainerRef.current && scrollPosition !== undefined) {
        scrollContainerRef.current.scrollTop = scrollPosition;
      }
    });
  }, [onParkSelect]);

  const handlePlanTrip = useCallback((parkCode: string) => {
    navigate(`/plan/${parkCode}`, { state: { from: 'explore' } });
  }, [navigate]);

  // Memoized Park Card Component for better performance
  const ParkCard = React.memo(({ 
    park, 
    onSelect, 
    onPlanTrip 
  }: { 
    park: Park; 
    onSelect: (code: string) => void;
    onPlanTrip: (code: string) => void;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-[#2B4C7E] dark:hover:border-gray-600 group animate-fadeIn">
      <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
        {/* Placeholder while loading */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse"></div>
        <img
          src={park.images[0]?.url || "/assets/park-placeholder.jpg"}
          alt={park.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 relative z-10"
          style={{ 
            contentVisibility: 'auto',
            containIntrinsicSize: '100% 192px'
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/assets/park-placeholder.jpg";
          }}
          onLoad={(e) => {
            // Hide placeholder when image loads
            const placeholder = (e.target as HTMLImageElement).previousElementSibling as HTMLElement;
            if (placeholder) {
              placeholder.style.display = 'none';
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4 z-30">
          <h3 className="text-white font-bold text-lg mb-1 drop-shadow-lg">
            {park.name}
          </h3>
          <span className="text-white/90 text-xs font-medium bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
            {park.designation}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-gradient-to-r from-[#2B4C7E] to-[#1A365D] dark:from-gray-600 dark:to-gray-700 text-white text-xs font-semibold rounded-full shadow-sm">
            {park.states}
          </span>
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-4 leading-relaxed">
          {park.description}
        </p>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(park.parkCode);
            }}
            className="flex-1 bg-gradient-to-r from-[#2B4C7E] to-[#1A365D] dark:from-gray-700 dark:to-gray-600 text-white py-2.5 px-4 rounded-lg hover:from-[#1A365D] hover:to-[#2B4C7E] dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            View On Map
          </button>
          <button
            onClick={() => onPlanTrip(park.parkCode)}
            className="flex-1 bg-gradient-to-r from-[#97a88c] to-[#7a8971] dark:from-gray-600 dark:to-gray-700 text-white py-2.5 px-4 rounded-lg hover:from-[#7a8971] hover:to-[#97a88c] dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Plan Trip
          </button>
        </div>
      </div>
    </div>
  ));

  ParkCard.displayName = 'ParkCard';

  return (
    <div 
      ref={scrollContainerRef}
      className="h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar"
      style={{
        willChange: 'scroll-position',
        contain: 'layout style paint'
      }}
    >
      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse">
              <div className="h-40 bg-gray-200 dark:bg-gray-600 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
            Error Loading Parks
          </h3>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredParks.length === 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-8 text-center border-2 border-blue-200 dark:border-gray-600">
          <div className="text-5xl mb-4">🏞️</div>
          <h3 className="text-xl font-semibold text-[#2B4C7E] dark:text-gray-200 mb-2">
            {searchQuery ? "No Parks Match Your Search" : selectedState ? "No National Parks Found" : "No Parks Available"}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {searchQuery
              ? `Try a different search term or clear the search.`
              : selectedState
              ? `There are no national parks in ${selectedState}. Try selecting a different state.`
              : "Select a state to explore national parks."}
          </p>
        </div>
      )}

      {/* Park List */}
      {!loading && !error && filteredParks.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 px-2">
            Showing {filteredParks.length} of {parks.length} parks
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
          {filteredParks.map((park) => (
            <ParkCard 
              key={park.id} 
              park={park} 
              onSelect={onParkSelectHandler}
              onPlanTrip={handlePlanTrip}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders when selectedPark changes
export default React.memo(NationalParkSelector);