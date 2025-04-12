import React, { useEffect, useState } from "react";
import axios from "axios";

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
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";
console.log("Environment variables:", {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  API_URL,
});

const NationalParkSelector: React.FC<NationalParkSelectorProps> = ({
  selectedState,
}) => {
  const [parks, setParks] = useState<Park[]>([]);

  useEffect(() => {
    const fetchParks = async () => {
      //   if (!selectedState) {
      //     setParks([]);
      //     return;
      //   }
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No auth token found");
          return;
        }
        console.log("Token:", token);
        console.log("Selected State:", selectedState);
        if (selectedState === "") {
          console.log("Fetching all national parks from frontend");

          const response = await fetch(`${API_URL}/api/parks`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          console.log("Fetched parks frontend:", data);
          setParks(data);
        } else {
          const response = await fetch(
            `${API_URL}/api/parks/${selectedState}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const data = await response.json();
          console.log("Fetched parks:", data);
          setParks(data);
        }
      } catch (error) {
        console.error("Error fetching parks:", error);
      }
    };

    fetchParks();
  }, [selectedState]);

  //   const [parks] = useState<Park[]>([
  //     { id: 1, name: "Olympic National Park", location: "Port Angeles" },
  //     { id: 2, name: "Mount Rainier National Park", location: "Ashford" },
  //     { id: 3, name: "North Cascades National Park", location: "Sedro-Woolley" },
  //     {
  //       id: 4,
  //       name: "Lake Chelan National Recreation Area",
  //       location: "Stehekin",
  //     },
  //     { id: 5, name: "Yellowstone National Park", location: "Wyoming" },
  //     { id: 6, name: "Yosemite National Park", location: "California" },
  //     { id: 7, name: "Grand Canyon National Park", location: "Arizona" },
  //     { id: 8, name: "Zion National Park", location: "Utah" },
  //     { id: 9, name: "Glacier National Park", location: "Montana" },
  //     { id: 10, name: "Rocky Mountain National Park", location: "Colorado" },
  //     { id: 11, name: "Acadia National Park", location: "Maine" },
  //     {
  //       id: 12,
  //       name: "Great Smoky Mountains National Park",
  //       location: "Tennessee",
  //     },
  //     { id: 13, name: "Joshua Tree National Park", location: "California" },
  //     { id: 14, name: "Death Valley National Park", location: "California" },
  //     { id: 15, name: "Sequoia National Park", location: "California" },
  //   ]);

  return (
    <div className="bg-[#E0E0E0] rounded-lg p-4 h-[calc(100vh-200px)] overflow-y-auto">
      <div className="space-y-4">
        {parks.map((park) => (
          <div
            key={park.id}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={park.images[0]?.url || "/assets/park-placeholder.jpg"}
                alt={park.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 className="text-white font-bold text-xl mb-1">
                  {park.name}
                </h3>
                <span className="text-white/80 text-sm">
                  {park.designation}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-[#2B4C7E] text-white text-xs rounded-full">
                  {park.states}
                </span>
              </div>
              <p className="text-gray-600 text-sm line-clamp-3">
                {park.description}
              </p>
              <button className="mt-4 w-full bg-[#2B4C7E] text-white py-2 px-4 rounded-md hover:bg-[#1A365D] transition-colors duration-200">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NationalParkSelector;
