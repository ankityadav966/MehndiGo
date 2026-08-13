import React, { useState } from "react";
import { Image, View, StyleSheet, ActivityIndicator } from "react-native";
import { getThumbnailUrl } from "../utils/cloudinary";
import Colors from "../constants/Colors";

const DEFAULT_PLACEHOLDER = "https://ui-avatars.com/api/?name=MehndiGo&background=F3E8FF&color=7C3AED";

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
  const [useRawOriginal, setUseRawOriginal] = useState(false);
  const [hasError, setHasError] = useState(false);

  const initialUri = typeof source === "object" && source?.uri ? source.uri : typeof source === "string" ? source : null;
  let rawUri = initialUri;

  if (hasError || !rawUri) {
    rawUri = fallbackUri;
  } else if (!useRawOriginal && typeof rawUri === "string" && rawUri.includes("cloudinary.com")) {
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
        onLoadStart={() => {
          if (!hasError) setLoading(true);
        }}
        onLoad={() => setLoading(false)}
        onLoadEnd={() => setLoading(false)}
        onError={(err) => {
          console.warn("[OptimizedImage] Image load error for:", rawUri, err?.nativeEvent?.error);
          setLoading(false);
          if (!useRawOriginal && initialUri && typeof initialUri === "string" && initialUri.includes("cloudinary.com")) {
            setUseRawOriginal(true);
          } else {
            setHasError(true);
          }
        }}
      />
      {loading && !hasError && (
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
