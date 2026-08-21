// MehndiGo Unified Utilities
export * from "./date";
export { default as DateUtils } from "./date";
export * from "./constants";
export * from "./storage";

export const formatCurrency = (value) => {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
};
