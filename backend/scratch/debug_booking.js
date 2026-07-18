const BookingService = require("../services/booking.services");

console.log("-----------------------------------------");
console.log("Checking BookingService instance:");
console.log("Type of BookingService:", typeof BookingService);
console.log("Methods on BookingService:");
console.log("- createBooking:", typeof BookingService.createBooking);
console.log("- hasRestrictedBooking:", typeof BookingService.hasRestrictedBooking);
console.log("- prototype.hasRestrictedBooking:", typeof BookingService.constructor.prototype.hasRestrictedBooking);
console.log("-----------------------------------------");
