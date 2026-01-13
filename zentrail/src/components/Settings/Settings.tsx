import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaKey,
  FaBell,
  FaPalette,
  FaTrash,
  FaSave,
  FaEdit,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    tripReminders: true,
    parkUpdates: false,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/signin");
          return;
        }

        const response = await axios.get(`${API_URL}/api/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data) {
          setUser(response.data);
          setFormData({
            firstName: response.data.firstName || "",
            lastName: response.data.lastName || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/signin");
        return;
      }

      const response = await axios.put(
        `${API_URL}/api/auth/user`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data) {
        setUser(response.data);
        setIsEditing(false);
        setSuccess("Profile updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setError(
        error.response?.data?.message || "Failed to update profile. Please try again."
      );
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate password matches original constraints
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const trimmedPassword = passwordData.newPassword.trim();

    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Check for uppercase, lowercase, and number (matching signup requirements)
    const hasUpperCase = /[A-Z]/.test(trimmedPassword);
    const hasLowerCase = /[a-z]/.test(trimmedPassword);
    const hasNumber = /\d/.test(trimmedPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/signin");
        return;
      }

      await axios.put(
        `${API_URL}/api/auth/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error("Error changing password:", error);
      setError(
        error.response?.data?.message || "Failed to change password. Please check your current password."
      );
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/signin");
        return;
      }

      await axios.delete(`${API_URL}/api/auth/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      localStorage.removeItem("token");
      navigate("/signin");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      setError(
        error.response?.data?.message || "Failed to delete account. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] to-[#d3d9cf] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2C3930] dark:border-gray-300 mx-auto mb-4"></div>
          <p className="text-[#4d5e56] dark:text-gray-300 text-base md:text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] to-[#d3d9cf] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <button
            onClick={() => navigate("/Home")}
            className="inline-flex items-center gap-2 text-[#4d5e56] dark:text-gray-300 hover:text-[#97a88c] dark:hover:text-gray-100 transition-colors duration-200 mb-3 md:mb-4 text-sm md:text-base touch-manipulation"
          >
            <FaArrowLeft className="text-sm" />
            <span>Back to Home</span>
          </button>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#2C3930] dark:text-gray-200 mb-2">Settings</h1>
          <p className="text-sm md:text-base text-[#4d5e56] dark:text-gray-300">Manage your account and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-100 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-[#d3d9cf] dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FaUser className="text-xl md:text-2xl text-[#2C3930] dark:text-gray-300" />
            <h2 className="text-xl md:text-2xl font-semibold text-[#2C3930] dark:text-gray-200">
              Profile Information
            </h2>
          </div>

          {!isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-1">
                  First Name
                </label>
                <p className="text-base md:text-lg text-[#2C3930] dark:text-gray-200">{user?.firstName || "N/A"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <p className="text-base md:text-lg text-[#2C3930] dark:text-gray-200">{user?.lastName || "N/A"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-1">
                  Email
                </label>
                <p className="text-base md:text-lg text-[#2C3930] dark:text-gray-200">{user?.email || "N/A"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#2C3930] dark:bg-gray-700 text-white rounded-lg hover:bg-[#3F4F44] dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <FaEdit className="text-sm" />
                Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-[#4d5e56] dark:text-gray-200 border-2 border-[#d3d9cf] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C3930] dark:focus:ring-gray-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-[#4d5e56] dark:text-gray-200 border-2 border-[#d3d9cf] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C3930] dark:focus:ring-gray-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2 border-2 border-[#d3d9cf] dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2C3930] dark:bg-gray-700 text-white rounded-lg hover:bg-[#3F4F44] dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <FaSave className="text-sm" />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      firstName: user?.firstName || "",
                      lastName: user?.lastName || "",
                    });
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Password Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-[#d3d9cf] dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FaKey className="text-xl md:text-2xl text-[#2C3930] dark:text-gray-300" />
            <h2 className="text-xl md:text-2xl font-semibold text-[#2C3930] dark:text-gray-200">
              Change Password
            </h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-[#4d5e56] dark:text-gray-200 border-2 border-[#d3d9cf] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C3930] dark:focus:ring-gray-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-[#4d5e56] dark:text-gray-200 border-2 border-[#d3d9cf] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C3930] dark:focus:ring-gray-500 focus:border-transparent"
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4d5e56] dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-[#4d5e56] dark:text-gray-200 border-2 border-[#d3d9cf] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C3930] dark:focus:ring-gray-500 focus:border-transparent"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2C3930] dark:bg-gray-700 text-white rounded-lg hover:bg-[#3F4F44] dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <FaKey className="text-sm" />
              Update Password
            </button>
          </form>
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-[#d3d9cf] dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FaPalette className="text-xl md:text-2xl text-[#2C3930] dark:text-gray-300" />
            <h2 className="text-xl md:text-2xl font-semibold text-[#2C3930] dark:text-gray-200">
              Appearance
            </h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-[#4d5e56] dark:text-gray-300">
                Theme
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isDarkMode ? "Dark mode" : "Light mode"}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2C3930] dark:bg-gray-700 text-white rounded-lg hover:bg-[#3F4F44] dark:hover:bg-gray-600 transition-colors duration-200"
            >
              {isDarkMode ? (
                <>
                  <FaSun className="text-sm" />
                  Switch to Light
                </>
              ) : (
                <>
                  <FaMoon className="text-sm" />
                  Switch to Dark
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-[#d3d9cf] dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FaBell className="text-xl md:text-2xl text-[#2C3930] dark:text-gray-300" />
            <h2 className="text-xl md:text-2xl font-semibold text-[#2C3930] dark:text-gray-200">
              Notifications
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#4d5e56] dark:text-gray-300">
                  Email Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive updates via email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={() => handleNotificationChange("email")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2C3930]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C3930]"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#4d5e56] dark:text-gray-300">
                  Trip Reminders
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get reminders about upcoming trips
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.tripReminders}
                  onChange={() => handleNotificationChange("tripReminders")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2C3930]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C3930]"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#4d5e56] dark:text-gray-300">
                  Park Updates
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Notifications about new parks and features
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.parkUpdates}
                  onChange={() => handleNotificationChange("parkUpdates")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2C3930]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C3930]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-4">
            <FaTrash className="text-xl md:text-2xl text-red-600 dark:text-red-400" />
            <h2 className="text-xl md:text-2xl font-semibold text-red-600 dark:text-red-400">
              Danger Zone
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Once you delete your account, there is no going back. Please be
            certain.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

