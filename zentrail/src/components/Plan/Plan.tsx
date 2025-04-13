import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaMapMarkedAlt, FaComments, FaSpinner } from "react-icons/fa";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface ParkPreferences {
  start_date: string;
  end_date: string;
  group_size: number;
  time_preferences: string[];
}

interface Activity {
  id: string;
  name: string;
}

interface PlanningQuestion {
  id: string;
  question: string;
  type: string;
  options?: Array<{
    id: string;
    name: string;
  }>;
}

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
  activities: Activity[];
}

interface ParkActivitiesSectionProps {
  activities: Activity[];
  onActivitySelect: (activityId: string) => void;
  selectedActivities: string[];
}

const ParkActivitiesSection: React.FC<ParkActivitiesSectionProps> = ({ activities, onActivitySelect, selectedActivities }) => (
  <div className="mt-4">
    <h4 className="font-medium text-[#4d5e56] mb-2">Available Activities</h4>
    <div className="grid grid-cols-2 gap-2">
      {activities.map((activity) => (
        <button
          key={activity.id}
          onClick={() => onActivitySelect(activity.id)}
          className={`p-2 rounded-lg text-sm text-left transition-colors duration-200 ${
            selectedActivities.includes(activity.id)
              ? 'bg-[#97a88c] text-white'
              : 'bg-white text-[#4d5e56] hover:bg-[#e7ebe4]'
          }`}
        >
          {activity.name}
        </button>
      ))}
    </div>
  </div>
);

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || "http://localhost:8000";

const Plan: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [parkInfo, setParkInfo] = useState<ParkInfo | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedTimePrefs, setSelectedTimePrefs] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<PlanningQuestion[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [preferences, setPreferences] = useState<Partial<ParkPreferences>>({});
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [userMessage, setUserMessage] = useState<string>('');
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const parkCode = queryParams.get('parkCode');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentQuestionIndex]);

  // Initialize chat and fetch park info
  useEffect(() => {
    const initChat = async () => {
      if (!parkCode) {
        return;
      }

      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/signin');
          return;
        }

        // Get all data from FastAPI in parallel
        const [parkResponse, questionsResponse] = await Promise.all([
          axios.get(`${FASTAPI_URL}/park/${parkCode}`),
          axios.get(`${FASTAPI_URL}/planning/initial-questions`)
        ]);
        
        if (!parkResponse.data) {
          throw new Error('Park information not found');
        }

        if (!questionsResponse.data?.questions) {
          throw new Error('Failed to load initial questions');
        }

        const parkData = parkResponse.data;
        const initialQuestions = questionsResponse.data.questions;
        
        setParkInfo(parkData);
        setQuestions(initialQuestions);
        setQuestionsLoaded(true);

        // Set welcome message and first question
        setMessages([
          { 
            type: 'ai', 
            content: `Welcome! Let's plan your trip to ${parkData.name}. I'll ask you a few questions to better assist you.`
          },
          {
            type: 'ai',
            content: initialQuestions[0].question,
            options: initialQuestions[0].options
          }
        ]);

      } catch (error: any) {
        console.error('Error initializing chat:', error);
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        setMessages([{ 
          type: 'ai', 
          content: `Sorry, there was an error loading the park information: ${errorMessage}. Please try refreshing the page.`
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();
  }, [parkCode, navigate]);

  const handleDateSelect = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    
    if (start && end) {
      const formattedStart = start.toISOString().split('T')[0];
      const formattedEnd = end.toISOString().split('T')[0];
      handlePreferenceSubmit({
        start_date: formattedStart,
        end_date: formattedEnd
      }, 'dates');
    }
  };

  const handleGroupSizeSubmit = (size: string) => {
    const groupSize = parseInt(size);
    if (!isNaN(groupSize) && groupSize > 0) {
      handlePreferenceSubmit({ group_size: groupSize }, 'group_size');
    }
  };

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivities(prev => {
      const newActivities = prev.includes(activityId)
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId];
      
      // Update chat context with new activities
      setMessages(messages => [
        ...messages,
        {
          type: 'ai',
          content: `I see you're interested in ${
            newActivities.map(id => 
              parkInfo?.activities.find(a => a.id === id)?.name
            ).filter(Boolean).join(', ')
          }. Feel free to ask me specific questions about these activities!`
        }
      ]);
      
      return newActivities;
    });
  };

  const handleTimePreferenceSubmit = (selectedTimes: string[]) => {
    setSelectedTimePrefs(selectedTimes);
    if (selectedTimes.length > 0) {  // Only submit if at least one time is selected
      handlePreferenceSubmit({ time_preferences: selectedTimes }, 'time_preferences');
    }
  };

  const handlePreferenceSubmit = async (preference: any, questionId: string) => {
    setPreferences(prev => ({
      ...prev,
      ...preference
    }));

    // Add user's response to chat
    let responseText = '';
    switch (questionId) {
      case 'dates':
        responseText = `From ${preference.start_date} to ${preference.end_date}`;
        break;
      case 'group_size':
        responseText = `${preference.group_size} people`;
        break;
      case 'time_preferences':
        responseText = `Preferred times: ${preference.time_preferences.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}`;
        break;
      case 'activities':
        if (parkInfo?.activities) {
          const activityNames = preference.selected_activities
            .map((id: string) => parkInfo.activities.find(a => a.id === id)?.name)
            .filter(Boolean)
            .join(', ');
          responseText = `Selected activities: ${activityNames}`;
        }
        break;
    }

    setMessages(prev => [...prev, {
      type: 'user',
      content: responseText
    }]);

    // Move to next question if available
    if (currentQuestionIndex < questions.length - 1) {
      const nextQuestion = questions[currentQuestionIndex + 1];
      setCurrentQuestionIndex(prev => prev + 1);
      
      // Add a small delay before showing the next question
      setTimeout(() => {
        setMessages(prev => [...prev, {
          type: 'ai',
          content: nextQuestion.question,
          options: nextQuestion.options
        }]);
      }, 500);
    } else {
      // All preferences collected, save them using FASTAPI_URL
      try {
        setIsLoading(true);
        const prefWithActivities = {
          ...preferences,
          selected_activities: selectedActivities
        };
        
        await axios.post(`${FASTAPI_URL}/planning/save-preferences/${parkCode}`, prefWithActivities);
        
        setMessages(prev => [...prev, {
          type: 'ai',
          content: "Great! I've collected all your preferences. You can now ask me questions about planning your trip to the park. For example:\n- What are the best trails for our group?\n- What activities do you recommend for mornings?\n- Where should we stay?"
        }]);
      } catch (error) {
        console.error('Error saving preferences:', error);
        setMessages(prev => [...prev, {
          type: 'ai',
          content: "I encountered an error saving your preferences. Please try again or refresh the page."
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleChatSubmit = async (message: string) => {
    if (!message.trim() || !parkCode) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { type: 'user', content: message }]);

      const response = await axios.post(`${FASTAPI_URL}/chat`, {
        message,
        parkCode,
        selectedActivities
      });

      setMessages(prev => [...prev, {
        type: 'ai',
        content: response.data.response
      }]);

      // If the response suggests new activities, highlight them
      if (response.data.suggested_activities) {
        const suggestedIds = response.data.suggested_activities.map((act: any) => act.id);
        setSelectedActivities(prev => [...new Set([...prev, ...suggestedIds])]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: "I encountered an error processing your request. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderQuestionInput = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'date_range':
        return (
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(dates) => handleDateSelect(dates as [Date | null, Date | null])}
            className="px-3 py-2 rounded-lg border border-[#97a88c] focus:outline-none focus:ring-2 focus:ring-[#97a88c] text-sm text-[#4d5e56]"
            placeholderText="Select date range"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            min="1"
            placeholder="Enter number of people"
            onChange={(e) => handleGroupSizeSubmit(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#97a88c] focus:outline-none focus:ring-2 focus:ring-[#97a88c] text-sm text-[#4d5e56]"
          />
        );
      case 'multiple_choice':
        if (currentQuestion.options) {
          return (
            <div className="flex flex-wrap gap-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    if (currentQuestion.id === 'time_preferences') {
                      const newSelection = selectedTimePrefs.includes(option.id)
                        ? selectedTimePrefs.filter(id => id !== option.id)
                        : [...selectedTimePrefs, option.id];
                      handleTimePreferenceSubmit(newSelection);
                    } else if (currentQuestion.id === 'activities') {
                      handleActivitySelect(option.id);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    (currentQuestion.id === 'time_preferences' ? selectedTimePrefs : selectedActivities).includes(option.id)
                      ? 'bg-[#97a88c] text-white'
                      : 'bg-white border border-[#97a88c] text-[#4d5e56] hover:bg-[#97a88c] hover:text-white'
                  }`}
                >
                  {option.name}
                </button>
              ))}
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  const renderChatInput = () => {
    if (currentQuestionIndex >= questions.length) {
      return (
        <form onSubmit={(e) => {
          e.preventDefault();
          handleChatSubmit(userMessage);
          setUserMessage('');
        }} className="flex gap-2">
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder="Ask me about planning your trip..."
            className="flex-1 px-3 py-2 rounded-lg border border-[#97a88c] focus:outline-none focus:ring-2 focus:ring-[#97a88c] text-sm text-[#4d5e56]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-[#97a88c] text-white rounded-lg hover:bg-[#7a8b70] transition-colors duration-200 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      );
    }
    return renderQuestionInput();
  };

  if (!parkCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] to-[#d3d9cf]">
        <div className="max-w-7xl mx-auto p-3">
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            <FaMapMarkedAlt className="text-6xl text-[#97a88c] mb-4" />
            <h1 className="text-2xl font-bold text-[#4d5e56] mb-2">
              Select a Park to Start Planning
            </h1>
            <p className="text-sm text-[#4d5e56] mb-6 max-w-md">
              Please select a national park from our Explore page to start planning your perfect adventure.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="px-6 py-3 bg-[#97a88c] text-white rounded-lg hover:bg-[#7a8b70] transition-colors duration-200"
            >
              Explore Parks
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {(!questionsLoaded && isLoading) ? (
          <div className="flex items-center justify-center h-64">
            <FaSpinner className="animate-spin text-3xl text-[#97a88c]" />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            {/* Left Column - Chatbot */}
            <div className="col-span-4 bg-[#f5f2e8] rounded-lg shadow-lg overflow-hidden h-[calc(100vh-180px)] flex flex-col">
              <div className="p-2 border-b border-[#d3d9cf]">
                <h2 className="text-base font-semibold text-[#4d5e56] flex items-center gap-2">
                  <FaComments className="text-[#97a88c]" />
                  Trip Planner Assistant
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
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
              <div className="p-2 border-t border-[#d3d9cf]">
                <div className="flex gap-2">
                  {renderChatInput()}
                </div>
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
                        <ParkActivitiesSection
                          activities={parkInfo.activities}
                          onActivitySelect={handleActivitySelect}
                          selectedActivities={selectedActivities}
                        />
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
        )}
      </div>
    </div>
  );
};

export default Plan;
