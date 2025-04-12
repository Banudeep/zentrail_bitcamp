import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaMapMarkedAlt, FaComments } from "react-icons/fa";

const Plan: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] to-[#d3d9cf]">
      <div className="max-w-7xl mx-auto p-3">
        {/* Back Button */}
        <div className="mb-2">
          <Link
            to="/Home"
            className="inline-flex items-center gap-2 text-[#4d5e56] hover:text-[#97a88c] transition-colors duration-200"
          >
            <FaArrowLeft />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FaComments className="text-2xl text-[#97a88c]" />
            <h1 className="text-2xl font-bold text-[#4d5e56]">
              Plan Your Trip
            </h1>
          </div>
          <p className="text-sm text-[#4d5e56] max-w-2xl mx-auto">
            Chat with our AI assistant to plan your perfect national park
            adventure
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-3">
          {/* Left Column - Chatbot */}
          <div className="col-span-4 bg-[#f5f2e8] rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-[#d3d9cf]">
              <h2 className="text-base font-semibold text-[#4d5e56] flex items-center gap-2">
                <FaComments className="text-[#97a88c]" />
                Trip Planner Assistant
              </h2>
            </div>
            <div className="h-[calc(100vh-220px)] flex flex-col">
              {/* Chat Messages Container */}
              <div className="flex-1 p-2 overflow-y-auto">
                <div className="space-y-2">
                  {/* AI Message */}
                  <div className="flex items-start gap-2">
                    <div className="bg-[#d3d9cf] rounded-lg p-2 max-w-[80%]">
                      <p className="text-sm text-[#4d5e56]">
                        Hello! I'm your trip planning assistant. Where would you
                        like to explore?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Chat Input */}
              <div className="p-2 border-t border-[#d3d9cf]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 rounded-lg border border-[#97a88c] focus:outline-none focus:ring-2 focus:ring-[#97a88c] text-sm text-[#4d5e56]"
                  />
                  <button className="px-4 py-2 bg-[#97a88c] text-white rounded-lg hover:bg-[#7a8b70] transition-colors duration-200">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="col-span-8">
            <div className="bg-[#f5f2e8] rounded-lg shadow-lg overflow-hidden">
              <div className="p-2 border-b border-[#d3d9cf]">
                <h2 className="text-base font-semibold text-[#4d5e56] flex items-center gap-2">
                  <FaMapMarkedAlt className="text-[#97a88c]" />
                  Trip Map
                </h2>
              </div>
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src="/assets/washington-map.png"
                  alt="Trip Planning Map"
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

export default Plan;
