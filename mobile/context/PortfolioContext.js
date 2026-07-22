import { createContext, useContext, useMemo, useReducer, useCallback } from "react";
import {
  createPortfolio as createPortfolioApi,
  getAllPortfolios,
  updatePortfolio as updatePortfolioApi,
  deletePortfolio as deletePortfolioApi,
} from "../services/portfolio";

const PortfolioContext = createContext(null);

const initialState = {
  portfolios: [],
  loading: false,
  refreshing: false,
  error: null,
};

function portfolioReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: null };
    case "SET_REFRESHING":
      return { ...state, refreshing: action.payload };
    case "SET_PORTFOLIOS":
      return { ...state, portfolios: action.payload, loading: false, refreshing: false, error: null };
    case "ADD_PORTFOLIO":
      return { ...state, portfolios: [action.payload, ...state.portfolios] };
    case "UPDATE_PORTFOLIO":
      return {
        ...state,
        portfolios: state.portfolios.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      };
    case "DELETE_PORTFOLIO":
      return {
        ...state,
        portfolios: state.portfolios.filter((p) => p.id !== action.payload),
      };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false, refreshing: false };
    default:
      return state;
  }
}

export function PortfolioProvider({ children }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);

  const fetchPortfolios = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await getAllPortfolios();
      const list = Array.isArray(data) ? data : data?.services || data?.portfolios || [];
      dispatch({ type: "SET_PORTFOLIOS", payload: list });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message || "Failed to fetch portfolios" });
    }
  }, []);

  const refreshPortfolios = useCallback(async () => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    try {
      const data = await getAllPortfolios();
      const list = Array.isArray(data) ? data : data?.services || data?.portfolios || [];
      dispatch({ type: "SET_PORTFOLIOS", payload: list });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message || "Failed to refresh" });
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, []);

  const addPortfolio = useCallback(async (formData) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const result = await createPortfolioApi(formData);
      dispatch({ type: "ADD_PORTFOLIO", payload: result });
      return result;
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message || "Failed to add portfolio" });
      throw err;
    }
  }, []);

  const editPortfolio = useCallback(async (id, formData) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const result = await updatePortfolioApi(id, formData);
      dispatch({ type: "UPDATE_PORTFOLIO", payload: { id, ...result } });
      return result;
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message || "Failed to update portfolio" });
      throw err;
    }
  }, []);

  const removePortfolio = useCallback(async (id) => {
    try {
      await deletePortfolioApi(id);
      dispatch({ type: "DELETE_PORTFOLIO", payload: id });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message || "Failed to delete portfolio" });
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      fetchPortfolios,
      refreshPortfolios,
      addPortfolio,
      editPortfolio,
      removePortfolio,
    }),
    [state, fetchPortfolios, refreshPortfolios, addPortfolio, editPortfolio, removePortfolio]
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
}
