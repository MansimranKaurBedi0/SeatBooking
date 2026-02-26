const express = require("express");
const router = express.Router();
const { bookDesignatedSeat } = require("../controllers/bookingController");
const { bookFloaterSeat } = require("../controllers/bookingController");
const { releaseDesignatedSeat } = require("../controllers/bookingController");
const { getWeeklyAllocation } = require("../controllers/bookingController");
const { getSeatDetails } = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

router.get("/seat-details", getSeatDetails);
router.get("/weekly-allocation", getWeeklyAllocation);
router.post("/release-designated", protect, releaseDesignatedSeat);
router.post("/book-floater", protect, bookFloaterSeat);
router.post("/book-designated", protect, bookDesignatedSeat);

module.exports = router;