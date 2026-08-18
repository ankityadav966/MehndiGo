import { BASE_URL } from "../services/api";

export const resolveImage = (uri) => {
  if (!uri) return null;
  if (typeof uri !== "string") return null;
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:")) {
    return uri;
  }
  if (uri.startsWith("/")) {
    const cleanBase = (BASE_URL || "").replace(/\/api\/v1\/?$/, "");
    return `${cleanBase}${uri}`;
  }
  return uri;
};

export default { resolveImage };
