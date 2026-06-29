import React from "react";
import { MapPin, Star } from "lucide-react";

const ArtistProfileModal = ({ 
  artist, 
  onClose, 
  onBook, 
  setPreviewImage 
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
          maxWidth: "700px",
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

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <img
            src={artist.user?.profile_image || "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=400"}
            alt={artist.user?.name}
            style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent-color)" }}
          />
          <div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>{artist.user?.name}</h2>
            <p style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              <MapPin style={{ width: "14px" }} /> {artist.city}, {artist.state} ({artist.pincode})
            </p>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#ffb300" }}>
                <Star style={{ fill: "#ffb300", width: "16px" }} />
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{artist.average_rating || "New"}</span>
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>•</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>{artist.experience_years} Years Exp.</span>
            </div>
          </div>
        </div>

        <div style={{ background: "var(--bg-primary)", padding: "1.25rem", borderRadius: "12px", marginBottom: "1.5rem" }}>
          <h4 style={{ marginBottom: "0.4rem", fontWeight: 700 }}>About the Artist</h4>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{artist.bio}</p>
        </div>

        <h4 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>Mehndi Services Offered</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {artist.services?.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No services listed by this artist.</p>
          ) : (
            artist.services?.map((svc) => (
              <div key={svc.id} style={{ padding: "0.8rem 1rem", border: "1px solid var(--border-color)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-primary)" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{svc.specialization_name} ({svc.category})</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{svc.description}</div>
                </div>
                <div style={{ fontWeight: 800, color: "var(--accent-color)" }}>₹{svc.minimum_price}</div>
              </div>
            ))
          )}
        </div>

        <h4 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>Portfolio Work Gallery</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {artist.portfolio?.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", gridColumn: "1 / -1" }}>No portfolio images uploaded by this artist.</p>
          ) : (
            artist.portfolio?.map((item) => (
              <div key={item.id} style={{ position: "relative", borderRadius: "8px", overflow: "hidden", aspectRatio: "1", cursor: "pointer", border: "1px solid var(--border-color)" }} onClick={() => setPreviewImage(item.image_url)}>
                <img src={item.image_url} alt={item.caption || "Mehndi design work"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {item.caption && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.75rem", padding: "0.3rem", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.caption}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <h4 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>Customer Reviews</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {artist.reviews?.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No reviews submitted yet.</p>
          ) : (
            artist.reviews?.map((r) => (
              <div key={r.id} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.user?.name || "Client"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "#ffb300" }}>
                    <Star style={{ fill: "#ffb300", width: "14px" }} />
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{r.rating}</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{r.comment}</p>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button className="btn btn-secondary" style={{ flexGrow: 1, justifyContent: "center" }} onClick={onClose}>
            Close Profile
          </button>
          <button className="btn btn-primary" style={{ flexGrow: 1, justifyContent: "center" }} onClick={() => { onClose(); onBook(artist); }}>
            Book Session Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfileModal;
