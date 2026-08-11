import React, { useEffect, useState } from "react";
import { api } from "../api";
import ProductCard from "../components/ProductCard";

function NotifyForm({ productId, onJoined }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const result = await api.joinWaitlist(productId, email);
      if (result.alreadyJoined) {
        setMessage("You're already on the list. We'll email you when it's available.");
      } else if (result.emailSent) {
        setMessage("You're on the list. Check your inbox for a confirmation email.");
      } else {
        setMessage("You're on the list. We'll email you when it drops.");
      }
      setEmail("");
      onJoined?.();
    } catch (err) {
      setMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <form className="notify-form" onSubmit={handleSubmit}>
      <label>Notify me when available</label>
      <div className="notify-form-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
        <button type="submit" className="btn btn-primary" disabled={status === "submitting"}>
          {status === "submitting" ? "..." : "Notify Me"}
        </button>
      </div>
      {message && <p className="notify-message">{message}</p>}
    </form>
  );
}

export default function ComingSoonPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api.getUpcomingProducts();
        setProducts(data.products || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="coming-soon-page">
      <div className="collection-header">
        <div>
          <h1>Coming Soon</h1>
          <p className="collection-subtitle">Upcoming drops. Join the waitlist to be first to know.</p>
        </div>
      </div>

      {loading ? (
        <p className="page-status">Loading upcoming drops...</p>
      ) : error ? (
        <p className="page-status error">{error}</p>
      ) : products.length === 0 ? (
        <p className="page-status">No upcoming drops right now. Check back soon.</p>
      ) : (
        <>
          <p className="result-count">{products.length} upcoming drop{products.length !== 1 ? "s" : ""}</p>
          <div className="product-grid coming-soon-grid">
            {products.map((product) => (
              <div key={product.id} className="coming-soon-card-wrap">
                <ProductCard product={product} />
                <NotifyForm productId={product.id} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
