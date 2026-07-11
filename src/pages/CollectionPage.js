import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useCart } from "../cart";
import ActiveFilters from "../components/ActiveFilters";
import FilterPanel from "../components/FilterPanel";
import Pagination from "../components/Pagination";
import ProductCard from "../components/ProductCard";
import SortSelect from "../components/SortSelect";

const DEFAULT_FILTERS = {
  q: "",
  category: "",
  brand: "",
  gender: "",
  minPrice: "",
  maxPrice: "",
  size: "",
  sort: "newest",
  page: 1,
  limit: 24,
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A-Z" },
  { value: "in_cart", label: "In Cart" },
];

function parseFilters(searchParams) {
  return {
    q: searchParams.get("q") || "",
    category: searchParams.get("category") || "",
    brand: searchParams.get("brand") || "",
    gender: searchParams.get("gender") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    size: searchParams.get("size") || "",
    sort: searchParams.get("sort") || "newest",
    page: parseInt(searchParams.get("page") || "1", 10),
    limit: parseInt(searchParams.get("limit") || "24", 10),
  };
}

function filtersToSearchParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null && value !== DEFAULT_FILTERS[key]) {
      params.set(key, value);
    }
  });
  return params;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 1L1 15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function CollectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => parseFilters(searchParams));
  const [result, setResult] = useState({ products: [], total: 0, page: 1, limit: 24 });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filterSizes, setFilterSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const { items } = useCart();

  useEffect(() => {
    setFilters(parseFilters(searchParams));
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [cats, brandList, filterOpts, prods] = await Promise.all([
          api.getCategories(),
          api.getBrands(),
          api.getFilters({ category: filters.category }),
          api.getProducts(filters),
        ]);
        setCategories(cats || []);
        setBrands(brandList || []);
        setFilterSizes((filterOpts && filterOpts.sizes) || []);
        setResult(prods || { products: [], total: 0, page: 1, limit: 24 });
      } catch (err) {
        setError(err.message);
        setResult({ products: [], total: 0, page: 1, limit: 24 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters]);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // ignore in test environments without scrollTo support
    }
  }, [filters.page]);

  const handleFilterChange = (newFilters) => {
    setSearchParams(filtersToSearchParams(newFilters));
    setShowFilters(false);
  };

  const handleRemoveFilter = (key) => {
    const next = { ...filters, [key]: "", page: 1 };
    setSearchParams(filtersToSearchParams(next));
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  const handlePageChange = (page) => {
    const next = { ...filters, page };
    setSearchParams(filtersToSearchParams(next));
  };

  const handleSortChange = (sort) => {
    const next = { ...filters, sort, page: 1 };
    setSearchParams(filtersToSearchParams(next));
  };

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === filters.category),
    [categories, filters.category]
  );

  const cartProductIds = useMemo(
    () => new Set(items.map((i) => i.product_id)),
    [items]
  );

  const sortedProducts = useMemo(() => {
    if (filters.sort !== "in_cart") return result.products;
    return [...result.products].sort((a, b) => {
      const aInCart = cartProductIds.has(a.id) ? 1 : 0;
      const bInCart = cartProductIds.has(b.id) ? 1 : 0;
      return bInCart - aInCart;
    });
  }, [result.products, filters.sort, cartProductIds]);

  const filterPanel = (
    <FilterPanel
      categories={categories}
      brands={brands}
      sizes={filterSizes}
      filters={filters}
      onChange={handleFilterChange}
      onClear={handleClearFilters}
    />
  );

  if (loading) return <div className="page-status">Loading...</div>;
  if (error) return <div className="page-status error">{error}</div>;

  return (
    <div className="collection-page">
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        {selectedCategory ? (
          <>
            {" / "}
            <Link to="/">Shop</Link>
            {" / "}
            {selectedCategory.name}
          </>
        ) : (
          <>{" / "}Shop</>
        )}
      </nav>

      <div className="collection-header">
        <h1>{selectedCategory ? selectedCategory.name : "Shop All"}</h1>
        <button
          className="btn btn-secondary mobile-filter-toggle"
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters ☰
        </button>
      </div>

      <div className="collection-layout">
        <aside className="collection-filters">{filterPanel}</aside>

        <div className="collection-results">
          <div className="sort-bar">
            <SortSelect
              label="Sort by"
              options={SORT_OPTIONS}
              value={filters.sort}
              onChange={handleSortChange}
            />
          </div>

          <ActiveFilters filters={filters} onRemove={handleRemoveFilter} />
          <p className="result-count">
            {result.total} result{result.total !== 1 ? "s" : ""}
          </p>

          {sortedProducts.length > 0 ? (
            <>
              <div className="product-grid">
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination
                page={result.page}
                limit={result.limit}
                total={result.total}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <p className="empty">No products match your filters.</p>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div
        className={`mobile-filter-overlay ${showFilters ? "open" : ""}`}
        onClick={() => setShowFilters(false)}
      />
      <div className={`mobile-filter-drawer ${showFilters ? "open" : ""}`}>
        <div className="mobile-filter-header">
          <h2>Filters</h2>
          <button
            className="icon-btn"
            onClick={() => setShowFilters(false)}
            aria-label="Close filters"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="mobile-filter-body">{filterPanel}</div>
        <div className="mobile-filter-footer">
          <button className="btn btn-secondary" onClick={handleClearFilters}>Clear</button>
          <button
            className="btn btn-primary"
            onClick={() => setShowFilters(false)}
          >
            Show {result.total} results
          </button>
        </div>
      </div>
    </div>
  );
}
