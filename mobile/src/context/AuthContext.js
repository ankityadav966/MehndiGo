import { createContext, useContext, useEffect, useMemo, useReducer, useCallback, useState } from "react";
import { secureStorage } from "../utils/storage";
import {
  signInWithGoogle,
  signInWithEmail,
  registerUser,
  verifyOtp,
  sendOtp as sendOtpService,
  verifyUserOtp as verifyUserOtpService,
  signOut as authSignOut,
  refreshAccessToken,
} from "../services/auth";

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  isOnboardingComplete: false,
};

function normalizeRole(role) {
  if (!role) return null;
  return String(role).toUpperCase().trim() === "ARTIST" ? "ARTIST" : "CUSTOMER";
}

function authReducer(state, action) {
  switch (action.type) {
    case "RESTORE_SESSION": {
      const canonicalRole = normalizeRole(action.payload.user?.role || action.payload.role);
      const user = action.payload.user ? { ...action.payload.user, role: canonicalRole } : null;
      return {
        ...state,
        user,
        token: action.payload.token,
        role: user ? canonicalRole : null,
        isAuthenticated: !!user,
        isLoading: false,
      };
    }
    case "LOGIN": {
      const canonicalRole = normalizeRole(action.payload.user?.role || action.payload.role) || "CUSTOMER";
      const user = action.payload.user ? { ...action.payload.user, role: canonicalRole } : null;
      return {
        ...state,
        user,
        token: action.payload.token,
        role: canonicalRole,
        isAuthenticated: true,
        isLoading: false,
      };
    }
    case "SET_ROLE":
      return { ...state, role: normalizeRole(action.payload) };
    case "UPDATE_USER": {
      const updatedUser = action.payload ? { ...state.user, ...action.payload } : state.user;
      const canonicalRole = normalizeRole(updatedUser?.role) || state.role;
      return { ...state, user: updatedUser ? { ...updatedUser, role: canonicalRole } : null, role: canonicalRole };
    }
    case "LOGOUT":
      return { ...initialState, isLoading: false };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(false);
  }, []);

  const toggleTheme = useCallback(async () => {
    // No-op
  }, []);

  useEffect(() => {
    try {
      const { applyTheme } = require("../theme/ThemeManager");
      applyTheme(isDarkMode);
      if (__DEV__) console.log("[ThemeManager] Applied theme state:", isDarkMode ? "dark" : "light");
    } catch (err) {
      console.warn("[ThemeManager] Theme switch error:", err.message);
    }
  }, [isDarkMode]);

  useEffect(() => {
    global.logoutHandler = () => {
      dispatch({ type: "LOGOUT" });
    };
    let isMounted = true;
    async function restoreSession() {
      try {
        const [token, user, role] = await Promise.all([
          secureStorage.getAccessToken(),
          secureStorage.getUserData(),
          secureStorage.getUserRole(),
        ]);
        if (isMounted) {
          if (token && user) {
            dispatch({ type: "RESTORE_SESSION", payload: { user, token, role } });
          } else {
            dispatch({ type: "RESTORE_SESSION", payload: { user: null, token: null, role: null } });
          }
        }
      } catch (e) {
        if (isMounted) {
          dispatch({ type: "RESTORE_SESSION", payload: { user: null, token: null, role: null } });
        }
      }
    }
    restoreSession();
    return () => {
      isMounted = false;
      global.logoutHandler = null;
    };
  }, []);

  const triggerPendingDeepLinkResume = useCallback(() => {
    setTimeout(() => {
      if (global.navigationRef && global.navigationRef.isReady && global.navigationRef.isReady()) {
        try {
          const { consumePendingDeepLink } = require("../services/deepLink");
          consumePendingDeepLink(global.navigationRef, true);
        } catch (e) {
          if (__DEV__) console.log("[AuthContext] Failed to resume pending link:", e.message);
        }
      }
    }, 400);
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await signInWithGoogle(idToken);
      dispatch({ type: "LOGIN", payload: { user: data.user, token: data.accessToken, role: data.user.role } });
      triggerPendingDeepLinkResume();
      return data;
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  }, [triggerPendingDeepLinkResume]);

  const loginWithEmail = useCallback(async (email, password) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await signInWithEmail(email, password);
      dispatch({ type: "LOGIN", payload: { user: data.user, token: data.accessToken, role: data.user.role } });
      triggerPendingDeepLinkResume();
      return data;
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  }, [triggerPendingDeepLinkResume]);

  const register = useCallback(async (userData) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await registerUser(userData);
      dispatch({ type: "LOGIN", payload: { user: data.user, token: data.accessToken, role: data.user.role } });
      triggerPendingDeepLinkResume();
      return data;
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  }, [triggerPendingDeepLinkResume]);

  const verifyOtpAndLogin = useCallback(async (email, otp) => {
    try {
      const data = await verifyOtp(email, otp);
      dispatch({ type: "LOGIN", payload: { user: data.user, token: data.accessToken, role: data.user.role } });
      triggerPendingDeepLinkResume();
      return data;
    } catch (error) {
      throw error;
    }
  }, [triggerPendingDeepLinkResume]);

  const sendOtp = useCallback(async (email, role) => {
    return await sendOtpService(email, undefined, role);
  }, []);

  const verifyOtpAndAuthenticate = useCallback(async (email, otp) => {
    try {
      const data = await verifyUserOtpService(email, otp);
      dispatch({
        type: "LOGIN",
        payload: {
          user: data.user,
          token: data.token,
          role: data.user.role,
        },
      });
      triggerPendingDeepLinkResume();
      return data;
    } catch (error) {
      throw error;
    }
  }, [triggerPendingDeepLinkResume]);

  const setUserRole = useCallback(async (role) => {
    secureStorage.setUserRole(role);
    dispatch({ type: "SET_ROLE", payload: role });
  }, []);

  const setOnboardingComplete = useCallback(() => {
    secureStorage.setUserData({ ...state.user, onboardingComplete: true });
    dispatch({ type: "UPDATE_USER", payload: { onboardingComplete: true } });
  }, [state.user]);

  const logout = useCallback(async () => {
    try {
      const { clearArtistDashboardMemoryCache } = require("../screens/Artist/DashboardScreen");
      if (typeof clearArtistDashboardMemoryCache === "function") {
        clearArtistDashboardMemoryCache();
      }
    } catch (_) {}
    await authSignOut();
    dispatch({ type: "LOGOUT" });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isDarkMode,
      toggleTheme,
      loginWithGoogle,
      loginWithEmail,
      register,
      verifyOtpAndLogin,
      sendOtp,
      verifyOtpAndAuthenticate,
      logout,
      setUserRole,
      setOnboardingComplete,
      dispatch,
    }),
    [state, isDarkMode, toggleTheme, loginWithGoogle, loginWithEmail, register, verifyOtpAndLogin, sendOtp, verifyOtpAndAuthenticate, logout, setUserRole, setOnboardingComplete],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
