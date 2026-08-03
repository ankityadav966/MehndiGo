import { createContext, useContext, useEffect, useMemo, useReducer, useCallback, useState } from "react";
import { secureStorage } from "../utils/storage";
import apiRequest from "../services/api";
import {
  signInWithGoogle,
  signInWithEmail,
  registerUser,
  verifyOtp,
  sendOtp as sendOtpService,
  verifyUserOtp as verifyUserOtpService,
  signOut as authSignOut,
  checkEmail as checkEmailService,
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

function authReducer(state, action) {
  switch (action.type) {
    case "RESTORE_SESSION": {
      const userRole = action.payload.user?.role || action.payload.role;
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        role: userRole,
        isAuthenticated: !!action.payload.user,
        isLoading: false,
      };
    }
    case "LOGIN": {
      const userRole = action.payload.user?.role || action.payload.role;
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        role: userRole,
        isAuthenticated: true,
        isLoading: false,
      };
    }
    case "SET_ROLE":
      return { ...state, role: action.payload };
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.payload } };
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

  const toggleTheme = useCallback(async () => {}, []);

  useEffect(() => {
    try {
      const { applyTheme } = require("../theme/ThemeManager");
      applyTheme(isDarkMode);
    } catch (err) {}
  }, [isDarkMode]);

  useEffect(() => {
    global.logoutHandler = () => {
      dispatch({ type: "LOGOUT" });
    };

    async function restoreSession() {
      try {
        const token = await secureStorage.getAccessToken();
        const storedUser = await secureStorage.getUserData();
        const storedRole = await secureStorage.getUserRole();

        if (token && storedUser) {
          // Instantly restore logged-in session so user goes DIRECTLY to Home!
          dispatch({
            type: "RESTORE_SESSION",
            payload: {
              user: storedUser,
              token,
              role: storedRole || storedUser.role || "USER",
            },
          });

          // Background sync latest profile & artist completion status from backend
          try {
            const profileRes = await apiRequest("GET", "/api/v1/mehndigo/user/profile", null, true);
            const freshUser = profileRes?.data || profileRes?.user || profileRes;
            if (freshUser && typeof freshUser === "object") {
              const freshRole = freshUser.role || storedRole || "USER";
              await secureStorage.setUserData(freshUser);
              await secureStorage.setUserRole(freshRole);
              if (freshUser.artistProfileCompleted !== undefined) {
                await secureStorage.setArtistProfileCompleted(freshUser.artistProfileCompleted);
              }
              dispatch({
                type: "UPDATE_USER",
                payload: freshUser,
              });
            }
          } catch (bgErr) {
            console.log("[AuthContext] Background profile sync note:", bgErr.message);
          }
          return;
        }

        dispatch({ type: "RESTORE_SESSION", payload: { user: null, token: null, role: null } });
      } catch (e) {
        dispatch({ type: "RESTORE_SESSION", payload: { user: null, token: null, role: null } });
      }
    }

    restoreSession();
    return () => {
      global.logoutHandler = null;
    };
  }, []);

  const checkEmail = useCallback(async (email) => {
    return await checkEmailService(email);
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await signInWithGoogle(idToken);
      dispatch({ type: "LOGIN", payload: { user: data.user, token: data.accessToken, role: data.user.role } });
      return data;
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  }, []);

  const loginWithEmail = useCallback(async (email, password) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await signInWithEmail(email, password);
      dispatch({ type: "LOGIN", payload: { user: data.user, token: data.accessToken, role: data.user.role } });
      return data;
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  }, []);

  const register = useCallback(async (userData) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await registerUser(userData);
      dispatch({ type: "LOGIN", payload: { user: data.user, token: data.accessToken, role: data.user.role } });
      return data;
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  }, []);

  const verifyOtpAndLogin = useCallback(async (email, otp) => {
    try {
      const data = await verifyOtp(email, otp);
      dispatch({ type: "LOGIN", payload: { user: data.user, token: data.accessToken, role: data.user.role } });
      return data;
    } catch (error) {
      throw error;
    }
  }, []);

  const sendOtp = useCallback(async (options) => {
    return await sendOtpService(options);
  }, []);

  const verifyOtpAndAuthenticate = useCallback(async (email, otp) => {
    try {
      const data = await verifyUserOtpService(email, otp);
      const user = data.user;
      const role = user?.role || "USER";
      dispatch({
        type: "LOGIN",
        payload: {
          user,
          token: data.token || data.accessToken,
          role,
        },
      });
      return data;
    } catch (error) {
      throw error;
    }
  }, []);

  const setUserRole = useCallback(async (role) => {
    secureStorage.setUserRole(role);
    dispatch({ type: "SET_ROLE", payload: role });
  }, []);

  const setOnboardingComplete = useCallback(() => {
    secureStorage.setUserData({ ...state.user, onboardingComplete: true });
    dispatch({ type: "UPDATE_USER", payload: { onboardingComplete: true } });
  }, [state.user]);

  const logout = useCallback(async () => {
    await authSignOut();
    dispatch({ type: "LOGOUT" });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isDarkMode,
      toggleTheme,
      checkEmail,
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
    [
      state,
      isDarkMode,
      toggleTheme,
      checkEmail,
      loginWithGoogle,
      loginWithEmail,
      register,
      verifyOtpAndLogin,
      sendOtp,
      verifyOtpAndAuthenticate,
      logout,
      setUserRole,
      setOnboardingComplete,
    ]
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
