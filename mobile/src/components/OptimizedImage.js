import React, { useState, useMemo } from "react";
import { Image as ExpoImage } from "expo-image";
import { getThumbnailUrl } from "../utils/cloudinary";

const DEFAULT_PLACEHOLDER = "https://ui-avatars.com/api/?name=MehndiGo&background=F3E8FF&color=7C3AED";

// Global in-memory cache for frozen source objects to eliminate recreation across renders
const sourceCache = new Map();

function getCachedSource(uri, priority) {
  const cacheKey = `${uri}_${priority}`;
  if (sourceCache.has(cacheKey)) {
    return sourceCache.get(cacheKey);
  }
  const obj = Object.freeze({ uri, priority });
  sourceCache.set(cacheKey, obj);
  return obj;
}

/**
 * Zero-Flicker Hardware-Accelerated Image Component using expo-image
 * Guarantees stable object references and memory-disk caching so parent re-renders never blink images.
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
  recyclingKey,
  ...props
}) {
  const [useRawOriginal, setUseRawOriginal] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isLocalNumber = typeof source === "number";
  const initialUri = !isLocalNumber && typeof source === "object" && source?.uri ? source.uri : typeof source === "string" ? source : null;

  let rawUri = initialUri;
  if (hasError || !rawUri) {
    rawUri = fallbackUri;
  } else if (!useRawOriginal && typeof rawUri === "string" && rawUri.includes("cloudinary.com")) {
    rawUri = getThumbnailUrl(rawUri, width, height);
  }

  // Normalize priority for expo-image: 'low' | 'normal' | 'high'
  const normalizedPriority = useMemo(() => {
    if (priority === "medium") return "normal";
    if (priority === "high" || priority === "low" || priority === "normal") return priority;
    return "normal";
  }, [priority]);

  // Use string-based memoization so new parent inline objects { uri: ... } don't re-trigger image loads
  const imageSource = useMemo(() => {
    if (isLocalNumber) return source;
    const finalUri = rawUri || fallbackUri;
    return getCachedSource(finalUri, normalizedPriority);
  }, [isLocalNumber, isLocalNumber ? source : null, rawUri, fallbackUri, normalizedPriority]);

  const fitMode = contentFit || resizeMode || "cover";

  return (
    <ExpoImage
      {...props}
      source={imageSource}
      style={style}
      contentFit={fitMode}
      cachePolicy="memory-disk"
      transition={0}
      recyclingKey={recyclingKey}
      onError={() => {
        if (!useRawOriginal && initialUri && typeof initialUri === "string" && initialUri.includes("cloudinary.com")) {
          setUseRawOriginal(true);
        } else {
          setHasError(true);
        }
      }}
    />
  );
}

export default React.memo(OptimizedImage);
