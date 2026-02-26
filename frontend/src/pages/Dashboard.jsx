import { useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const API = "http://localhost:4000/api";

function Dashboard() {
    const { user, logout } = useContext(AuthContext);
    const [batch, setBatch] = useState(1);
    const [date, setDate] = useState("");
    const [spots, setSpots] = useState([]);
    const [floaters, setFloaters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Helper to add Auth token to requests requiring protection
    const getAuthHeaders = () => {
        return {
            headers: {
                Authorization: `Bearer ${user.token}`,
            },
        };
    };

    const fetchSeats = async () => {
        if (!date) return alert("Please select a date first.");

        try {
            setLoading(true);
            const res = await axios.get(`${API}/seat-details?date=${date}`);
            setSpots(res.data.spots);
            setFloaters(res.data.floaters);
            setHasLoaded(true);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to fetch seats");
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (spotNumber, seatNumber, type) => {
        try {
            if (type === "SPOT") {
                await axios.post(`${API}/book-designated`, {
                    batch: Number(batch),
                    spotNumber,
                    seatNumber,
                    date,
                }, getAuthHeaders());
            } else {
                await axios.post(`${API}/book-floater`, {
                    batch: Number(batch),
                    seatNumber,
                    date,
                }, getAuthHeaders());
            }
            fetchSeats(); // Refresh data
        } catch (err) {
            alert(err.response?.data?.message || "Booking failed");
        }
    };

    const handleRelease = async (spotNumber, seatNumber, bookedBy) => {
        if (bookedBy !== user.name) {
            return alert(`This seat is booked by ${bookedBy}. You can only release your own seats.`);
        }

        try {
            await axios.post(`${API}/release-designated`, {
                spotNumber,
                seatNumber,
                date,
            }, getAuthHeaders());

            fetchSeats();
        } catch (err) {
            alert(err.response?.data?.message || "Release failed");
        }
    };

    const filteredSpots = spots.filter((spot) => spot.batch === Number(batch));

    // Determine seat class based on status and ownership
    const getSeatClass = (status, bookedBy, isFloater = false) => {
        if (status === "BOOKED") {
            // Differentiate own booked seats vs others
            if (bookedBy === user.name) return "seat booked own";
            return "seat booked other";
        }
        if (status === "TEMP_FLOATER") return "seat temp-floater";
        if (isFloater) return "seat floater-available";
        return "seat available";
    };

    return (
        <div className="app-wrapper">
            <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                    <h1 className="app-title" style={{ fontSize: '2rem' }}>SeatBook Hub</h1>
                    <p className="app-subtitle" style={{ fontSize: '1rem' }}>Welcome, {user.name}!</p>
                </div>
                <button onClick={logout} style={{ backgroundColor: 'var(--bg-accent)', color: 'white', padding: '0.5rem 1rem' }}>
                    Log Out
                </button>
            </header>

            <section className="glass-panel controls-container">
                <div className="control-group">
                    <label className="control-label">Batch</label>
                    <select value={batch} onChange={(e) => setBatch(e.target.value)}>
                        <option value={1}>Batch 1</option>
                        <option value={2}>Batch 2</option>
                    </select>
                </div>

                <div className="control-group">
                    <label className="control-label">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                <div className="control-group" style={{ justifyContent: "flex-end" }}>
                    <button
                        className="primary-btn"
                        onClick={fetchSeats}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Load Seats"}
                    </button>
                </div>
            </section>

            {!hasLoaded ? (
                <div className="empty-state">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <p>Select a date and click 'Load Seats' to view availability for your selected batch.</p>
                </div>
            ) : (
                <div className="dashboard-grid">
                    {/* Designated Spots Section */}
                    <section>
                        <div className="section-header">
                            <h3>Designated Spots</h3>
                        </div>

                        {filteredSpots.length === 0 ? (
                            <p style={{ color: "var(--text-muted)" }}>No spots found for this batch.</p>
                        ) : (
                            <div className="spots-grid">
                                {filteredSpots.map((spot) => (
                                    <div key={spot.spotNumber} className="spot-card">
                                        <div className="spot-header">
                                            <h4>Spot {spot.spotNumber}</h4>
                                        </div>
                                        <div className="seats-container">
                                            {spot.seats.map((seat) => (
                                                <div
                                                    key={seat.seatNumber}
                                                    className={getSeatClass(seat.status, seat.bookedBy)}
                                                    onClick={() =>
                                                        seat.status === "BOOKED"
                                                            ? handleRelease(spot.spotNumber, seat.seatNumber, seat.bookedBy)
                                                            : handleBook(spot.spotNumber, seat.seatNumber, "SPOT")
                                                    }
                                                    title={seat.status === "BOOKED" ? `Booked by ${seat.bookedBy}` : `Seat ${seat.seatNumber} - Available`}
                                                    style={{
                                                        opacity: seat.status === "BOOKED" && seat.bookedBy !== user.name ? 0.6 : 1,
                                                        cursor: seat.status === "BOOKED" && seat.bookedBy !== user.name ? "not-allowed" : "pointer"
                                                    }}
                                                >
                                                    {seat.seatNumber}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Floater Seats Section */}
                    {floaters.length > 0 && (
                        <section>
                            <div className="section-header">
                                <h3>Floater Seats</h3>
                            </div>
                            <div className="spots-grid">
                                <div className="spot-card glass-panel" style={{ width: '100%', gridColumn: '1 / -1' }}>
                                    <div className="seats-container" style={{ display: 'flex', flexWrap: 'wrap' }}>
                                        {floaters.map((f) => (
                                            <div
                                                key={f.seatNumber}
                                                className={getSeatClass(f.status, f.bookedBy, true)}
                                                onClick={() => {
                                                    if (f.status === "BOOKED") {
                                                        // Assume we don't have a release floater route yet, or use it if available
                                                        alert(f.bookedBy === user.name ? "Floater release not fully implemented yet" : `Booked by ${f.bookedBy}`);
                                                    } else {
                                                        handleBook(null, f.seatNumber, "FLOATER");
                                                    }
                                                }}
                                                title={f.status === "BOOKED" ? `Booked by ${f.bookedBy}` : `Floater ${f.seatNumber} - Available`}
                                                style={{
                                                    width: '60px',
                                                    opacity: f.status === "BOOKED" && f.bookedBy !== user.name ? 0.6 : 1,
                                                    cursor: f.status === "BOOKED" && f.bookedBy !== user.name ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                {f.seatNumber}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

export default Dashboard;
