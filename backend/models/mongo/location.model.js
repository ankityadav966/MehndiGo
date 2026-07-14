const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  bookingId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  artistId: {
    type: Number,
    required: true,
    index: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  heading: {
    type: Number,
    default: 0
  },
  speed: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Automatically update the updatedAt field on updates
locationSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Location", locationSchema);
