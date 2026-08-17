import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const normalizeUserData = (data) => {
    if (!data) return null;
    return {
      ...data,
      role: (data.role || "USER").toUpperCase()
    };
  };

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? normalizeUserData(JSON.parse(savedUser)) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (token) {
      // Decode user details from token if needed, or get from profile API
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser((prev) => {
          if (prev && prev.id === payload.id) {
            return { ...prev, role: (prev.role || payload.role || "USER").toUpperCase() };
          }
          return { id: payload.id, role: (payload.role || "USER").toUpperCase() };
        });
      } catch (e) {
        logout();
      }
    }
  }, [token]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const loginSuccess = (userToken, userData) => {
    const cleanUser = normalizeUserData(userData);
    localStorage.setItem("token", userToken);
    localStorage.setItem("user", JSON.stringify(cleanUser));
    setToken(userToken);
    setUser(cleanUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
