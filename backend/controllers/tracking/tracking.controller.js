const db = require("../../models");
const { client: redisClient } = require("../../config/redis");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");
const socketModule = require("../../sockets/socket");

/**
 * Update the latest location of an artist for an active booking.
 * POST /artist/location/update
 */
async function updateLocation(req, res) {
  try {
    const { bookingId, latitude, longitude, heading, speed } = req.body;

    if (!bookingId || latitude === undefined || longitude === undefined) {
      return res.status(400).json(ErrorResponse("Missing required parameters: bookingId, latitude, or longitude"));
    }

    // 1. Role validation
    if (req.user.role !== "ARTIST") {
      return res.status(403).json(ErrorResponse("Only artists can update tracking location"));
    }

    // 2. Fetch artist profile
    const artistProfile = await db.ArtistProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!artistProfile) {
      return res.status(403).json(ErrorResponse("Artist profile not found for authenticated user"));
    }

    // 3. Fetch booking
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json(ErrorResponse("Booking not found with the provided ID"));
    }

    // 4. Verify booking belongs to this artist
    if (booking.artist_id !== artistProfile.id) {
      return res.status(403).json(ErrorResponse("You are not authorized to update location for this booking"));
    }

    // 5. Verify booking is active (not COMPLETED or CANCELLED)
    const currentDetailedStatus = booking.detailed_status || booking.booking_status || "PENDING";
    if (currentDetailedStatus === "COMPLETED" || currentDetailedStatus === "CANCELLED") {
      return res.status(400).json(ErrorResponse(`Tracking is not allowed. Booking is already ${currentDetailedStatus.toLowerCase()}`));
    }

    // 6. Save latest location to Redis
    const updateTime = new Date();
    const redisKey = `artist:location:${bookingId}`;
    const locationData = {
      bookingId: bookingId.toString(),
      artistId: artistProfile.id.toString(),
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      heading: (heading !== undefined ? heading : 0).toString(),
      speed: (speed !== undefined ? speed : 0).toString(),
      updatedAt: updateTime.toISOString()
    };

    try {
      await redisClient.hSet(redisKey, locationData);
      await redisClient.expire(redisKey, 7200); // Expire after 2 hours
    } catch (redisErr) {
      console.warn("[TrackingController] Redis update failed (Redis might be down):", redisErr.message);
    }

    // 7. Emit Socket.IO event to the Customer owning the booking
    try {
      const io = socketModule.getIO();
      const socketPayload = {
        bookingId: Number(bookingId),
        artistId: artistProfile.id,
        latitude: Number(latitude),
        longitude: Number(longitude),
        heading: heading !== undefined ? Number(heading) : 0,
        speed: speed !== undefined ? Number(speed) : 0,
        updatedAt: updateTime.toISOString()
      };

      // Emit directly to customer's personal room and booking room with both event names
      io.to(booking.user_id.toString()).emit("artistLocationUpdated", socketPayload);
      io.to(booking.user_id.toString()).emit("artist_location_update", socketPayload);
      io.to(`booking_room_${bookingId}`).emit("artistLocationUpdated", socketPayload);
      io.to(`booking_room_${bookingId}`).emit("artist_location_update", socketPayload);
      console.log(`[TrackingController] Emitted tracking events to customer room: ${booking.user_id} and booking_room_${bookingId}`);
    } catch (socketErr) {
      console.error("[TrackingController] Failed to emit Socket.IO event:", socketErr.message);
    }

    const responseData = {
      bookingId: Number(bookingId),
      artistId: artistProfile.id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading: heading !== undefined ? Number(heading) : 0,
      speed: speed !== undefined ? Number(speed) : 0,
      updatedAt: updateTime
    };

    return res.status(200).json(SuccessResponse("Artist location updated successfully", responseData));
  } catch (error) {
    console.error("[TrackingController] updateLocation error:", error);
    return res.status(500).json(ErrorResponse("Internal server error", error));
  }
}

/**
 * Retrieve the latest location of an artist for a booking.
 * GET /booking/:bookingId/location
 */
async function getArtistLocation(req, res) {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json(ErrorResponse("Missing required parameter: bookingId"));
    }

    // 1. Fetch booking
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json(ErrorResponse("Booking not found with the provided ID"));
    }

    // 2. Validate booking authorization (customer who owns booking, assigned artist, or admin)
    let isAuthorized = false;
    if (booking.user_id === req.user.id) {
      isAuthorized = true;
    } else if (req.user.role === "ADMIN") {
      isAuthorized = true;
    } else if (req.user.role === "ARTIST") {
      const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: req.user.id } });
      if (artistProfile && (booking.artist_id === artistProfile.id || booking.artist_id === req.user.id)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json(ErrorResponse("Unauthorized. Only the booking customer, assigned artist, or admin can view live tracking"));
    }

    // 3. Fetch latest location from Redis
    const redisKey = `artist:location:${bookingId}`;
    let location = null;
    try {
      location = await redisClient.hGetAll(redisKey);
    } catch (redisErr) {
      console.warn("[TrackingController] Redis retrieval failed (Redis might be down):", redisErr.message);
    }

    let isLive = false;
    let artLat = null;
    let artLng = null;
    let heading = 0;
    let speed = 0;
    let updateTime = new Date().toISOString();

    if (location && location.latitude && location.longitude) {
      isLive = true;
      artLat = Number(location.latitude);
      artLng = Number(location.longitude);
      heading = Number(location.heading || 0);
      speed = Number(location.speed || 0);
      updateTime = location.updatedAt || updateTime;
    } else {
      // Fallback to ArtistProfile registered location coordinates
      const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
      if (artistProfile && artistProfile.latitude && artistProfile.longitude) {
        artLat = Number(artistProfile.latitude);
        artLng = Number(artistProfile.longitude);
      }
    }

    // Fetch Artist user profile info
    const artistProfileRecord = await db.ArtistProfile.findByPk(booking.artist_id, {
      include: [{ model: db.User, as: "user", attributes: ["id", "name", "phone", "profile_image"] }]
    });

    const custLat = booking.latitude ? Number(booking.latitude) : null;
    const custLng = booking.longitude ? Number(booking.longitude) : null;

    let distanceKm = null;
    let etaMins = null;

    if (custLat && custLng && artLat && artLng) {
      const R = 6371; // Earth radius in km
      const dLat = (artLat - custLat) * (Math.PI / 180);
      const dLon = (artLng - custLng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(custLat * (Math.PI / 180)) * Math.cos(artLat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = Number((R * c).toFixed(1));
      etaMins = Math.max(1, Math.ceil((distanceKm / 20) * 60)); // ~20 km/h average city transit speed
    }

    const detailedSt = String(booking.detailed_status || booking.booking_status || booking.status || "").toUpperCase();
    const isTrackingActive = Boolean(artLat && artLng && ["ARTIST_ON_THE_WAY", "ON_THE_WAY", "CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ARRIVED", "ARRIVED"].includes(detailedSt));

    const formattedLocation = {
      bookingId: Number(booking.id),
      artistId: Number(booking.artist_id),
      artistName: artistProfileRecord?.user?.name || "Mehndi Specialist",
      artistPhone: artistProfileRecord?.user?.phone || "",
      artistImage: artistProfileRecord?.user?.profile_image || "",
      latitude: artLat,
      longitude: artLng,
      customerLatitude: custLat,
      customerLongitude: custLng,
      customerAddress: booking.address || "",
      customerLandmark: booking.landmark || "",
      isLive: isLive,
      isTrackingActive: isTrackingActive,
      trackingStatus: isTrackingActive
        ? (detailedSt.includes("ARRIVED") ? "Artist has arrived at your location" : "Artist is on the way")
        : (artLat ? "Artist location shared" : "Waiting for artist live location"),
      distanceKm: distanceKm,
      distanceText: distanceKm !== null ? `${distanceKm} km away` : "Waiting for location",
      etaMins: etaMins,
      etaText: etaMins !== null ? `Arriving in ~${etaMins} mins` : "Calculating ETA...",
      heading: heading,
      speed: speed,
      updatedAt: updateTime
    };

    return res.status(200).json(SuccessResponse("Fetched artist tracking location successfully", formattedLocation));
  } catch (error) {
    console.error("[TrackingController] getArtistLocation error:", error);
    return res.status(500).json(ErrorResponse("Internal server error", error));
  }
}

/**
 * Fetch road driving route between origin and destination.
 * GET /booking/route?originLat=...&originLng=...&destLat=...&destLng=...
 */
async function getDirectionsRoute(req, res) {
  try {
    const originLat = Number(req.query.originLat || req.query.origin_lat || req.query.startLat);
    const originLng = Number(req.query.originLng || req.query.origin_lng || req.query.startLng);
    const destLat = Number(req.query.destLat || req.query.dest_lat || req.query.endLat);
    const destLng = Number(req.query.destLng || req.query.dest_lng || req.query.endLng);

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return res.status(400).json(ErrorResponse("Valid originLat, originLng, destLat, destLng query parameters are required"));
    }

    // Try OSRM routing endpoints
    const mirrors = [
      `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`,
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`
    ];

    let routeData = null;

    for (const url of mirrors) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          const json = await response.json();
          if (json && json.routes && json.routes.length > 0) {
            const r = json.routes[0];
            const coordinates = r.geometry.coordinates.map((c) => [c[1], c[0]]); // [lat, lng]
            const distanceKm = Number((r.distance / 1000).toFixed(2));
            const durationMins = Math.max(1, Math.round(r.duration / 60));

            routeData = {
              coordinates,
              distanceKm,
              durationMins,
              distanceText: `${distanceKm} km`,
              durationText: `${durationMins} mins`,
              provider: "OSRM"
            };
            break;
          }
        }
      } catch (mirrorErr) {
        console.warn(`[TrackingController] Routing mirror error (${url}):`, mirrorErr.message);
      }
    }

    if (!routeData) {
      // Fallback: Generate interpolated waypoints along the direct path
      const R = 6371;
      const dLat = (destLat - originLat) * (Math.PI / 180);
      const dLon = (destLng - originLng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(originLat * (Math.PI / 180)) * Math.cos(destLat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const directDist = R * c;
      const roadDist = Number((directDist * 1.25).toFixed(2)); // ~1.25 urban road detour factor
      const durationMins = Math.max(1, Math.ceil((roadDist / 20) * 60));

      const steps = 20;
      const coordinates = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = originLat + (destLat - originLat) * t;
        const lng = originLng + (destLng - originLng) * t;
        coordinates.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
      }

      routeData = {
        coordinates,
        distanceKm: roadDist,
        durationMins,
        distanceText: `${roadDist} km`,
        durationText: `${durationMins} mins`,
        provider: "INTERPOLATED"
      };
    }

    return res.status(200).json(SuccessResponse("Directions route calculated successfully", routeData));
  } catch (error) {
    console.error("[TrackingController] getDirectionsRoute error:", error);
    return res.status(500).json(ErrorResponse("Failed to calculate route", error));
  }
}

module.exports = {
  updateLocation,
  getArtistLocation,
  getDirectionsRoute
};
