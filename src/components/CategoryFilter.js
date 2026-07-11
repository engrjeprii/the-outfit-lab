import React from "react";

export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className="category-filter">
      <button
        className={`category-btn ${!selected ? "active" : ""}`}
        onClick={() => onSelect("")}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`category-btn ${selected === cat.id ? "active" : ""}`}
          onClick={() => onSelect(cat.id)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
