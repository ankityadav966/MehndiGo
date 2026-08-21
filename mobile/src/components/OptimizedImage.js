import React, { useState, useMemo } from "react";
import { Image as ExpoImage } from "expo-image";
import { getThumbnailUrl } from "../utils/cloudinary";

const DEFAULT_PLACEHOLDER = "https://ui-avatars.com/api/?name=MehndiGo&background=F3E8FF&color=7C3AED";

/**
 * High-performance hardware-accelerated Image Component using expo-image (Glide/SDWebImage)
 * with dynamic Cloudinary thumbnailing, memory-disk cache policy, recyclingKey, and zero-flicker rendering.
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

  const imageSource = useMemo(() => {
    if (typeof source === "number") return source;
    return {
      uri: rawUri || fallbackUri,
      priority: normalizedPriority,
    };
  }, [source, rawUri, fallbackUri, normalizedPriority]);

  const fitMode = contentFit || resizeMode || "cover";
  const stableKey = typeof source === "number" ? String(source) : (rawUri || fallbackUri);

  return (
    <ExpoImage
      {...props}
      source={imageSource}
      style={style}
      contentFit={fitMode}
      cachePolicy="memory-disk"
      transition={0}
      recyclingKey={stableKey}
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
