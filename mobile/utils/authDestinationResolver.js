export const DESTINATIONS = {
  AUTH: "AUTH",
  CUSTOMER_HOME: "CUSTOMER_HOME",
  ARTIST_ONBOARDING: "ARTIST_ONBOARDING",
  ARTIST_DASHBOARD: "ARTIST_DASHBOARD",
};

export function resolveAuthDestination({ isAuthenticated, user, artistProfileCompleted }) {
  if (!isAuthenticated || !user) {
    return DESTINATIONS.AUTH;
  }

  const role = user?.role || "USER";

  if (role === "USER") {
    return DESTINATIONS.CUSTOMER_HOME;
  }

  if (role === "ARTIST") {
    if (artistProfileCompleted === true) {
      return DESTINATIONS.ARTIST_DASHBOARD;
    } else {
      return DESTINATIONS.ARTIST_ONBOARDING;
    }
  }

  return DESTINATIONS.CUSTOMER_HOME;
}
