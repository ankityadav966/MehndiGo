156+const db = require("../../models");
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
      
      // Emit directly to customer's personal room
      io.to(booking.user_id.toString()).emit("artistLocationUpdated", socketPayload);
      console.log(`[TrackingController] Emitted artistLocationUpdated socket event to customer room: ${booking.user_id}`);
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

    // 2. Validate booking owner (only customer who owns the booking can view tracking)
    if (booking.user_id !== req.user.id) {
      return res.status(403).json(ErrorResponse("Unauthorized. Only the booking customer can view live tracking"));
    }

    // 3. Fetch latest location from Redis
    const redisKey = `artist:location:${bookingId}`;
    let location = null;
    try {
      location = await redisClient.hGetAll(redisKey);
    } catch (redisErr) {
      console.warn("[TrackingController] Redis retrieval failed (Redis might be down):", redisErr.message);
    }

    if (!location || Object.keys(location).length === 0) {
      return res.status(404).json(ErrorResponse("Live tracking location not available yet for this booking"));
    }

    const formattedLocation = {
      bookingId: Number(location.bookingId),
      artistId: Number(location.artistId),
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      heading: Number(location.heading),
      speed: Number(location.speed),
      updatedAt: location.updatedAt
    };

    return res.status(200).json(SuccessResponse("Fetched artist tracking location successfully", formattedLocation));
  } catch (error) {
    console.error("[TrackingController] getArtistLocation error:", error);
    return res.status(500).json(ErrorResponse("Internal server error", error));
  }
}

module.exports = {
  updateLocation,
  getArtistLocation
};
