
const ROLE_HIERARCHY = {
  SUPER_ADMIN: ["SUPER_ADMIN", "ADMIN", "ARTIST", "USER"],
  ADMIN: ["ADMIN", "ARTIST", "USER"],
  ARTIST: ["ARTIST", "USER"],
  USER: ["USER"],
};

const FEATURE_FLAGS = {
  LIVE_GPS_TRACKING: true,
  VOICE_MESSAGING: true,
  COUPONS_ENGINE: true,
  LOYALTY_PROGRAM: true,
  AI_RECOMMENDATIONS: true,
};

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing authentication user context.",
      });
    }

    const userRole = req.user.role;
    // SUPER_ADMIN override or direct match check
    if (userRole === "SUPER_ADMIN") {
      return next();
    }

    const hasAccess = allowedRoles.some((role) => {
      const inherited = ROLE_HIERARCHY[userRole] || [userRole];
      return inherited.includes(role);
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${userRole}' is not authorized to access this resource.`,
      });
    }

    next();
  };
}

function checkFeatureFlag(flagName) {
  return (req, res, next) => {
    if (FEATURE_FLAGS[flagName] === false) {
      return res.status(403).json({
        success: false,
        message: `Feature '${flagName}' is currently disabled by system administrators.`,
      });
    }
    next();
  };
}

module.exports = {
  authorize,
  checkFeatureFlag,
  ROLE_HIERARCHY,
  FEATURE_FLAGS,
};

