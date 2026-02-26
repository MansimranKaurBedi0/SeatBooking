const Spot = require("../models/spot");
const Floater = require("../models/floater");


// ✅ Helper: Prevent multiple bookings same day
const checkUserAlreadyBooked = async (userName, bookingDate) => {

  // Check inside Spots
  const spots = await Spot.find();

  for (let spot of spots) {
    for (let seat of spot.seats) {
      if (
        seat.bookedBy === userName &&
        seat.date &&
        seat.date.toDateString() === bookingDate.toDateString()
      ) {
        return true;
      }
    }
  }

  // Check inside Floater collection
  const floaters = await Floater.find();

  for (let floater of floaters) {
    if (
      floater.bookedBy === userName &&
      floater.date &&
      floater.date.toDateString() === bookingDate.toDateString()
    ) {
      return true;
    }
  }

  return false;
};



exports.bookDesignatedSeat = async (req, res) => {
  try {
    const { batch, spotNumber, seatNumber, date } = req.body;
    const userName = req.user.name; // Use authenticated user's name

    const bookingDate = new Date(date);
    const day = bookingDate.getDay();

    if (day === 0) {
      return res.status(400).json({ message: "No booking allowed on Sunday" });
    }

    const batch1Days = [1, 2, 3];
    const batch2Days = [4, 5, 6];

    const isBatchDay =
      (batch === 1 && batch1Days.includes(day)) ||
      (batch === 2 && batch2Days.includes(day));

    if (!isBatchDay) {
      return res.status(400).json({ message: "Not your batch day" });
    }

    // ✅ Double booking check
    const alreadyBooked = await checkUserAlreadyBooked(userName, bookingDate);
    if (alreadyBooked) {
      return res.status(400).json({ message: "You already have a booking on this date" });
    }

    const spot = await Spot.findOne({ spotNumber });

    if (!spot) {
      return res.status(404).json({ message: "Spot not found" });
    }

    if (spot.batch !== batch) {
      return res.status(400).json({ message: "You cannot book this spot" });
    }

    const seat = spot.seats.find(s => s.seatNumber === seatNumber);

    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    if (seat.isBooked && seat.date?.toDateString() === bookingDate.toDateString()) {
      return res.status(400).json({ message: "Seat already booked" });
    }

    seat.isBooked = true;
    seat.bookedBy = userName;
    seat.date = bookingDate;

    await spot.save();

    res.status(200).json({ message: "Designated seat booked successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



exports.bookFloaterSeat = async (req, res) => {
  try {
    const { batch, seatNumber, date, spotNumber } = req.body;
    const userName = req.user.name; // Use authenticated user

    const bookingDate = new Date(date);
    const today = new Date();

    const bookingDay = bookingDate.getDay();

    if (bookingDay === 0) {
      return res.status(400).json({ message: "No booking allowed on Sunday" });
    }

    const batch1Days = [1, 2, 3];
    const batch2Days = [4, 5, 6];

    const isBatchDay =
      (batch === 1 && batch1Days.includes(bookingDay)) ||
      (batch === 2 && batch2Days.includes(bookingDay));

    if (isBatchDay) {
      return res.status(400).json({ message: "Use designated booking on your batch day" });
    }

    // ✅ Double booking check
    const alreadyBooked = await checkUserAlreadyBooked(userName, bookingDate);
    if (alreadyBooked) {
      return res.status(400).json({ message: "You already have a booking on this date" });
    }

    // ✅ Only 1 day before
    const diffTime = bookingDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays !== 1) {
      return res.status(400).json({ message: "Floater can be booked only one day before" });
    }

    // ✅ After 3PM
    if (today.getHours() < 15) {
      return res.status(400).json({ message: "Floater booking allowed only after 3 PM" });
    }

    // 🔹 Regular Floater
    const floater = await Floater.findOne({ seatNumber });

    if (floater) {

      if (
        floater.isBooked &&
        floater.date &&
        floater.date.toDateString() === bookingDate.toDateString()
      ) {
        return res.status(400).json({ message: "Floater already booked" });
      }

      floater.isBooked = true;
      floater.bookedBy = userName;
      floater.date = bookingDate;

      await floater.save();

      return res.status(200).json({ message: "Regular floater booked successfully" });
    }

    // 🔹 Temp Floater inside Spot
    if (spotNumber) {

      const spot = await Spot.findOne({ spotNumber });
      if (!spot) {
        return res.status(404).json({ message: "Spot not found" });
      }

      const seat = spot.seats.find(s => s.seatNumber === seatNumber);

      if (!seat || !seat.isTempFloater) {
        return res.status(400).json({ message: "Not a temporary floater seat" });
      }

      if (
        seat.isBooked &&
        seat.date &&
        seat.date.toDateString() === bookingDate.toDateString()
      ) {
        return res.status(400).json({ message: "Seat already booked" });
      }

      seat.isBooked = true;
      seat.bookedBy = userName;
      seat.date = bookingDate;
      seat.isTempFloater = false;

      await spot.save();

      return res.status(200).json({ message: "Temporary floater booked successfully" });
    }

    return res.status(400).json({ message: "Seat not found" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// ✅ RELEASE DESIGNATED SEAT
exports.releaseDesignatedSeat = async (req, res) => {
  try {
    const { spotNumber, seatNumber, date } = req.body;

    const bookingDate = new Date(date);

    const spot = await Spot.findOne({ spotNumber });

    if (!spot) {
      return res.status(404).json({ message: "Spot not found" });
    }

    const seat = spot.seats.find(s => s.seatNumber === seatNumber);

    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    if (!seat.isBooked) {
      return res.status(400).json({ message: "Seat already free" });
    }

    if (seat.bookedBy !== req.user.name) {
      return res.status(403).json({ message: "You can only release your own seat!" });
    }

    if (!seat.date || seat.date.toDateString() !== bookingDate.toDateString()) {
      return res.status(400).json({ message: "No booking found for this date" });
    }

    seat.isBooked = false;
    seat.bookedBy = null;
    seat.date = null;
    seat.isTempFloater = true; // becomes temporary floater

    await spot.save();

    res.status(200).json({ message: "Seat released and converted to temporary floater" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWeeklyAllocation = async (req, res) => {
  try {
    const { startDate } = req.query;

    if (!startDate) {
      return res.status(400).json({ message: "startDate is required" });
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // 7 day window

    // 🔹 Get Spots Data
    const spots = await Spot.find();

    const weeklySpots = [];

    for (let spot of spots) {

      const filteredSeats = spot.seats.filter(seat => {
        return (
          seat.date &&
          seat.date >= start &&
          seat.date <= end
        );
      });

      if (filteredSeats.length > 0) {
        weeklySpots.push({
          spotNumber: spot.spotNumber,
          batch: spot.batch,
          seats: filteredSeats
        });
      }
    }

    // 🔹 Get Floater Data
    const floaters = await Floater.find({
      date: { $gte: start, $lte: end }
    });

    res.status(200).json({
      weekStart: start,
      weekEnd: end,
      designatedSpots: weeklySpots,
      floaterSeats: floaters
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSeatDetails = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const selectedDate = new Date(date);

    const spots = await Spot.find();
    const floaters = await Floater.find();

    const spotResult = spots.map(spot => {
      const seatDetails = spot.seats.map(seat => {

        let status = "AVAILABLE";

        if (
          seat.isBooked &&
          seat.date &&
          seat.date.toDateString() === selectedDate.toDateString()
        ) {
          status = "BOOKED";
        } else if (seat.isTempFloater) {
          status = "TEMP_FLOATER";
        }

        return {
          seatNumber: seat.seatNumber,
          status,
          bookedBy: seat.bookedBy
        };
      });

      return {
        type: "SPOT",
        spotNumber: spot.spotNumber,
        batch: spot.batch,
        seats: seatDetails
      };
    });

    const floaterResult = floaters.map(f => {
      let status = "AVAILABLE";

      if (
        f.isBooked &&
        f.date &&
        f.date.toDateString() === selectedDate.toDateString()
      ) {
        status = "BOOKED";
      }

      return {
        type: "FLOATER",
        seatNumber: f.seatNumber,
        status,
        bookedBy: f.bookedBy
      };
    });

    res.json({
      spots: spotResult,
      floaters: floaterResult
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};