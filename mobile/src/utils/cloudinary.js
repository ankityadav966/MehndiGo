/**
 * Cloudinary Image Optimization Utility
 * Automatically injects resizing, quality, and modern format flags into Cloudinary URLs
 * to optimize image rendering and reduce bandwidth usage.
 */

export function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("cloudinary.com")) return url;

  const { width = 400, height = 400, crop = "fill", quality = "auto", format = "auto" } = options;

  // Insert transformation parameters before /upload/
  const transformSegment = `upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/`;
  
  if (url.includes("/upload/")) {
    // Avoid double transformations
    if (url.match(/\/upload\/w_\d+/)) {
      return url;
    }
    return url.replace("/upload/", transformSegment);
  }

  return url;
}

export function getThumbnailUrl(url) {
  return getOptimizedImageUrl(url, { width: 300, height: 300, crop: "fill", quality: "auto" });
}

export function getFullResUrl(url) {
  return getOptimizedImageUrl(url, { width: 1000, height: 1000, crop: "limit", quality: "auto" });
}
