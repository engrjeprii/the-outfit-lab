import React, { useMemo, useState } from "react";

function displaySizeLabel(sizeKey) {
  if (!sizeKey) return "";
  const parts = sizeKey.split("|");
  if (parts.length === 1) return parts[0].split(":")[1] || sizeKey;
  return parts.map((p) => p.split(":")[1]).join(" / ");
}

function clampPrice(value) {
  if (value === "" || value === undefined || value === null) return "";
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) return "";
  return Math.max(0, num).toString();
}

export default function FilterPanel({
  categories,
  brands,
  filters,
  onChange,
  onClear,
  sizes = [],
}) {
  const [touched, setTouched] = useState({});

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  const handlePriceChange = (key, value) => {
    const next = { ...filters, [key]: clampPrice(value), page: 1 };
    onChange(next);
  };

  const toggleSize = (size) => {
    handleChange("size", filters.size === size ? "" : size);
  };

  const priceError = useMemo(() => {
    const min = filters.minPrice === "" ? null : parseInt(filters.minPrice, 10);
    const max = filters.maxPrice === "" ? null : parseInt(filters.maxPrice, 10);

    if (min !== null && min < 0) return "Minimum price cannot be negative.";
    if (max !== null && max <= 0) return "Maximum price must be greater than 0.";
    if (min !== null && max !== null && max < min) {
      return "Maximum price must be greater than or equal to minimum price.";
    }
    return "";
  }, [filters.minPrice, filters.maxPrice]);

  const showPriceError = touched.minPrice || touched.maxPrice;

  return (
    <div className="filter-panel">
      <div className="filter-group">
        <label>Search</label>
        <input
          type="text"
          placeholder="Search products..."
          value={filters.q}
          onChange={(e) => handleChange("q", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Categories</label>
        <ul className="category-list">
          <li>
            <button
              className={!filters.category ? "active" : ""}
              onClick={() => handleChange("category", "")}
            >
              All
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                className={filters.category === cat.id ? "active" : ""}
                onClick={() => handleChange("category", cat.id)}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="filter-group">
        <label>Brand</label>
        <ul className="category-list">
          <li>
            <button
              className={!filters.brand ? "active" : ""}
              onClick={() => handleChange("brand", "")}
            >
              All
            </button>
          </li>
          {brands.map((brand) => (
            <li key={brand}>
              <button
                className={filters.brand === brand ? "active" : ""}
                onClick={() => handleChange("brand", brand)}
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="filter-group">
        <label>Gender</label>
        <ul className="category-list">
          <li>
            <button
              className={!filters.gender ? "active" : ""}
              onClick={() => handleChange("gender", "")}
            >
              All
            </button>
          </li>
          {[
            { value: "men", label: "Men" },
            { value: "women", label: "Women" },
            { value: "unisex", label: "Unisex" },
          ].map((g) => (
            <li key={g.value}>
              <button
                className={filters.gender === g.value ? "active" : ""}
                onClick={() => handleChange("gender", g.value)}
              >
                {g.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="filter-group">
        <label>Price range (PHP)</label>
        <div className="filter-range">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => {
              setTouched((t) => ({ ...t, minPrice: true }));
              handlePriceChange("minPrice", e.target.value);
            }}
          />
          <span>–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => {
              setTouched((t) => ({ ...t, maxPrice: true }));
              handlePriceChange("maxPrice", e.target.value);
            }}
          />
        </div>
        {showPriceError && priceError && (
          <p className="error" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
            {priceError}
          </p>
        )}
      </div>

      {filters.category ? (
        sizes.length > 0 ? (
          <div className="filter-group">
            <label>Size</label>
            <div className="size-options">
              {sizes.map((size) => (
                <button
                  key={size}
                  className={`size-option ${filters.size === size ? "active" : ""}`}
                  onClick={() => toggleSize(size)}
                >
                  {displaySizeLabel(size)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="filter-group">
            <label>Size</label>
            <p className="filter-hint" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              No sizes for this category.
            </p>
          </div>
        )
      ) : (
        <div className="filter-group">
          <label>Size</label>
          <p className="filter-hint" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Select a category to see size options.
          </p>
        </div>
      )}

      <button className="btn btn-secondary" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}
