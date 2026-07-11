import React, { useMemo, useState } from "react";

const COLOR_SWATCHES = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#111111" },
  { name: "Beige", hex: "#d8c8b8" },
  { name: "Gray", hex: "#9ca3af" },
  { name: "Navy", hex: "#1e3a5f" },
  { name: "Olive", hex: "#556b2f" },
  { name: "Khaki", hex: "#c3b091" },
  { name: "Tan", hex: "#d2b48c" },
  { name: "Blue", hex: "#3b82f6" },
];

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "30", "32", "34", "8", "9", "10", "OS"];

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
}) {
  const [touched, setTouched] = useState({});

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  const handlePriceChange = (key, value) => {
    const next = { ...filters, [key]: clampPrice(value), page: 1 };
    onChange(next);
  };

  const toggleColor = (color) => {
    handleChange("colorway", filters.colorway === color ? "" : color);
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

      <div className="filter-group">
        <label>Color</label>
        <div className="color-options">
          {COLOR_SWATCHES.map((color) => (
            <button
              key={color.name}
              className={`color-swatch ${filters.colorway === color.name ? "active" : ""}`}
              style={{ backgroundColor: color.hex }}
              onClick={() => toggleColor(color.name)}
              aria-label={`Filter by ${color.name}`}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label>Size</label>
        <div className="size-options">
          {COMMON_SIZES.map((size) => (
            <button
              key={size}
              className={`size-option ${filters.size === size ? "active" : ""}`}
              onClick={() => toggleSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-secondary" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}
