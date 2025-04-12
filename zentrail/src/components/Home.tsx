import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaGlobeAmericas,
  FaMountain,
  FaTree,
  FaRoute,
  FaCampground,
} from "react-icons/fa";
import "leaflet/dist/leaflet.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";
console.log("Environment variables:", {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  API_URL,
});

// checking git commit branch

// Configure axios defaults
axios.defaults.withCredentials = true;

interface UserStats {
  totalTripsPlanned: number;
  nationalParksVisited: number;
  stateParksVisited: number;
  milesOfTrailsPlanned: number;
  campgroundsStayed: number;
}

interface User {
  firstName: string;
  lastName: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalTripsPlanned: 0,
    nationalParksVisited: 0,
    stateParksVisited: 0,
    milesOfTrailsPlanned: 0,
    campgroundsStayed: 0,
  });
  const [user, setUser] = useState<User>({ firstName: "", lastName: "" });
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          console.error("Authentication token is missing");
          setError("Please log in to continue");
          navigate("/login");
          return;
        }

        // First API call - Get user data
        console.log("API URL:", API_URL);
        console.log("Making request to:", `${API_URL}/api/auth/user`);
        try {
          const userResponse = await axios.get(`${API_URL}/api/auth/user`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            withCredentials: true,
          });

          console.log("User data response:", userResponse.data);

          if (!userResponse.data) {
            throw new Error("No user data received");
          }

          setUser({
            firstName: userResponse.data.firstName || "",
            lastName: userResponse.data.lastName || "",
          });

          // Second API call - Get user stats
          console.log("Attempting to fetch user stats...");
          if (!userResponse.data._id) {
            throw new Error("User ID is missing from the response");
          }

          let statsResponse;
          try {
            statsResponse = await axios.get(
              `${API_URL}/api/user-stats/${userResponse.data._id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                withCredentials: true,
              }
            );
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
              // User stats not found in MongoDB
              statsResponse = { userStats };
              // post the initial stats
              await axios.post(`${API_URL}/api/user-stats`, {
                totalTripsPlanned: 0,
                nationalParksVisited: 0,
                stateParksVisited: 0,
                milesOfTrailsPlanned: 0,
                campgroundsStayed: 0,
                userId: userResponse.data._id,
              });
            } else {
              throw error; // Re-throw other errors
            }
          }

          console.log("Stats response:", statsResponse);

          if (statsResponse.data) {
            setUserStats(statsResponse.data);
          }
        } catch (apiError) {
          if (axios.isAxiosError(apiError)) {
            const status = apiError.response?.status;
            const message =
              apiError.response?.data?.message || apiError.message;
            console.error("API Error Details:", {
              status,
              message,
              url: apiError.config?.url,
              method: apiError.config?.method,
              headers: apiError.config?.headers,
              data: apiError.response?.data,
            });

            if (status === 404) {
              setError(
                `API endpoint not found. Please check if the server is running on port ${
                  new URL(API_URL).port
                }. URL: ${apiError.config?.url}`
              );
            } else if (status === 401) {
              setError("Session expired. Please log in again.");
              localStorage.removeItem("token");
              navigate("/Home");
            } else {
              setError(`Error: ${message}. Status: ${status}`);
            }
          } else {
            console.error("Non-Axios error:", apiError);
            setError("An unexpected error occurred while fetching data");
          }
        }
      } catch (error) {
        console.error("Top-level error:", error);
        setError("Failed to load user data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  return (
    <div className="w-full h-screen relative bg-[#f5f2e8] overflow-hidden">
      {/* Background Image with overlay */}
      <div className="absolute inset-0">
        <img
          src="/background.png"
          alt="Yosemite El Capitan"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#4d5e56]/40"></div>
      </div>

      {/* Left Navigation Menu */}
      <div className="w-48 h-full left-24 top-48 absolute">
        <div className="bg-[#4d5e56] p-4 rounded-lg space-y-6">
          <button
            onClick={() => navigate("/Home")}
            className="w-full text-[#f5f2e8] text-xl font-bold py-4 hover:bg-[#97a88c] rounded transition-colors"
          >
            Home
          </button>
          <button
            onClick={() => navigate("/explore")}
            className="w-full text-[#f5f2e8] text-xl font-bold py-4 hover:bg-[#97a88c] rounded transition-colors"
          >
            Explore Parks
          </button>
          <button
            onClick={() => navigate("/plan")}
            className="w-full text-[#f5f2e8] text-xl font-bold py-4 hover:bg-[#97a88c] rounded transition-colors"
          >
            Plan Itinerary
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="w-full text-[#f5f2e8] text-xl font-bold py-4 hover:bg-[#97a88c] rounded transition-colors"
          >
            Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-[#f5f2e8] text-xl font-bold py-4 hover:bg-[#97a88c] rounded transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Logo */}
      <img
        src="/assets/logo1.png"
        alt="ZenTrail Logo"
        className="w-48 h-auto left-24 top-8 absolute"
      />

      {/* Welcome Text */}
      <div className="absolute left-80 top-16 text-[#f5f2e8]">
        <h1 className="text-5xl font-['Kaushan Script'] mb-4">
          ZenTrail Welcomes You{" "}
          {user.firstName ? `- ${user.firstName} ${user.lastName}` : ""}
        </h1>
        <p className="text-2xl font-['Kaushan Script']">
          Let's build a trail that fits your soul!
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="absolute left-80 top-48 grid grid-cols-3 gap-8 max-w-6xl">
        {loading ? (
          <div className="col-span-3 text-[#f5f2e8] text-center">
            <p className="text-2xl">Loading your adventure stats...</p>
          </div>
        ) : error ? (
          <div className="col-span-3 text-[#f5f2e8] text-center">
            <p className="text-2xl text-red-500">{error}</p>
          </div>
        ) : (
          <>
            {/* First row - 3 cards */}
            <div className="bg-[#D9D9D9] rounded-lg p-6 text-center">
              <FaGlobeAmericas className="w-20 h-20 mx-auto text-[#123458]" />
              <h2 className="text-6xl font-extrabold text-[#123458] my-4">
                {userStats.totalTripsPlanned}
              </h2>
              <p className="text-xl font-bold text-[#123458] underline">
                Total Trips Planned
              </p>
            </div>

            <div className="bg-[#D9D9D9] rounded-lg p-6 text-center">
              <FaMountain className="w-20 h-20 mx-auto text-[#123458]" />
              <h2 className="text-6xl font-extrabold text-[#123458] my-4">
                {userStats.nationalParksVisited}
              </h2>
              <p className="text-xl font-bold text-[#123458] underline">
                National Parks Visited
              </p>
            </div>

            <div className="bg-[#D9D9D9] rounded-lg p-6 text-center">
              <FaTree className="w-20 h-20 mx-auto text-[#123458]" />
              <h2 className="text-6xl font-extrabold text-[#123458] my-4">
                {userStats.stateParksVisited}
              </h2>
              <p className="text-xl font-bold text-[#123458] underline">
                State Parks Visited
              </p>
            </div>

            {/* Second row - 2 cards centered */}
            <div className="bg-[#D9D9D9] rounded-lg p-6 text-center col-start-1 col-end-2 col-span-1">
              <FaRoute className="w-20 h-20 mx-auto text-[#123458]" />
              <h2 className="text-6xl font-extrabold text-[#123458] my-4">
                {userStats.milesOfTrailsPlanned}
              </h2>
              <p className="text-xl font-bold text-[#123458] underline">
                Miles of Trails Planned
              </p>
            </div>

            <div className="bg-[#D9D9D9] rounded-lg p-6 text-center col-span-1">
              <FaCampground className="w-20 h-20 mx-auto text-[#123458]" />
              <h2 className="text-6xl font-extrabold text-[#123458] my-4">
                {userStats.campgroundsStayed}
              </h2>
              <p className="text-xl font-bold text-[#123458] underline">
                Campgrounds Stayed
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
