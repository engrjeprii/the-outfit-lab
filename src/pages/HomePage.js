import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

function AuthenticityIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22S20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QualityIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getBrandSummaries();
        setBrands((data || []).slice(0, 6));
      } catch {
        setBrands([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="home-page">
      <section className="home-hero" style={{ backgroundImage: "url(/hero-bg.jpg)" }}>
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <h1>The Outfit Lab</h1>
          <p>Curated authentic apparel from the brands you trust.</p>
          <div className="home-hero-actions">
            <Link to="/shop" className="btn btn-primary btn-large">
              Shop Now
            </Link>
            <Link to="/collections" className="btn btn-secondary btn-large">
              View Collections
            </Link>
          </div>
        </div>
      </section>

      <section className="home-trust">
        <div className="home-trust-grid">
          <div className="home-trust-card">
            <div className="home-trust-icon">
              <AuthenticityIcon />
            </div>
            <h3>Authenticity Guaranteed</h3>
            <p>
              Our Assurance of Authenticity. We only sell authentic products from verified brand
              partners and retail partners globally.
            </p>
          </div>
          <div className="home-trust-card">
            <div className="home-trust-icon">
              <QualityIcon />
            </div>
            <h3>Quality Control Process</h3>
            <p>
              All products undergo rigorous quality controls across all attributes of a product
              (Box, color, material, stitching, tag, sizing, manufacturing quality) before they are
              shipped to you.
            </p>
          </div>
        </div>
      </section>

      <section className="home-collections">
        <div className="home-section-header">
          <h2>Shop by Brand</h2>
          <Link to="/collections" className="home-link">
            View All <ArrowRightIcon />
          </Link>
        </div>

        {loading ? (
          <div className="page-status">Loading brands...</div>
        ) : (
          <div className="home-brand-grid">
            {brands.map((brand) => (
              <Link
                key={brand.name}
                to={`/shop?brand=${encodeURIComponent(brand.name)}`}
                className="home-brand-card"
              >
                <div className="home-brand-image">
                  {brand.image ? (
                    <img src={brand.image} alt={brand.name} />
                  ) : (
                    <span>{brand.name.charAt(0)}</span>
                  )}
                </div>
                <span className="home-brand-name">{brand.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
