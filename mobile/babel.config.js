module.exports = function (api) {
  api.cache(true);

  const isProd = process.env.NODE_ENV === "production" || process.env.BABEL_ENV === "production";

  const plugins = ["react-native-worklets/plugin"];
  if (isProd) {
    try {
      require.resolve("babel-plugin-transform-remove-console");
      plugins.push(["transform-remove-console", { exclude: ["error", "warn"] }]);
    } catch {
      // plugin not found, skip
    }
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
