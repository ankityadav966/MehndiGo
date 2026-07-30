import React, { useState } from "react";
import { Image, View, StyleSheet, ActivityIndicator } from "react-native";
import { getThumbnailUrl } from "../utils/cloudinary";
import Colors from "../constants/Colors";

const DEFAULT_PLACEHOLDER = "https://mehandigo-api.globalrns.com/logo.png";

/**
 * 60 FPS Fast Image Component with dynamic Cloudinary thumbnailing,
 * loading indicator, and placeholder error fallback.
 */
function OptimizedImage({
  source,
  style,
  width = 300,
  height = 300,
  resizeMode = "cover",
  fallbackUri = DEFAULT_PLACEHOLDER,
  ...props
}) {
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  let rawUri = typeof source === "object" && source?.uri ? source.uri : typeof source === "string" ? source : null;

  if (hasError || !rawUri) {
    rawUri = fallbackUri;
  } else if (typeof rawUri === "string" && rawUri.includes("cloudinary.com")) {
    rawUri = getThumbnailUrl(rawUri, width, height);
  }

  const imageSource = typeof source === "number" ? source : { uri: rawUri };

  return (
    <View style={[styles.container, style]}>
      <Image
        {...props}
        source={imageSource}
        style={[style, styles.imageFix]}
        resizeMode={resizeMode}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  imageFix: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    backgroundColor: "rgba(243, 244, 246, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default React.memo(OptimizedImage);
