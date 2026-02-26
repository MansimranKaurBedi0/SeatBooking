const mongoose = require("mongoose");

const floaterSchema = new mongoose.Schema({
  seatNumber: Number,
  isBooked: { type: Boolean, default: false },
  bookedBy: { type: String, default: null },
  date: { type: Date, default: null }
});

module.exports = mongoose.model("Floater", floaterSchema);