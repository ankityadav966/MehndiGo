import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { getThumbnailUrl } from "../utils/cloudinary";

const DEFAULT_PLACEHOLDER = "https://ui-avatars.com/api/?name=MehndiGo&background=F3E8FF&color=7C3AED";

/**
 * High-performance hardware-accelerated Image Component using expo-image
 * with dynamic Cloudinary thumbnailing, memory-disk cache policy, stable props, and placeholder fallback.
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
  placeholder,
  ...props
}) {
  const [useRawOriginal, setUseRawOriginal] = useState(false);
  const [hasError, setHasError] = useState(false);

  const initialUri = typeof source === "object" && source?.uri
    ? source.uri
    : typeof source === "string"
    ? source
    : null;

  // Reset error state whenever the underlying URI changes
  useEffect(() => {
    setHasError(false);
    setUseRawOriginal(false);
  }, [initialUri]);

  // Normalize priority for expo-image: 'low' | 'normal' | 'high'
  const normalizedPriority = useMemo(() => {
    if (priority === "medium") return "normal";
    if (priority === "high" || priority === "low" || priority === "normal") return priority;
    return "normal";
  }, [priority]);

  // Determine computed URI
  const computedUri = useMemo(() => {
    if (hasError || !initialUri) {
      return fallbackUri;
    }
    if (!useRawOriginal && typeof initialUri === "string" && initialUri.includes("cloudinary.com")) {
      return getThumbnailUrl(initialUri, width, height);
    }
    return initialUri;
  }, [hasError, initialUri, fallbackUri, useRawOriginal, width, height]);

  // Memoize stable source object reference to prevent expo-image re-render flicker
  const imageSource = useMemo(() => {
    if (typeof source === "number") {
      return source;
    }
    return {
      uri: computedUri,
      priority: normalizedPriority,
    };
  }, [source, computedUri, normalizedPriority]);

  const fitMode = contentFit || resizeMode || "cover";

  return (
    <View style={[styles.container, style]}>
      <ExpoImage
        {...props}
        source={imageSource}
        style={styles.imageFix}
        contentFit={fitMode}
        cachePolicy="memory-disk"
        placeholder={placeholder || undefined}
        transition={0}
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
