import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { router, useSegments } from "expo-router";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [isLoading, setIsLoading] = useState(true);
  
  const segments = useSegments();

  useEffect(() => {
    // Load initial state from storage
    const loadState = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("token");
        const savedUser = await AsyncStorage.getItem("user");
        const savedTheme = await AsyncStorage.getItem("theme");

        if (savedToken) {
          setToken(savedToken);
          // Try to decode if needed, or rely on profile API
          try {
            const payload = JSON.parse(atob(savedToken.split(".")[1]));
            setUser((prev) => {
              if (prev && prev.id === payload.id) return prev;
              return { id: payload.id, role: payload.role, ...(savedUser ? JSON.parse(savedUser) : {}) };
            });
          } catch (e) {
            // Invalid token payload, ignore or logout
          }
        }
        
        if (savedUser) setUser(JSON.parse(savedUser));
        
        if (savedTheme) {
          setTheme(savedTheme);
        } else {
          const colorScheme = Appearance.getColorScheme();
          setTheme(colorScheme === "dark" ? "dark" : "light");
        }
      } catch (e) {
        console.error("Failed to load state", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadState();
  }, []);

  // Simplified Route Protection
  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === "(auth)";
    const inAppGroup = segments[0] === "(user)" || segments[0] === "(artist)" || segments[0] === "(admin)";
    
    if (!token && inAppGroup) {
      // Redirect to login if unauthenticated and trying to access app screens
      router.replace("/login");
    } else if (token && inAuthGroup) {
      // Redirect to app if authenticated and trying to access auth screens
      if (user?.role === "ADMIN") {
        router.replace("/(admin)");
      } else if (user?.role === "ARTIST") {
        router.replace("/(artist)");
      } else {
        router.replace("/(user)");
      }
    }
  }, [token, segments, isLoading, user]);

  const loginSuccess = async (userToken, userData) => {
    try {
      await AsyncStorage.setItem("token", userToken);
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setToken(userToken);
      setUser(userData);
    } catch (e) {
      console.error("Failed to save session", e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      setToken(null);
      setUser(null);
      router.replace("/login");
    } catch (e) {
      console.error("Failed to clear session", e);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem("theme", newTheme);
    } catch (e) {
      console.error("Failed to save theme", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loginSuccess,
        logout,
        theme,
        toggleTheme,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
