import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaGlobeAmericas,
  FaMountain,
  FaTree,
  FaRoute,
  FaCampground,
  FaHome,
  FaMapMarkedAlt,
  FaCalendarAlt,
  FaCog,
  FaSignOutAlt,
  FaRocket,
  FaSearch,
  FaBars,
  FaTimes,
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
  const [animatedStats, setAnimatedStats] = useState<UserStats>({
    totalTripsPlanned: 0,
    nationalParksVisited: 0,
    stateParksVisited: 0,
    milesOfTrailsPlanned: 0,
    campgroundsStayed: 0,
  });
  const hasAnimated = useRef(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            // Animate stats counting up
            animateStats(statsResponse.data);
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

  // Animate stats counting up
  const animateStats = (targetStats: UserStats) => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    Object.keys(targetStats).forEach((key) => {
      const target = targetStats[key as keyof UserStats];
      let current = 0;
      const increment = target / steps;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setAnimatedStats((prev) => ({
          ...prev,
          [key]: Math.floor(current),
        }));
      }, stepDuration);
    });
  };

  return (
    <div className="w-full min-h-screen relative bg-[#DCD7C9] dark:bg-gray-900 overflow-x-hidden">
      {/* Background Image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/background.png"
          alt="Yosemite El Capitan"
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[#2C3930]/40"></div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-[#2C3930] dark:bg-gray-800 text-white p-3 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="absolute left-0 top-0 h-full w-64 bg-[#2C3930] dark:bg-gray-800 p-6 space-y-4 shadow-2xl overflow-y-auto">
            <button
              onClick={() => {
                navigate("/Home");
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-[#DCD7C9] dark:text-gray-200 text-lg font-bold py-4 px-4 hover:bg-[#3F4F44] dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-3"
            >
              <FaHome className="text-lg" />
              <span>Home</span>
            </button>
            <button
              onClick={() => {
                navigate("/explore");
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-[#DCD7C9] dark:text-gray-200 text-lg font-bold py-4 px-4 hover:bg-[#3F4F44] dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-3"
            >
              <FaMapMarkedAlt className="text-lg" />
              <span>Explore Parks</span>
            </button>
            <button
              onClick={() => {
                navigate("/plan", { state: { from: "home" } });
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-[#DCD7C9] dark:text-gray-200 text-lg font-bold py-4 px-4 hover:bg-[#3F4F44] dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-3"
            >
              <FaCalendarAlt className="text-lg" />
              <span>Plan Itinerary</span>
            </button>
            <button
              onClick={() => {
                navigate("/settings");
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-[#DCD7C9] dark:text-gray-200 text-lg font-bold py-4 px-4 hover:bg-[#3F4F44] dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-3"
            >
              <FaCog className="text-lg" />
              <span>Settings</span>
            </button>
            <div className="border-t border-[#3F4F44] dark:border-gray-700 my-2"></div>
            <button
              onClick={() => {
                handleSignOut();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-[#DCD7C9] dark:text-gray-200 text-lg font-bold py-4 px-4 hover:bg-red-900/50 dark:hover:bg-red-800/50 rounded-lg transition-all duration-200 flex items-center gap-3"
            >
              <FaSignOutAlt className="text-lg" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Logo and Header */}
      <div className="relative z-10 pt-4 md:pt-8 px-4 md:px-0">
        <div className="flex flex-col md:flex-row md:items-center md:gap-8 mb-6 md:mb-0">
          <img
            src="/assets/logo1.png"
            alt="ZenTrail Logo"
            className="w-32 md:w-48 h-auto mx-auto md:mx-0 md:ml-6"
          />
          <div className="text-center md:text-left mt-4 md:mt-0">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-['Kaushan Script'] mb-2 drop-shadow-lg dark:drop-shadow-xl text-[#DCD7C9] dark:text-gray-200">
              ZenTrail Welcomes You{" "}
              {user.firstName ? `- ${user.firstName} ${user.lastName}` : ""}
            </h1>
            <p className="text-lg md:text-2xl lg:text-3xl font-['Kaushan Script'] [text-shadow:_0_2px_4px_rgba(0,0,0,0.5)] dark:[text-shadow:_0_2px_4px_rgba(0,0,0,0.8)] text-[#DCD7C9] dark:text-gray-200">
              Let's build a trail that fits your soul!
            </p>
          </div>
        </div>
      </div>

      {/* Container for Menu and Stats - Responsive Layout */}
      <div className="relative z-10 mt-8 md:mt-24 px-4 md:px-6">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-7xl mx-auto">
          {/* Desktop Left Navigation Menu */}
          <div className="hidden md:block w-56 flex-shrink-0">
            <div className="bg-[#2C3930] dark:bg-gray-800 p-6 rounded-lg space-y-4 shadow-2xl backdrop-blur-sm bg-opacity-95 sticky top-6">
              <button
                onClick={() => navigate("/Home")}
                className="w-full text-[#DCD7C9] dark:text-gray-200 text-xl font-bold py-4 px-4 hover:bg-[#3F4F44] dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-3 group active:scale-95"
              >
                <FaHome className="text-lg group-hover:scale-110 transition-transform" />
                <span>Home</span>
              </button>
              <button
                onClick={() => navigate("/explore")}
                className="w-full text-[#DCD7C9] dark:text-gray-200 text-xl font-bold py-4 px-4 hover:bg-[#3F4F44] dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-3 group active:scale-95"
              >
                <FaMapMarkedAlt className="text-lg group-hover:scale-110 transition-transform" />
                <span>Explore Parks</span>
              </button>
              <button
                onClick={() => navigate("/plan", { state: { from: "home" } })}
                className="w-full text-[#DCD7C9] dark:text-gray-200 text-xl font-bold py-4 px-4 hover:bg-[#3F4F44] dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-3 group active:scale-95"
              >
                <FaCalendarAlt className="text-lg group-hover:scale-110 transition-transform" />
                <span>Plan Itinerary</span>
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="w-full text-[#DCD7C9] dark:text-gray-200 text-xl font-bold py-4 px-4 hover:bg-[#3F4F44] dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-3 group active:scale-95"
              >
                <FaCog className="text-lg group-hover:rotate-90 transition-transform" />
                <span>Settings</span>
              </button>
              <div className="border-t border-[#3F4F44] dark:border-gray-700 my-2"></div>
              <button
                onClick={handleSignOut}
                className="w-full text-[#DCD7C9] dark:text-gray-200 text-xl font-bold py-4 px-4 hover:bg-red-900/50 dark:hover:bg-red-800/50 rounded-lg transition-all duration-200 flex items-center gap-3 group active:scale-95"
              >
                <FaSignOutAlt className="text-lg group-hover:scale-110 transition-transform" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {loading ? (
                <div className="col-span-full text-[#DCD7C9] dark:text-gray-200 text-center py-12">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DCD7C9] dark:border-gray-200"></div>
                    <p className="text-lg md:text-2xl">
                      Loading your adventure stats...
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="col-span-full text-[#DCD7C9] dark:text-gray-200 text-center bg-red-900/30 dark:bg-red-800/30 rounded-lg p-6 backdrop-blur-sm">
                  <p className="text-lg md:text-2xl text-red-200 dark:text-red-300">
                    {error}
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div
                    className="bg-[#DCD7C9]/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 md:p-6 text-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 border-2 border-[#2C3930]/20 dark:border-gray-700/50 cursor-pointer group min-h-[180px] flex items-center justify-center"
                    onClick={() =>
                      navigate("/plan", { state: { from: "home" } })
                    }
                  >
                    <div className="relative w-full">
                      <FaGlobeAmericas className="w-12 h-12 md:w-16 md:h-16 mx-auto text-[#2C3930] dark:text-gray-300 group-hover:scale-110 transition-transform duration-300" />
                      <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#2C3930] dark:text-gray-200 my-3 md:my-4 bg-gradient-to-r from-[#2C3930] to-[#3F4F44] dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                        {animatedStats.totalTripsPlanned}
                      </h2>
                      <p className="text-sm md:text-lg font-bold text-[#2C3930] dark:text-gray-300">
                        Total Trips Planned
                      </p>
                      {userStats.totalTripsPlanned === 0 && (
                        <p className="text-xs text-[#2C3930]/70 dark:text-gray-400 mt-2">
                          Click to start planning!
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="bg-[#DCD7C9]/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 md:p-6 text-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 border-2 border-[#2C3930]/20 dark:border-gray-700/50 cursor-pointer group min-h-[180px] flex items-center justify-center"
                    onClick={() => navigate("/explore")}
                  >
                    <div className="relative w-full">
                      <FaMountain className="w-12 h-12 md:w-16 md:h-16 mx-auto text-[#2C3930] dark:text-gray-300 group-hover:scale-110 transition-transform duration-300" />
                      <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#2C3930] dark:text-gray-200 my-3 md:my-4 bg-gradient-to-r from-[#2C3930] to-[#3F4F44] dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                        {animatedStats.nationalParksVisited}
                      </h2>
                      <p className="text-sm md:text-lg font-bold text-[#2C3930] dark:text-gray-300">
                        National Parks Visited
                      </p>
                      {userStats.nationalParksVisited === 0 && (
                        <p className="text-xs text-[#2C3930]/70 dark:text-gray-400 mt-2">
                          Explore parks to get started!
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="bg-[#DCD7C9]/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 md:p-6 text-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 border-2 border-[#2C3930]/20 dark:border-gray-700/50 cursor-pointer group min-h-[180px] flex items-center justify-center"
                    onClick={() => navigate("/explore")}
                  >
                    <div className="relative w-full">
                      <FaTree className="w-12 h-12 md:w-16 md:h-16 mx-auto text-[#2C3930] dark:text-gray-300 group-hover:scale-110 transition-transform duration-300" />
                      <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#2C3930] dark:text-gray-200 my-3 md:my-4 bg-gradient-to-r from-[#2C3930] to-[#3F4F44] dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                        {animatedStats.stateParksVisited}
                      </h2>
                      <p className="text-sm md:text-lg font-bold text-[#2C3930] dark:text-gray-300">
                        State Parks Visited
                      </p>
                      {userStats.stateParksVisited === 0 && (
                        <p className="text-xs text-[#2C3930]/70 dark:text-gray-400 mt-2">
                          Discover state parks!
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="bg-[#DCD7C9]/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 md:p-6 text-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 border-2 border-[#2C3930]/20 dark:border-gray-700/50 cursor-pointer group min-h-[180px] flex items-center justify-center"
                    onClick={() =>
                      navigate("/plan", { state: { from: "home" } })
                    }
                  >
                    <div className="relative w-full">
                      <FaRoute className="w-12 h-12 md:w-16 md:h-16 mx-auto text-[#2C3930] dark:text-gray-300 group-hover:scale-110 transition-transform duration-300" />
                      <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#2C3930] dark:text-gray-200 my-3 md:my-4 bg-gradient-to-r from-[#2C3930] to-[#3F4F44] dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                        {animatedStats.milesOfTrailsPlanned}
                      </h2>
                      <p className="text-sm md:text-lg font-bold text-[#2C3930] dark:text-gray-300">
                        Miles of Trails Planned
                      </p>
                      {userStats.milesOfTrailsPlanned === 0 && (
                        <p className="text-xs text-[#2C3930]/70 dark:text-gray-400 mt-2">
                          Plan your first trail!
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="bg-[#DCD7C9]/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 md:p-6 text-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 border-2 border-[#2C3930]/20 dark:border-gray-700/50 cursor-pointer group min-h-[180px] flex items-center justify-center"
                    onClick={() =>
                      navigate("/plan", { state: { from: "home" } })
                    }
                  >
                    <div className="relative w-full">
                      <FaCampground className="w-12 h-12 md:w-16 md:h-16 mx-auto text-[#2C3930] dark:text-gray-300 group-hover:scale-110 transition-transform duration-300" />
                      <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#2C3930] dark:text-gray-200 my-3 md:my-4 bg-gradient-to-r from-[#2C3930] to-[#3F4F44] dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                        {animatedStats.campgroundsStayed}
                      </h2>
                      <p className="text-sm md:text-lg font-bold text-[#2C3930] dark:text-gray-300">
                        Campgrounds Stayed
                      </p>
                      {userStats.campgroundsStayed === 0 && (
                        <p className="text-xs text-[#2C3930]/70 dark:text-gray-400 mt-2">
                          Find your perfect campsite!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {Object.values(userStats).every((stat) => stat === 0) && (
                    <div className="col-span-full mt-6 bg-[#DCD7C9]/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-2xl border-2 border-[#2C3930]/20 dark:border-gray-700/50">
                      <h3 className="text-xl md:text-2xl font-bold text-[#2C3930] dark:text-gray-200 mb-4 text-center">
                        Ready to Start Your Adventure?
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                        <button
                          onClick={() => navigate("/explore")}
                          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#2C3930] to-[#3F4F44] dark:from-gray-700 dark:to-gray-600 text-[#DCD7C9] dark:text-gray-200 px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                        >
                          <FaSearch className="text-lg" />
                          Explore Parks
                        </button>
                        <button
                          onClick={() =>
                            navigate("/plan", { state: { from: "home" } })
                          }
                          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#97a88c] to-[#7a8971] dark:from-gray-600 dark:to-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                        >
                          <FaRocket className="text-lg" />
                          Start Planning
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
