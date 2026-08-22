import { BASE_URL } from "../services/api";

export const resolveImage = (uri) => {
  if (!uri || typeof uri !== "string") return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;

  // Absolute HTTP / HTTPS / Base64 Data URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // Relative backend upload path
  if (trimmed.startsWith("/") || trimmed.startsWith("uploads/")) {
    const cleanBase = (BASE_URL || "").replace(/\/api\/v1\/?$/, "");
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${cleanBase}${cleanPath}`;
  }

  // Local filesystem URI (for preview)
  if (trimmed.startsWith("file://") || trimmed.startsWith("content://") || trimmed.startsWith("ph://")) {
    return trimmed;
  }

  return trimmed;
};

export default { resolveImage };
