import React from "react";

const FILTER_LABELS = {
  q: "Search",
  category: "Category",
  brand: "Brand",
  gender: "Gender",
  minPrice: "Min price",
  maxPrice: "Max price",
  size: "Size",
};

function formatFilterValue(key, value) {
  if (key === "gender") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value;
}

export default function ActiveFilters({ filters, onRemove }) {
  const active = Object.entries(filters).filter(([key, value]) => {
    if (key === "page" || key === "limit" || key === "sort") return false;
    return value !== "" && value !== undefined && value !== null;
  });

  if (active.length === 0) return null;

  return (
    <div className="active-filters">
      {active.map(([key, value]) => (
        <button
          key={key}
          className="filter-chip"
          onClick={() => onRemove(key)}
          title="Remove filter"
        >
          {FILTER_LABELS[key] || key}: {formatFilterValue(key, value)} <span>×</span>
        </button>
      ))}
    </div>
  );
}
