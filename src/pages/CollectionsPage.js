import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CollectionsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getBrandSummaries();
        setBrands(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="page-status">Loading...</div>;
  if (error) return <div className="page-status error">{error}</div>;

  return (
    <div className="collections-page">
      <section className="collections-hero">
        <h1>Shop by Brand</h1>
        <p>Explore curated collections from the brands you love.</p>
      </section>

      <div className="collections-list">
        {brands.map((brand) => (
          <Link
            key={brand.name}
            to={`/?brand=${encodeURIComponent(brand.name)}`}
            className="collection-card"
          >
            <div className="collection-card-image">
              {brand.image ? (
                <img src={brand.image} alt={brand.name} />
              ) : (
                <span>{brand.name.charAt(0)}</span>
              )}
            </div>
            <div className="collection-card-body">
              <div className="collection-card-info">
                <h2 className="collection-card-name">{brand.name}</h2>
                <p className="collection-card-count">
                  {brand.count} {brand.count === 1 ? "item" : "items"}
                </p>
              </div>
              <span className="collection-card-action">
                Shop <ArrowRightIcon />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
