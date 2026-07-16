const baseColors = {
  primary: "#E91E63",
  primaryLight: "#F8BBD0",
  secondary: "#F8BBD0",
  background: "#FFF8FA",
  surface: "#FFFFFF",
  cardBackground: "#FFFFFF",
  text: "#1D1D1D",
  textSecondary: "#7A7A7A",
  textTertiary: "#9E9E9E",
  border: "#E2E6ED",
  placeholder: "#9E9E9E",
  inputBackground: "#F2F4F7",
  white: "#FFFFFF",
  black: "#000000",
  shadow: "#000000",
  success: "#16A34A",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  overlay: "rgba(0, 0, 0, 0.5)",
};

const Colors = new Proxy(baseColors, {
  get(target, prop) {
    if (global.isDarkModeActive) {
      if (prop === 'background' || prop === 'surface' || prop === 'cardBackground' || prop === 'white' || prop === 'inputBackground') {
        return '#120e0d';
      }
      if (prop === 'text' || prop === 'black') {
        return '#ffffff';
      }
      if (prop === 'textSecondary') {
        return '#bbaea9';
      }
      if (prop === 'border') {
        return '#333333';
      }
    }
    return target[prop];
  }
});

export default Colors;
