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

  // Primary Web & Deep Link Domain (Canonical)
  PRIMARY_DOMAIN: "https://mehndigo.in",
  SUPPORTED_DOMAINS: [
    "mehndigo.in",
    "api.mehndigo.in"
  ],

  // Feature Flag: Set to true when Admin approval is required for artists before dashboard access
  ARTIST_APPROVAL_REQUIRED: false,
};

export const ARTIST_APPROVAL_REQUIRED = Config.ARTIST_APPROVAL_REQUIRED;

export default Config;
