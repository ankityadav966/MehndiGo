const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Limit maxWorkers to prevent Node.js v20 DataCloneError out of memory crashes
config.maxWorkers = 2;

module.exports = config;
