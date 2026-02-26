const mongoose = require("mongoose");
const Spot = require("./models/spot");
const Floater = require("./models/floater");

mongoose.connect("mongodb://127.0.0.1:27017/seatBooking")
.then(async () => {

    console.log("MongoDB Connected for Seeding");

    // Clear old data
    await Spot.deleteMany();
    await Floater.deleteMany();

    const spots = [];

    // Create 10 spots
    for (let i = 1; i <= 10; i++) {

        const seats = [];

        // Each spot has 8 seats
        for (let j = 1; j <= 8; j++) {
            seats.push({
                seatNumber: j
            });
        }

        spots.push({
            spotNumber: i,
            batch: i <= 5 ? 1 : 2, // first 5 batch1, next 5 batch2
            seats: seats
        });
    }

    await Spot.insertMany(spots);

    // Create 10 floater seats
    const floaters = [];

    for (let i = 1; i <= 10; i++) {
        floaters.push({
            seatNumber: i
        });
    }

    await Floater.insertMany(floaters);

    console.log("Spots and Floater Seats Seeded Successfully");
    process.exit();

})
.catch(err => console.log(err));