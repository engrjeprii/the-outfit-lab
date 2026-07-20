import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api";

function Star({ filled, onClick }) {
  return (
    <button
      type="button"
      className={`star ${filled ? "filled" : ""}`}
      onClick={onClick}
      aria-label={filled ? "Filled star" : "Empty star"}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    </button>
  );
}

function StarRating({ value, onChange, readOnly = false }) {
  return (
    <div className={`star-rating ${readOnly ? "readonly" : ""}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          filled={n <= value}
          onClick={() => !readOnly && onChange && onChange(n)}
        />
      ))}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Reviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ rating: 0, comment: "", reviewer_name: "" });

  const loadReviews = useCallback(async () => {
    try {
      const data = await api.getProductReviews(productId);
      setReviews(data.reviews || []);
      setSummary(data.summary || { count: 0, average: 0 });
    } catch (err) {
      // ignore; reviews are non-critical
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (form.rating < 1 || form.rating > 5) {
      setMessage("Please select a star rating.");
      return;
    }
    if (!form.comment.trim() || form.comment.trim().length < 3) {
      setMessage("Comment must be at least 3 characters.");
      return;
    }
    if (!form.reviewer_name.trim()) {
      setMessage("Please enter your name.");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitReview(productId, {
        rating: form.rating,
        comment: form.comment.trim(),
        reviewer_name: form.reviewer_name.trim(),
      });
      setMessage("Thanks! Your review is pending moderation.");
      setForm({ rating: 0, comment: "", reviewer_name: "" });
      loadReviews();
    } catch (err) {
      setMessage(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reviews-section">
      <h3>Reviews</h3>

      {summary.count > 0 && (
        <div className="reviews-summary">
          <span className="reviews-average">{summary.average.toFixed(1)}</span>
          <StarRating value={Math.round(summary.average)} readOnly />
          <span className="reviews-count">({summary.count})</span>
        </div>
      )}

      {loading ? (
        <p className="reviews-loading">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="reviews-empty">No reviews yet. Be the first to review this product.</p>
      ) : (
        <ul className="reviews-list">
          {reviews.map((review) => (
            <li key={review.id} className="review-item">
              <div className="review-header">
                <span className="review-author">{review.reviewer_name}</span>
                <StarRating value={review.rating} readOnly />
                <span className="review-date">{formatDate(review.created_at)}</span>
              </div>
              <p className="review-comment">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="review-form" onSubmit={handleSubmit}>
        <h4>Write a Review</h4>
        {message && <p className="review-message">{message}</p>}
        <label>Your Rating</label>
        <StarRating
          value={form.rating}
          onChange={(rating) => setForm({ ...form, rating })}
        />
        <label>Your Name</label>
        <input
          value={form.reviewer_name}
          onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })}
          placeholder="e.g. Juan"
          required
        />
        <label>Your Review</label>
        <textarea
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          placeholder="Share your thoughts about this product..."
          rows={4}
          required
          minLength={3}
        />
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
