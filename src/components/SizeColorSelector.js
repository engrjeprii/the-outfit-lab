import React from "react";

const WOMEN_NUMERIC_SIZES = {
  XS: "06",
  S: "08",
  M: "10",
  L: "12",
  XL: "14",
};

function sortSizeParts(parts) {
  // Prefer US before UK for shoes so output reads "us-8 / uk-7".
  return [...parts].sort((a, b) => {
    const ak = a.split(":")[0];
    const bk = b.split(":")[0];
    if (ak === "us" && bk === "uk") return -1;
    if (ak === "uk" && bk === "us") return 1;
    return ak.localeCompare(bk);
  });
}

export function displaySize(sizeKey, gender = null) {
  if (!sizeKey) return "";
  const parts = sizeKey.split("|").filter(Boolean);
  const isAlpha = parts.length === 1 && parts[0].startsWith("alpha:");
  const isSingleSize = parts.length === 1 && (parts[0].startsWith("freesize:") || parts[0].startsWith("one_size:"));

  if (isSingleSize) {
    return "One Size";
  }

  if (isAlpha) {
    const value = parts[0].split(":")[1];
    const numeric = gender === "women" ? WOMEN_NUMERIC_SIZES[value] : null;
    return numeric ? `${value} / ${numeric}` : value;
  }

  return sortSizeParts(parts)
    .map((part) => {
      const [k, v] = part.split(":");
      return `${k.toLowerCase()}-${v}`;
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
