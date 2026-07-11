import React from "react";

export default function Pagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];

    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(totalPages);
    }

    return pages.map((p, idx) => {
      if (p === "ellipsis") {
        return (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
            …
          </span>
        );
      }
      return (
        <button
          key={p}
          className={`btn ${p === page ? "btn-primary" : "btn-secondary"}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <div className="pagination">
      {page > 1 && (
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
      )}

      <div className="pagination-pages">{renderPageNumbers()}</div>

      {page < totalPages && (
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      )}
    </div>
  );
}
