import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import NationalParkSelector from "../NationalParkSelector/NationalParkSelector";
import { FaArrowLeft, FaCompass, FaMapMarkedAlt, FaSearch } from "react-icons/fa";
import ParkMap from "../Park/ParkMap";

const Explore: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedPark, setSelectedPark] = useState<string>("");
  const [selectedStateName, setSelectedStateName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const states = [
    { name: "Select a State", code: "" },
    { name: "Alabama", code: "AL" },
    { name: "Alaska", code: "AK" },
    { name: "Arizona", code: "AZ" },
    { name: "Arkansas", code: "AR" },
    { name: "California", code: "CA" },
    { name: "Colorado", code: "CO" },
    { name: "Connecticut", code: "CT" },
    { name: "Delaware", code: "DE" },
    { name: "Florida", code: "FL" },
    { name: "Georgia", code: "GA" },
    { name: "Hawaii", code: "HI" },
    { name: "Idaho", code: "ID" },
    { name: "Illinois", code: "IL" },
    { name: "Indiana", code: "IN" },
    { name: "Iowa", code: "IA" },
    { name: "Kansas", code: "KS" },
    { name: "Kentucky", code: "KY" },
    { name: "Louisiana", code: "LA" },
    { name: "Maine", code: "ME" },
    { name: "Maryland", code: "MD" },
    { name: "Massachusetts", code: "MA" },
    { name: "Michigan", code: "MI" },
    { name: "Minnesota", code: "MN" },
    { name: "Mississippi", code: "MS" },
    { name: "Missouri", code: "MO" },
    { name: "Montana", code: "MT" },
    { name: "Nebraska", code: "NE" },
    { name: "Nevada", code: "NV" },
    { name: "New Hampshire", code: "NH" },
    { name: "New Jersey", code: "NJ" },
    { name: "New Mexico", code: "NM" },
    { name: "New York", code: "NY" },
    { name: "North Carolina", code: "NC" },
    { name: "North Dakota", code: "ND" },
    { name: "Ohio", code: "OH" },
    { name: "Oklahoma", code: "OK" },
    { name: "Oregon", code: "OR" },
    { name: "Pennsylvania", code: "PA" },
    { name: "Rhode Island", code: "RI" },
    { name: "South Carolina", code: "SC" },
    { name: "South Dakota", code: "SD" },
    { name: "Tennessee", code: "TN" },
    { name: "Texas", code: "TX" },
    { name: "Utah", code: "UT" },
    { name: "Vermont", code: "VT" },
    { name: "Virginia", code: "VA" },
    { name: "Washington", code: "WA" },
    { name: "West Virginia", code: "WV" },
    { name: "Wisconsin", code: "WI" },
    { name: "Wyoming", code: "WY" },
  ];

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedState = states.find((state) => state.name === e.target.value);
    console.log("State changed to:", selectedState);
    setSelectedState(selectedState?.code || "");
    setSelectedStateName(selectedState?.name || "");
  };

  const handleParkSelect = useCallback((parkCode: string) => {
    console.log("Selected park in Explore:", parkCode);
    setSelectedPark(parkCode);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] via-[#e8e3d5] to-[#d3d9cf] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            to="/Home"
            className="inline-flex items-center gap-2 text-[#4d5e56] dark:text-gray-300 hover:text-[#2B4C7E] dark:hover:text-gray-100 transition-colors duration-200 text-sm font-medium group"
          >
            <FaArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-4 md:mb-6 text-center px-2">
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
            <FaCompass className="text-2xl md:text-3xl text-[#2B4C7E] dark:text-gray-300 animate-pulse" />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#2B4C7E] dark:text-gray-200 tracking-tight">
              Explore National Parks
            </h1>
          </div>
          <p className="text-sm md:text-base text-[#4d5e56] dark:text-gray-300 max-w-3xl mx-auto leading-relaxed px-2">
            Discover America's most beautiful landscapes and natural wonders
            across all 50 states
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-[#d3d9cf] dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search Bar */}
              <div className="relative">
                <label className="block text-sm font-semibold text-[#4d5e56] dark:text-gray-300 mb-2">
                  Search Parks
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#97a88c] dark:text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by park name..."
                    className="w-full bg-white dark:bg-gray-700 text-[#4d5e56] dark:text-gray-200 text-sm pl-10 pr-4 py-3 rounded-lg border-2 border-[#d3d9cf] dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2B4C7E] dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {/* State Selection */}
              <div className="relative">
                <label className="block text-sm font-semibold text-[#4d5e56] dark:text-gray-300 mb-2">
                  Select a State to Explore
                </label>
                <div className="relative">
                  <select
                    value={selectedStateName}
                    onChange={(e) => handleStateChange(e)}
                    className="w-full bg-white dark:bg-gray-700 text-[#4d5e56] dark:text-gray-200 text-sm px-4 py-3 pr-10 rounded-lg border-2 border-[#d3d9cf] dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2B4C7E] dark:focus:ring-gray-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                  >
                    {states.map((state) => (
                      <option
                        key={state.code}
                        value={state.name === "Select a State" ? "" : state.name}
                      >
                        {state.name}
                      </option>
                    ))}
                  </select>
                  <FaMapMarkedAlt className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#97a88c] dark:text-gray-400 text-sm pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Park List */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-[#d3d9cf] dark:border-gray-700">
            <NationalParkSelector
              selectedState={selectedState}
              onParkSelect={handleParkSelect}
              searchQuery={searchQuery}
            />
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-[#d3d9cf] dark:border-gray-700 h-[400px] md:h-[500px] lg:h-[calc(100vh-280px)] min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
              <div className="p-3 md:p-4 border-b border-[#d3d9cf] dark:border-gray-700 bg-gradient-to-r from-[#f5f2e8] to-white dark:from-gray-800 dark:to-gray-800">
                <h2 className="text-base md:text-lg font-semibold text-[#2B4C7E] dark:text-gray-200 flex items-center gap-2">
                  <FaMapMarkedAlt className="text-[#2B4C7E] dark:text-gray-300" />
                  Interactive Park Map
                </h2>
                {selectedPark && (
                  <p className="text-xs md:text-sm text-[#4d5e56] dark:text-gray-300 mt-1">
                    Click on trails and campgrounds to learn more
                  </p>
                )}
              </div>
              <div className="h-[calc(100%-70px)] md:h-[calc(100%-80px)]">
                <ParkMap stateCode={selectedState} selectedPark={selectedPark} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
