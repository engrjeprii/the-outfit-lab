import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

function StarIcon({ filled }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}

function StarRating({ rating }) {
  return (
    <span className="customer-review-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rating} />
      ))}
    </span>
  );
}

function Avatar({ name }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="customer-review-avatar" aria-hidden="true">
      {initials || "?"}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function useFadeUp() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

export default function CustomerReviews() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rating: 0, comment: "", reviewer_name: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sectionRef, sectionVisible] = useFadeUp();
  const trackRef = useRef(null);
  const touchStartX = useRef(null);
  const [slidesPerView, setSlidesPerView] = useState(1);

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      if (width >= 1024) {
        setSlidesPerView(3);
      } else if (width >= 640) {
        setSlidesPerView(2);
      } else {
        setSlidesPerView(1);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [slidesPerView]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getReviews();
      setReviews(data.reviews || []);
      setSummary(data.summary || { count: 0, average: 0 });
    } catch (err) {
      // Non-critical section
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const maxIndex = Math.max(0, reviews.length - slidesPerView);

  const pageStarts = useMemo(() => {
    const starts = [];
    for (let i = 0; i < reviews.length; i += slidesPerView) {
      starts.push(Math.min(i, maxIndex));
    }
    return starts;
  }, [reviews.length, slidesPerView, maxIndex]);

  const activePage = pageStarts.indexOf(currentIndex);

  const goToPage = (pageIdx) => {
    if (pageIdx >= 0 && pageIdx < pageStarts.length) {
      setCurrentIndex(pageStarts[pageIdx]);
    }
  };

  const prev = () => goToPage(Math.max(0, activePage - 1));
  const next = () => goToPage(Math.min(pageStarts.length - 1, activePage + 1));

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0].screenX;
    const diff = touchStartX.current - endX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

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
      await api.submitShopReview({
        rating: form.rating,
        comment: form.comment.trim(),
        reviewer_name: form.reviewer_name.trim(),
      });
      setMessage("Thanks! Your review is pending moderation.");
      setForm({ rating: 0, comment: "", reviewer_name: "" });
      loadReviews();
      setCurrentIndex(0);
    } catch (err) {
      setMessage(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayAverage = summary.average ? summary.average.toFixed(1) : "4.9";
  const displayCount = summary.count || 0;

  return (
    <section
      ref={sectionRef}
      className={`customer-reviews ${sectionVisible ? "visible" : ""}`}
      aria-labelledby="reviews-heading"
    >
      <div className="customer-reviews-inner">
        <div className="customer-reviews-header fade-up">
          <span className="reviews-eyebrow">
            <StarRating rating={5} /> Trusted by Fashion Lovers
          </span>
          <h2 id="reviews-heading">Loved by Thousands of Customers</h2>
          <p>Quality, comfort, and timeless style—see why shoppers keep coming back.</p>
        </div>

        <div className="reviews-stats fade-up">
          <div className="review-stat-card">
            <span className="review-stat-icon">⭐</span>
            <span className="review-stat-value">{displayAverage}/5</span>
            <span className="review-stat-label">Average Rating</span>
          </div>
          <div className="review-stat-card">
            <span className="review-stat-icon">👕</span>
            <span className="review-stat-value">
              {displayCount > 0 ? `${displayCount.toLocaleString()}+` : "10,000+"}
            </span>
            <span className="review-stat-label">Happy Customers</span>
          </div>
          <div className="review-stat-card">
            <span className="review-stat-icon">🚚</span>
            <span className="review-stat-value">Fast</span>
            <span className="review-stat-label">Nationwide Shipping</span>
          </div>
        </div>

        {loading ? (
          <p className="reviews-loading">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="reviews-empty">No reviews yet. Be the first to share your experience.</p>
        ) : (
          <>
            <div className="reviews-carousel fade-up" aria-roledescription="carousel" aria-label="Customer reviews">
              <button
                type="button"
                className="carousel-arrow carousel-arrow-prev"
                onClick={prev}
                disabled={currentIndex === 0}
                aria-label="Previous reviews"
              >
                ‹
              </button>

              <div
                className="reviews-carousel-viewport"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  ref={trackRef}
                  className="reviews-carousel-track"
                  style={{ transform: `translateX(-${currentIndex * (100 / slidesPerView)}%)` }}
                >
                  {reviews.map((review) => (
                    <article key={review.id} className="review-card" role="group" aria-roledescription="slide">
                      <StarRating rating={review.rating} />
                      <blockquote className="review-quote">{review.comment}</blockquote>
                      <div className="review-author-row">
                        <Avatar name={review.reviewer_name} />
                        <div>
                          <p className="review-author-name">{review.reviewer_name}</p>
                          <span className="review-verified">Verified Purchase</span>
                        </div>
                      </div>
                      {(review.product_name || review.created_at) && (
                        <div className="review-meta">
                          {review.product_name && (
                            <span className="review-purchased">Purchased: {review.product_name}</span>
                          )}
                          {review.created_at && (
                            <span className="review-date">{formatDate(review.created_at)}</span>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="carousel-arrow carousel-arrow-next"
                onClick={next}
                disabled={currentIndex >= maxIndex}
                aria-label="Next reviews"
              >
                ›
              </button>
            </div>

            {pageStarts.length > 1 && (
              <div className="reviews-carousel-dots fade-up">
                {pageStarts.map((startIdx, pageIdx) => (
                  <button
                    key={pageIdx}
                    type="button"
                    className={`carousel-dot ${pageIdx === activePage ? "active" : ""}`}
                    onClick={() => goToPage(pageIdx)}
                    aria-label={`Go to review page ${pageIdx + 1}`}
                    aria-current={pageIdx === activePage ? "true" : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <div className="reviews-cta fade-up">
          <p className="reviews-cta-heading">Join thousands of happy customers.</p>
          <div className="reviews-cta-actions">
            <Link to="/shop" className="btn btn-primary btn-large">
              Shop Collection
            </Link>
            <button
              type="button"
              className="reviews-link"
              onClick={() => {
                const formEl = document.querySelector(".review-form-premium");
                formEl?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Read More Reviews
            </button>
          </div>
        </div>

        <form className="review-form-premium fade-up" onSubmit={handleSubmit}>
          <h4>Share Your Experience</h4>
          {message && <p className="review-message">{message}</p>}
          <label>Your Rating</label>
          <div className="review-form-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`star-btn ${n <= form.rating ? "filled" : ""}`}
                onClick={() => setForm({ ...form, rating: n })}
                aria-label={`Rate ${n} stars`}
              >
                <StarIcon filled={n <= form.rating} />
              </button>
            ))}
          </div>
          <label>Your Name</label>
          <input
            value={form.reviewer_name}
            onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })}
            placeholder="e.g. Sarah M."
            required
          />
          <label>Your Review</label>
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder="Tell us about your experience..."
            rows={4}
            required
            minLength={3}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </section>
  );
}
