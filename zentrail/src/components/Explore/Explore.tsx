import React, { useState } from "react";
import NationalParkSelector from "../NationalParkSelector/NationalParkSelector";
import { FaCompass, FaMapMarkedAlt } from "react-icons/fa";

const Explore: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>("");

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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-[#E0E0E0]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaCompass className="text-4xl text-[#2B4C7E]" />
            <h1 className="text-4xl font-bold text-[#1A1A1A]">
              Explore National Parks
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover America's most beautiful landscapes and natural wonders
            across all 50 states
          </p>
        </div>

        {/* State Selection Bar */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="max-w-7xl mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a State to Explore
              </label>
              <div className="relative">
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e)}
                  className="w-full bg-white text-[#1A1A1A] text-lg px-4 py-3 rounded-lg border-2 border-[#2B4C7E] focus:outline-none focus:ring-2 focus:ring-[#2B4C7E] focus:border-transparent transition-all duration-200"
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
                <FaMapMarkedAlt className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#2B4C7E] text-xl pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Park List */}
          <div className="col-span-4 bg-white rounded-xl shadow-lg p-4">
            <NationalParkSelector selectedState={selectedState} />
          </div>

          {/* Right Column - Map */}
          <div className="col-span-8">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-[#2B4C7E] flex items-center gap-2">
                  <FaMapMarkedAlt />
                  Interactive Park Map
                </h2>
              </div>
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src="/assets/washington-map.png"
                  alt="National Parks Map"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
