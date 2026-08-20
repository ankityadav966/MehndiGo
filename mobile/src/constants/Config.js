/**
 * MEHENDIGO CENTRAL CONFIGURATION
 * Single authoritative source for Play Store URLs, Package Identifiers, and Deep Link domains.
 */

export const Config = {
  // Official Android Play Store URL (Do not modify or duplicate)
  PLAY_STORE_URL: "https://play.google.com/store/apps/details?id=com.sonuy123.mehendigoo",

  // Official Android Package Identifier
  ANDROID_PACKAGE_ID: "com.sonuy123.mehendigoo",

  // Canonical App Scheme
  APP_SCHEME: "mehendigoo",
  SUPPORTED_SCHEMES: ["mehendigoo", "mehndigo", "exp+sonu-yadav"],

  // Primary Web & Deep Link Domain
  PRIMARY_DOMAIN: "https://mehendigoo.com",
  SUPPORTED_DOMAINS: [
    "mehendigoo.com",
    "www.mehendigoo.com",
    "mehndigo.com",
    "www.mehndigo.com",
    "mehendigo.app",
    "www.mehendigo.app",
    "mehndigo.in",
    "www.mehndigo.in"
  ]
};

export default Config;
