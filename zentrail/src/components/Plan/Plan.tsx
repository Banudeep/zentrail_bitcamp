import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaArrowLeft, FaMapMarkedAlt, FaComments, FaSpinner } from "react-icons/fa";
import axios from "axios";

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  options?: Array<{
    id: string;
    name: string;
  }>;
}

interface ParkInfo {
  name: string;
  description: string;
  fullName: string;
  latitude: string;
  longitude: string;
  images: Array<{ url: string; caption: string; }>;
  activities: Array<{
    id: string;
    name: string;
  }>;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";

const Plan: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      type: 'ai', 
      content: 'Hello! I\'m your trip planning assistant. First, let me show you the available activities at this park.',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parkInfo, setParkInfo] = useState<ParkInfo | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const parkCode = queryParams.get('parkCode');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchParkInfo = async () => {
      if (!parkCode) return;
      
      try {
        const response = await axios.get(`${API_URL}/api/parks/park/${parkCode}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setParkInfo(response.data);
        
        // Add activities as options in the chat
        if (response.data.activities && response.data.activities.length > 0) {
          setMessages(prev => [...prev, {
            type: 'ai',
            content: 'Here are the available activities. Please select the ones you\'re interested in:',
            options: response.data.activities
          }]);
        }
      } catch (error) {
        console.error('Error fetching park info:', error);
      }
    };

    fetchParkInfo();
  }, [parkCode]);

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivities(prev => {
      const newSelection = prev.includes(activityId) 
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId];
      
      // If activities were selected, send them to the chat
      if (newSelection.length > 0) {
        const selectedNames = parkInfo?.activities
          .filter(act => newSelection.includes(act.id))
          .map(act => act.name)
          .join(', ');
        
        handleSubmit(null, `I'm interested in: ${selectedNames}`);
      }
      
      return newSelection;
    });
  };

  const handleSubmit = async (e: React.FormEvent | null, customMessage?: string) => {
    if (e) e.preventDefault();
    const messageText = customMessage || input;
    if ((!messageText.trim() && !customMessage) || isLoading) return;

    const userMessage = messageText.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/chat`,
        {
          message: userMessage,
          parkCode: parkCode,
          selectedActivities: selectedActivities
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: response.data.message.text || response.data.message,
        options: response.data.options
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

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
            Chat with our AI assistant to plan your perfect national park adventure
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
                  {messages.map((msg, index) => (
                    <div key={index} className="space-y-2">
                      <div className={`flex items-start gap-2 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                        <div className={`rounded-lg p-2 max-w-[80%] ${
                          msg.type === 'user' 
                            ? 'bg-[#97a88c] text-white' 
                            : 'bg-[#d3d9cf] text-[#4d5e56]'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                      {msg.options && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.options.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => handleActivitySelect(option.id)}
                              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                selectedActivities.includes(option.id)
                                  ? 'bg-[#97a88c] text-white'
                                  : 'bg-white border border-[#97a88c] text-[#4d5e56] hover:bg-[#97a88c] hover:text-white'
                              }`}
                            >
                              {option.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-2">
                      <div className="bg-[#d3d9cf] rounded-lg p-2">
                        <FaSpinner className="animate-spin text-[#4d5e56]" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSubmit} className="p-2 border-t border-[#d3d9cf]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 rounded-lg border border-[#97a88c] focus:outline-none focus:ring-2 focus:ring-[#97a88c] text-sm text-[#4d5e56]"
                    disabled={isLoading}
                  />
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#97a88c] text-white rounded-lg hover:bg-[#7a8b70] transition-colors duration-200 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="col-span-8">
            <div className="bg-[#f5f2e8] rounded-lg shadow-lg overflow-hidden">
              <div className="p-2 border-b border-[#d3d9cf]">
                <h2 className="text-base font-semibold text-[#4d5e56] flex items-center gap-2">
                  <FaMapMarkedAlt className="text-[#97a88c]" />
                  Park Information
                </h2>
              </div>
              <div className="p-4">
                {parkCode ? (
                  parkInfo ? (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-[#4d5e56]">{parkInfo.fullName}</h3>
                      <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                        {parkInfo.images && parkInfo.images.length > 0 && (
                          <img
                            src={parkInfo.images[0].url}
                            alt={parkInfo.images[0].caption}
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                      <p className="text-sm text-[#4d5e56]">{parkInfo.description}</p>
                      {parkInfo.latitude && parkInfo.longitude && (
                        <div className="mt-4">
                          <h4 className="font-medium text-[#4d5e56] mb-2">Location</h4>
                          <p className="text-sm text-[#4d5e56]">
                            Latitude: {parkInfo.latitude}<br />
                            Longitude: {parkInfo.longitude}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <FaSpinner className="animate-spin text-2xl text-[#97a88c]" />
                    </div>
                  )
                ) : (
                  <p className="text-sm text-[#4d5e56]">
                    Please select a park from the Explore page to get started.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plan;
