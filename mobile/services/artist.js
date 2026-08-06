import { apiRequest } from "./api";

export async function createPortfolioItem(itemData, onProgress) {
  const getSafeUri = (uri) => {
    if (!uri) return uri;
    let cleanUri = uri;
    if (cleanUri.startsWith("/")) {
      cleanUri = `file://${cleanUri}`;
    }
    return cleanUri;
  };

  const isLocal = (url) => url && (url.startsWith("file://") || url.startsWith("content://") || url.startsWith("/"));

  let imageUrl = itemData.image_url;
  let videoUrl = itemData.video_url;

  try {
    // 1. Upload Video if it is local
    if (videoUrl && isLocal(videoUrl)) {
      const videoUri = getSafeUri(videoUrl);
      if (onProgress) onProgress(0.01);
      videoUrl = await uploadMediaWithFallback(
        videoUri,
        "video/mp4",
        true,
        (progress) => {
          if (onProgress) onProgress(0.01 + progress * 0.79);
        }
      );
      console.log("[VIDEO UPLOAD RESPONSE]", { videoUrl });
    }

    // 2. Upload Image if it is local and distinct from video
    if (imageUrl && isLocal(imageUrl)) {
      const isVideoFile = (itemData.video_url && imageUrl === itemData.video_url) || /\.(mp4|mov|3gp|mkv)$/i.test(imageUrl);
      if (isVideoFile) {
        imageUrl = videoUrl;
      } else {
        const imageUri = getSafeUri(imageUrl);
        imageUrl = await uploadMediaWithFallback(
          imageUri,
          "image/jpeg",
          false,
          (progress) => {
            if (!videoUrl && onProgress) {
              onProgress(0.01 + progress * 0.79);
            }
          }
        );
      }
    }

    if (!imageUrl && videoUrl) {
      imageUrl = videoUrl;
    }

    if (onProgress) onProgress(0.9);

    const finalItemData = {
      ...itemData,
      image_url: imageUrl,
      video_url: videoUrl
    };

    console.log("[PORTFOLIO SAVE PAYLOAD]", {
      image_url: finalItemData.image_url,
      video_url: finalItemData.video_url,
      title: finalItemData.title
    });

    if (onProgress) onProgress(0.95);
    const data = await apiRequest("POST", "/api/v1/mehndigo/artist/portfolio", finalItemData, true);
    console.log("[VIDEO SAVED URL]", {
      id: data?.data?.id || data?.id,
      image_url: data?.data?.image_url || data?.image_url,
      video_url: data?.data?.video_url || data?.video_url
    });
    if (onProgress) onProgress(1.0);
    return data?.data || data;
  } catch (err) {
    console.error("[createPortfolioItem] Error:", err);
    throw err;
  }
}
