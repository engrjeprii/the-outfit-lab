import React from "react";

export function displaySize(sizeKey) {
  return sizeKey
    .split("|")
    .map((part) => {
      const [k, v] = part.split(":");
      return `${k.toUpperCase()} ${v}`;
    })
    .join(" / ");
}

export default function SizeColorSelector({
  sizeChart,
  variants,
  selectedSize,
  selectedColor,
  onSelectSize,
  onSelectColor,
}) {
  const availableColorways = [
    ...new Set(variants.map((v) => v.colorway)),
  ];

  const sizes = sizeChart.length > 0 ? sizeChart : [];

  const isVariantAvailable = (sizeKey, colorway) => {
    const variant = variants.find(
      (v) => v.size_key === sizeKey && v.colorway === colorway
    );
    return variant && !variant.sold_out && variant.stock_qty > 0;
  };

  return (
    <div className="size-color-selector">
      <div className="selector-group">
        <label>Size</label>
        <div className="selector-options">
          {sizes.map((row, idx) => {
            const key = Object.keys(row)
              .sort()
              .map((k) => `${k}:${row[k]}`)
              .join("|");
            const available = selectedColor
              ? isVariantAvailable(key, selectedColor)
              : variants.some((v) => v.size_key === key && !v.sold_out && v.stock_qty > 0);

            return (
              <button
                key={idx}
                className={`selector-option ${selectedSize === key ? "active" : ""} ${!available ? "disabled" : ""}`}
                onClick={() => available && onSelectSize(key)}
                disabled={!available}
              >
                {displaySize(key)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="selector-group">
        <label>Colorway</label>
        <div className="selector-options">
          {availableColorways.map((color) => {
            const available = selectedSize
              ? isVariantAvailable(selectedSize, color)
              : variants.some((v) => v.colorway === color && !v.sold_out && v.stock_qty > 0);

            return (
              <button
                key={color}
                className={`selector-option ${selectedColor === color ? "active" : ""} ${!available ? "disabled" : ""}`}
                onClick={() => available && onSelectColor(color)}
                disabled={!available}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
