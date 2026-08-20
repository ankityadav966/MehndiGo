import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { getThumbnailUrl } from "../utils/cloudinary";
import Colors from "../constants/Colors";

const DEFAULT_PLACEHOLDER = "https://ui-avatars.com/api/?name=MehndiGo&background=F3E8FF&color=7C3AED";

/**
 * High-performance hardware-accelerated Image Component using expo-image (Glide/SDWebImage)
 * with dynamic Cloudinary thumbnailing, memory-disk cache policy, and placeholder fallback.
 */
function OptimizedImage({
  source,
  style,
  width = 300,
  height = 300,
  resizeMode = "cover",
  contentFit,
  fallbackUri = DEFAULT_PLACEHOLDER,
  priority = "normal",
  ...props
}) {
  const [useRawOriginal, setUseRawOriginal] = useState(false);
  const [hasError, setHasError] = useState(false);

  const initialUri = typeof source === "object" && source?.uri ? source.uri : typeof source === "string" ? source : null;
  let rawUri = initialUri;

  if (hasError || !rawUri) {
    rawUri = fallbackUri;
  } else if (!useRawOriginal && typeof rawUri === "string" && rawUri.includes("cloudinary.com")) {
    rawUri = getThumbnailUrl(rawUri, width, height);
  }

  // Normalize priority for expo-image: 'low' | 'normal' | 'high'
  const normalizedPriority =
    priority === "medium"
      ? "normal"
      : priority === "high" || priority === "low" || priority === "normal"
      ? priority
      : "normal";

  const imageSource =
    typeof source === "number"
      ? source
      : {
          uri: rawUri,
          priority: normalizedPriority,
        };

  const fitMode = contentFit || resizeMode || "cover";

  return (
    <View style={[styles.container, style]}>
      <ExpoImage
        {...props}
        source={imageSource}
        style={[style, styles.imageFix]}
        contentFit={fitMode}
        cachePolicy="memory-disk"
        transition={150}
        onError={() => {
          if (!useRawOriginal && initialUri && typeof initialUri === "string" && initialUri.includes("cloudinary.com")) {
            setUseRawOriginal(true);
          } else {
            setHasError(true);
          }
        }}
      />
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
  }
});

export default React.memo(OptimizedImage);
