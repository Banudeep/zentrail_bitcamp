import React, { useState } from "react";
import { Link } from "react-router-dom";
import NationalParkSelector from "../NationalParkSelector/NationalParkSelector";
import { FaArrowLeft, FaCompass, FaMapMarkedAlt } from "react-icons/fa";
import ParkMap from "../Park/ParkMap";

const Explore: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedPark, setSelectedPark] = useState<string>("");
  const [selectedStateName, setSelectedStateName] = useState<string>("");

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

  const handleParkSelect = (parkCode: string) => {
    console.log("Selected park in Explore:", parkCode);
    setSelectedPark(parkCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] to-[#d3d9cf]">
      <div className="max-w-7xl mx-auto p-2">
        {/* Back Button */}
        <div className="mb-1">
          <Link
            to="/Home"
            className="inline-flex items-center gap-1 text-[#4d5e56] hover:text-[#97a88c] transition-colors duration-200 text-sm"
          >
            <FaArrowLeft className="text-sm" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <FaCompass className="text-xl text-[#97a88c]" />
            <h1 className="text-xl font-bold text-[#4d5e56]">
              Explore National Parks
            </h1>
          </div>
          <p className="text-xs text-[#4d5e56] max-w-2xl mx-auto">
            Discover America's most beautiful landscapes and natural wonders
            across all 50 states
          </p>
        </div>

        {/* State Selection Bar */}
        <div className="mb-2">
          <div className="bg-[#f5f2e8] rounded-lg shadow-lg p-1.5">
            <div className="max-w-7xl mx-auto">
              <label className="block text-xs font-medium text-[#4d5e56] mb-1">
                Select a State to Explore
              </label>
              <div className="relative">
                <select
                  value={selectedStateName}
                  onChange={(e) => handleStateChange(e)}
                  className="w-full bg-white text-[#4d5e56] text-xs px-2 py-1.5 rounded-lg border border-[#97a88c] focus:outline-none focus:ring-2 focus:ring-[#97a88c] focus:border-transparent transition-all duration-200"
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
                <FaMapMarkedAlt className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#97a88c] text-sm pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-2">
          {/* Left Column - Park List */}
          <div className="col-span-4 bg-[#f5f2e8] rounded-lg shadow-lg p-1.5">
            <NationalParkSelector
              selectedState={selectedState}
              onParkSelect={handleParkSelect}
            />
          </div>

          {/* Right Column - Map */}
          <div className="col-span-8">
            <div className="bg-[#f5f2e8] rounded-lg shadow-lg overflow-hidden">
              <div className="p-1.5 border-b border-[#d3d9cf]">
                <h2 className="text-sm font-semibold text-[#4d5e56] flex items-center gap-1.5">
                  <FaMapMarkedAlt className="text-[#97a88c]" />
                  Interactive Park Map
                </h2>
              </div>
              <ParkMap stateCode={selectedState} selectedPark={selectedPark} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
