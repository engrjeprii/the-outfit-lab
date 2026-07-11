import React, { useEffect, useRef, useState } from "react";

function ChevronIcon({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `rotate(${open ? "180deg" : "0deg"})`,
        transition: "transform 0.2s",
      }}
    >
      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function SortSelect({
  options,
  value,
  onChange,
  label = "Sort by",
  placeholder = "",
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = options.find((opt) => opt.value === value);
  const triggerLabel = selected ? selected.label : placeholder || options[0]?.label || "";

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="sort-bar-custom" ref={containerRef}>
      <label>{label}</label>
      <div className="sort-bar-trigger-wrap">
        <button
          className="sort-bar-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{triggerLabel}</span>
          <ChevronIcon open={open} />
        </button>
        {required && <input type="hidden" value={value} required />}
        {open && (
          <ul className="sort-bar-options" role="listbox">
            {placeholder && (
              <li
                className={!value ? "active" : ""}
                role="option"
                aria-selected={!value}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {placeholder}
              </li>
            )}
            {options.map((opt) => (
              <li
                key={opt.value}
                className={opt.value === value ? "active" : ""}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
