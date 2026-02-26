const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  seatNumber: Number,
  isBooked: { type: Boolean, default: false },
  bookedBy: { type: String, default: null },
  date: { type: Date, default: null },
  isTempFloater: { type: Boolean, default: false } // NEW FIELD
});

const spotSchema = new mongoose.Schema({
  spotNumber: {
    type: Number,
    required: true
  },
  batch: {
    type: Number, // 1 or 2
    required: true
  },
  seats: [seatSchema]
});

module.exports = mongoose.model("Spot", spotSchema);