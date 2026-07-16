import { StyleSheet } from 'react-native';

const allStyleSheets = [];
const originalCreate = StyleSheet.create;

StyleSheet.create = function(styles) {
  const sheet = originalCreate(styles);
  try {
    // Clone styles safely to preserve originals
    allStyleSheets.push({ original: JSON.parse(JSON.stringify(styles)), sheet });
  } catch (err) {
    // Fallback if circular reference exists
    allStyleSheets.push({ original: { ...styles }, sheet });
  }
  return sheet;
};

function isColorMatch(value, targetColors) {
  const valLower = value.toLowerCase().trim();
  return targetColors.some(c => valLower === c || valLower === c.toLowerCase());
}

function mapColorToDark(value, prop) {
  if (typeof value !== 'string') return value;
  
  const val = value.toLowerCase().trim();
  
  if (prop === 'backgroundColor') {
    // Light backgrounds to dark
    if (isColorMatch(val, ['#fff8fa', '#ffffff', '#fff', 'white', '#fcf8f6', '#f7fafc', '#f3f4f6', '#f4eae6'])) {
      return '#120e0d';
    }
    if (isColorMatch(val, ['#fff0f4', '#ffe5ec', '#ffebef', '#fff8e1'])) {
      return '#2d1f21';
    }
    if (isColorMatch(val, ['#eeeeee', '#f0f0f0', '#ebdcd6', '#e2e8f0', '#eee'])) {
      return '#1e1a19';
    }
  }
  
  if (prop === 'color') {
    // Dark texts to light
    if (isColorMatch(val, ['#111111', '#000000', '#000', 'black', '#2d2320', '#2d1f21'])) {
      return '#ffffff';
    }
    if (isColorMatch(val, ['#333333', '#333', '#2d2320'])) {
      return '#fcf8f6';
    }
    if (isColorMatch(val, ['#666666', '#666', '#705e58'])) {
      return '#bbaea9';
    }
    if (isColorMatch(val, ['#999999', '#999', '#705e58'])) {
      return '#8e7f7a';
    }
  }
  
  if (prop === 'borderColor') {
    // Light borders to dark
    if (isColorMatch(val, ['#eeeeee', '#f0f0f0', '#ebdcd6', '#e2e8f0', '#eee', '#ffffff', '#fff', 'white'])) {
      return '#333333';
    }
  }
  
  return value;
}

export function applyTheme(isDark) {
  global.isDarkModeActive = isDark;
  for (const item of allStyleSheets) {
    const { original, sheet } = item;
    for (const styleKey in original) {
      if (!sheet[styleKey]) continue;
      const originalStyle = original[styleKey];
      const targetStyle = sheet[styleKey];
      
      for (const prop in originalStyle) {
        let value = originalStyle[prop];
        if (isDark) {
          value = mapColorToDark(value, prop);
        } else {
          // Restore original light mode values
          value = originalStyle[prop];
        }
        // Mutate in-place
        targetStyle[prop] = value;
      }
    }
  }
}
