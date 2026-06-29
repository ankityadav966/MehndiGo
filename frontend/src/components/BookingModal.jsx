import React from "react";
import { Calendar, Clock } from "lucide-react";

const BookingModal = ({
  artist,
  onClose,
  selectedService,
  setSelectedService,
  selectedSlot,
  setSelectedSlot,
  address,
  setAddress,
  eventType,
  setEventType,
  budget,
  setBudget,
  notes,
  setNotes,
  onSubmit,
  loading,
}) => {
  if (!artist) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "var(--bg-secondary)",
          padding: "2rem",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "1.5rem",
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "var(--text-secondary)",
          }}
        >
          &times;
        </button>
        <h2 style={{ marginBottom: "1rem" }}>Book appointment with {artist.user?.name}</h2>

        <form onSubmit={onSubmit}>
          {/* Select Service */}
          <h4 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>1. Select a Mehndi Service</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {artist.services?.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No services listed by this artist.</p>
            ) : (
              artist.services?.map((svc) => (
                <label
                  key={svc.id}
                  style={{
                    padding: "0.8rem",
                    border: selectedService?.id === svc.id ? "2px solid var(--accent-color)" : "1px solid var(--border-color)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: selectedService?.id === svc.id ? "var(--bg-tertiary)" : "none",
                  }}
                >
                  <input type="radio" name="service" style={{ display: "none" }} onChange={() => setSelectedService(svc)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{svc.specialization_name} ({svc.category})</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{svc.description}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--accent-color)" }}>₹{svc.minimum_price}</div>
                </label>
              ))
            )}
          </div>

          {/* Select Slot */}
          <h4 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>2. Choose Available Time Slot</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {artist.slots?.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No availability slots set up by this artist.</p>
            ) : (
              artist.slots?.map((slot) => {
                const start = new Date(slot.start_time);
                const isSelected = selectedSlot?.id === slot.id;
                return (
                  <label
                    key={slot.id}
                    style={{
                      padding: "0.5rem 1rem",
                      border: isSelected ? "2px solid var(--accent-color)" : "1px solid var(--border-color)",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      background: isSelected ? "var(--bg-tertiary)" : "var(--bg-primary)",
                      color: isSelected ? "var(--accent-color)" : "var(--text-primary)",
                      fontWeight: isSelected ? 600 : 500,
                    }}
                  >
                    <input type="radio" name="slot" style={{ display: "none" }} onChange={() => setSelectedSlot(slot)} />
                    <Calendar style={{ width: "12px", marginRight: "3px" }} />
                    {start.toLocaleDateString()} - <Clock style={{ width: "12px", margin: "0 3px" }} />
                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </label>
                );
              })
            )}
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Event Location (Address)</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Enter full address for the venue..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          {/* Event Type & Budget */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Event Type</label>
              <select className="form-control" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="Wedding">Wedding</option>
                <option value="Birthday">Birthday</option>
                <option value="Festival">Festival</option>
                <option value="Concert">Concert/Gig</option>
                <option value="Corporate">Corporate Event</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Event Budget (INR)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="e.g. 5000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Special Notes / Requests (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Arabic theme, bridal patterns, specific hands height..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }} disabled={loading}>
            {loading ? "Reserving slot..." : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
