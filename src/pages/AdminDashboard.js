import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import Pagination from "../components/Pagination";
import SortSelect from "../components/SortSelect";
import Modal from "../components/Modal";
import { formatPrice } from "../components/ProductCard";
import { displaySize } from "../components/SizeColorSelector";

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 1L1 15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 3H17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 9H17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 15H17" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="3" r="1.5" fill="currentColor" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" />
      <circle cx="6" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 2.5L13.5 7.5L5 16H0V11L8.5 2.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 3.5L12.5 8.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4H14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 4V2C5 1.44772 5.44772 1 6 1H10C10.5523 1 11 1.44772 11 2V4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 4V14C12 14.5523 11.5523 15 11 15H5C4.44772 15 4 14.5523 4 14V4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7V11" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7V11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChevronIcon({ down }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: down ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
    >
      <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getToken() {
  return localStorage.getItem("admin-token") || "";
}

function sizeKeyFromRow(row) {
  return Object.keys(row)
    .sort()
    .map((k) => `${k}:${row[k]}`)
    .join("|");
}

function shoeSizeKey(row) {
  return sizeKeyFromRow({ us: row.us, eu: row.eu });
}

function formatShoeSize(sizeKey) {
  const parts = sizeKey
    .split("|")
    .filter((part) => {
      const [k] = part.split(":");
      return k === "us" || k === "eu";
    })
    .map((part) => {
      const [k, v] = part.split(":");
      return `${k.toLowerCase()}-${v}`;
    })
    .join(" / ");
  return parts ? `[${parts}]` : sizeKey;
}

function formatVariantSize(sizeKey, isShoes) {
  if (isShoes) return formatShoeSize(sizeKey);
  const filtered = sizeKey
    .split("|")
    .filter((part) => {
      const [k] = part.split(":");
      return k !== "gender" && k !== "stock";
    })
    .join("|");
  return displaySize(filtered || sizeKey);
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("products");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api.isAdminToken(getToken())) {
      navigate("/admin/login", { replace: true });
      return;
    }

    async function load() {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  if (loading) return <div className="page-status">Loading...</div>;
  if (error) return <div className="page-status error">{error}</div>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <div className="admin-tabs">
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>
          Products
        </button>
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>
          Categories
        </button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
          Orders
        </button>
      </div>

      {tab === "products" && <ProductManager categories={categories} />}
      {tab === "categories" && (
        <CategoryManager categories={categories} onChange={setCategories} />
      )}
      {tab === "orders" && <OrderManager />}
    </div>
  );
}

function CategoryManager({ categories, onChange }) {
  const [name, setName] = useState("");
  const [schemaInput, setSchemaInput] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setName("");
    setSchemaInput("");
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const size_schema = schemaInput.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      if (editingId) {
        const updated = await api.updateCategory(editingId, { name, size_schema }, getToken());
        onChange(categories.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api.createCategory({ name, size_schema }, getToken());
        onChange([...categories, created]);
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSchemaInput(cat.size_schema.join(", "));
  };

  return (
    <div className="admin-section">
      <h2>{editingId ? "Edit Category" : "Categories"}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="admin-form">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Size Schema (comma separated)</label>
        <input
          value={schemaInput}
          onChange={(e) => setSchemaInput(e.target.value)}
          placeholder="us, eu"
          required
        />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingId ? "Update Category" : "Create Category"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="admin-list admin-category-list">
        {categories.map((cat) => (
          <li key={cat.id}>
            <span className="category-name">{cat.name} ({cat.size_schema.join(", ")})</span>
            <button className="btn btn-secondary" onClick={() => handleEdit(cat)}>
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductManager({ categories }) {
  const [products, setProducts] = useState([]);
  const [result, setResult] = useState({ products: [], total: 0, page: 1, limit: 24 });
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    sort: "newest",
    page: 1,
    limit: 24,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const loadProducts = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      setError("");
      try {
        const next = { ...filters, ...overrides };
        const data = await api.getProducts(next);
        setResult(data);
        setProducts(data.products);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ q: "", category: "", sort: "newest", page: 1, limit: 24 });
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const refreshProducts = () => {
    loadProducts();
  };

  const [variantSort, setVariantSort] = useState({});
  const VARIANT_PAGE_LIMIT = 5;

  const getVariantSort = (productId) => {
    return variantSort[productId] || { column: "size_key", direction: "asc" };
  };

  const handleVariantSort = (productId, column) => {
    setVariantSort((prev) => {
      const current = prev[productId] || { column: "size_key", direction: "asc" };
      const direction = current.column === column && current.direction === "asc" ? "desc" : "asc";
      return { ...prev, [productId]: { column, direction } };
    });
  };

  const sortVariants = (variants, productId, isShoes) => {
    const { column, direction } = getVariantSort(productId);
    const sorted = [...variants];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (column) {
        case "gender":
          comparison = (a.gender || "").localeCompare(b.gender || "");
          break;
        case "size":
          comparison = (a.size_key || "").localeCompare(b.size_key || "");
          break;
        case "color":
          comparison = (a.colorway || "").localeCompare(b.colorway || "");
          break;
        case "stock":
          comparison = (a.stock_qty || 0) - (b.stock_qty || 0);
          break;
        case "size_key":
        default:
          comparison = (a.size_key || "").localeCompare(b.size_key || "");
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  };

  const [variantPages, setVariantPages] = useState({});

  const handleVariantPageChange = (productId, page) => {
    setVariantPages((prev) => ({ ...prev, [productId]: page }));
  };

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEdit = async (p) => {
    try {
      const full = await api.getProduct(p.id);
      setEditing(full);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteProduct(deleteConfirm.id, getToken());
      setDeleteConfirm(null);
      refreshProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const activeFilterCount = [filters.q, filters.category].filter(Boolean).length;

  const filterFields = (
    <>
      <div className="filter-field">
        <label>Search</label>
        <input
          type="text"
          placeholder="Name or SKU"
          value={filters.q}
          onChange={(e) => handleFilterChange("q", e.target.value)}
        />
      </div>
      <div className="filter-field admin-category-filter">
        <SortSelect
          label="Category"
          value={filters.category}
          placeholder="All categories"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(value) => handleFilterChange("category", value)}
        />
      </div>
      <div className="filter-field">
        <SortSelect
          label="Sort"
          value={filters.sort}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "name_asc", label: "Name: A-Z" },
            { value: "name_desc", label: "Name: Z-A" },
            { value: "price_asc", label: "Price: Low to High" },
            { value: "price_desc", label: "Price: High to Low" },
            { value: "stock_asc", label: "Stock: Low to High" },
            { value: "stock_desc", label: "Stock: High to Low" },
          ]}
          onChange={(value) => handleFilterChange("sort", value)}
        />
      </div>
    </>
  );

  return (
    <div className="admin-section">
      <div className="admin-list-toolbar">
        <button
          className="mobile-filter-toggle"
          onClick={() => setShowFilters((s) => !s)}
          aria-label="Toggle filters"
        >
          <FilterIcon />
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>
        <div className="admin-list-filters">{filterFields}</div>
        <button
          className="btn btn-primary admin-add-product-btn"
          onClick={() => setEditing({})}
        >
          Add Product
        </button>
      </div>

      {/* Mobile filter sheet */}
      <div
        className={`mobile-filter-overlay ${showFilters ? "open" : ""}`}
        onClick={() => setShowFilters(false)}
      />
      <div className={`mobile-filter-drawer admin-filter-drawer ${showFilters ? "open" : ""}`}>
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
        <div className="mobile-filter-body">
          <div className="admin-list-filters vertical">{filterFields}</div>
        </div>
        <div className="mobile-filter-footer">
          <button className="btn btn-secondary" onClick={handleClearFilters}>
            Clear
          </button>
          <button className="btn btn-primary" onClick={() => setShowFilters(false)}>
            Show {result.total} result{result.total !== 1 ? "s" : ""}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      <p className="result-count">
        {result.total} result{result.total !== 1 ? "s" : ""}
      </p>

      {editing && (
        <Modal
          title={editing.id ? "Edit Product" : "New Product"}
          onClose={() => setEditing(null)}
        >
          <ProductForm
            product={editing}
            categories={categories}
            products={products}
            onSaved={() => {
              setEditing(null);
              refreshProducts();
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Product" onClose={() => setDeleteConfirm(null)}>
          <div className="confirm-dialog">
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            <div className="form-actions">
              <button
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {loading ? (
        <div className="page-status">Loading...</div>
      ) : (
        <>
          <div className="admin-product-collapsible-list">
            {products.length === 0 && (
              <p className="empty-cell">No products found.</p>
            )}
            {products.map((p) => {
              const category = categories.find((c) => c.id === p.category_id);
              const isExpanded = expanded.has(p.id);
              const isShoes = category?.id === "cat-shoes";
              return (
                <div key={p.id} className={`admin-product-collapsible ${isExpanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="admin-product-collapsible-header"
                    onClick={() => toggleExpanded(p.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="admin-product-collapsible-title">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="admin-product-thumb"
                      />
                      <div className="admin-product-text">
                        <span className="admin-product-name">{p.name}</span>
                        <span className="admin-product-meta">
                          {p.sku} · {category?.name || p.category_id} · {formatPrice(p.price)} ·{" "}
                          {p.total_stock || 0} in stock
                        </span>
                      </div>
                    </div>
                    <div className="admin-product-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="icon-btn"
                        onClick={() => handleEdit(p)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => setDeleteConfirm(p)}
                        aria-label="Delete"
                        title="Delete"
                      >
                        <DeleteIcon />
                      </button>
                      <span className="admin-product-chevron">
                        <ChevronIcon down={isExpanded} />
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="admin-product-collapsible-body">
                      {p.variants && p.variants.length > 0 ? (
                        <>
                          <table className="admin-variant-table">
                            <thead>
                              <tr>
                                <SortHeader
                                  column="gender"
                                  label="Gender"
                                  sort={getVariantSort(p.id)}
                                  onSort={() => handleVariantSort(p.id, "gender")}
                                />
                                <SortHeader
                                  column="size"
                                  label="Size"
                                  sort={getVariantSort(p.id)}
                                  onSort={() => handleVariantSort(p.id, "size")}
                                />
                                {!isShoes && (
                                  <SortHeader
                                    column="color"
                                    label="Color"
                                    sort={getVariantSort(p.id)}
                                    onSort={() => handleVariantSort(p.id, "color")}
                                  />
                                )}
                                <SortHeader
                                  column="stock"
                                  label="Stock"
                                  sort={getVariantSort(p.id)}
                                  onSort={() => handleVariantSort(p.id, "stock")}
                                  align="right"
                                />
                              </tr>
                            </thead>
                            <tbody>
                              {sortVariants(p.variants, p.id, isShoes)
                                .slice(
                                  ((variantPages[p.id] || 1) - 1) * VARIANT_PAGE_LIMIT,
                                  (variantPages[p.id] || 1) * VARIANT_PAGE_LIMIT
                                )
                                .map((v) => (
                                  <tr key={v.id}>
                                    <td>{v.gender || p.gender || "unisex"}</td>
                                    <td>{formatVariantSize(v.size_key, isShoes)}</td>
                                    {!isShoes && <td>{v.colorway && v.colorway !== "Default" ? v.colorway : "—"}</td>}
                                    <td className={`text-right ${v.stock_qty <= 0 || v.sold_out ? "out" : ""}`}>
                                      {v.sold_out ? "Sold out" : v.stock_qty}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          {p.variants.length > VARIANT_PAGE_LIMIT && (
                            <Pagination
                              page={variantPages[p.id] || 1}
                              limit={VARIANT_PAGE_LIMIT}
                              total={p.variants.length}
                              onPageChange={(page) => handleVariantPageChange(p.id, page)}
                            />
                          )}
                        </>
                      ) : (
                        <p className="admin-variant-empty">No variants.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination
            page={result.page}
            limit={result.limit}
            total={result.total}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

function ProductForm({ product, categories, products, onSaved, onCancel }) {
  const [sku, setSku] = useState(product.sku || "");
  const [name, setName] = useState(product.name || "");
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price ? product.price / 100 : "");
  const [categoryId, setCategoryId] = useState(product.category_id || "");
  const [brand, setBrand] = useState(product.brand || "");
  const [gender, setGender] = useState(product.gender || "unisex");
  const [material, setMaterial] = useState(product.details?.material || "");
  const [fit, setFit] = useState(product.details?.fit || "");
  const [care, setCare] = useState(product.details?.care || "");
  const [images, setImages] = useState(product.images || []);
  const [sizeChart, setSizeChart] = useState(() => {
    const rows = product.size_chart || [];
    if (product.category_id === "cat-shoes") {
      return rows.map((row) => {
        const sizeKey = shoeSizeKey(row);
        const existing = (product.variants || []).find((v) => v.size_key === sizeKey);
        return {
          ...row,
          gender: row.gender || "men",
          stock: existing ? existing.stock_qty : 0,
        };
      });
    }
    return rows;
  });
  const [variants, setVariants] = useState(product.variants || []);
  const [colorwayInput, setColorwayInput] = useState("");
  const [initialStock, setInitialStock] = useState(10);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState("");

  const category = categories.find((c) => c.id === categoryId);
  const isShoes = category?.id === "cat-shoes";
  const defaultShoeColorway = "Default";

  // For shoes, keep one variant per size row with a default colorway.
  useEffect(() => {
    if (!isShoes || !category) return;
    const next = sizeChart.map((row) => {
      const sizeKey = shoeSizeKey(row);
      const gender = row.gender || "men";
      const stock = parseInt(row.stock, 10);
      return {
        size_key: sizeKey,
        colorway: defaultShoeColorway,
        gender,
        stock_qty: Number.isNaN(stock) ? 0 : Math.max(0, stock),
        sold_out: false,
      };
    });
    setVariants(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShoes, sizeChart, category]);

  const generateSku = (catId, brandName) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return "";
    const brandPrefix = brandName
      ? brandName.toUpperCase().replace(/[^a-z0-9]/gi, "")
      : "NOBRAND";
    const catPrefix = cat.slug.toUpperCase();

    const existingSkus = new Set(products.map((p) => p.sku));
    let attempts = 0;
    let candidate;
    do {
      const suffix = Math.floor(100 + Math.random() * 900);
      candidate = `${brandPrefix}-${catPrefix}-${suffix}`;
      attempts++;
    } while (existingSkus.has(candidate) && attempts < 100);
    return candidate;
  };

  const handleBrandChange = (value) => {
    setBrand(value);
    if (!product.id) {
      setSku(generateSku(categoryId, value));
    }
  };

  const handleCategoryChange = (value) => {
    setCategoryId(value);
    if (!product.id) {
      setSku(generateSku(value, brand));
    }
  };

  const addSizeRow = () => {
    if (!category) return;
    const row = {};
    if (isShoes) {
      row.gender = "men";
      row.us = "";
      row.eu = "";
      row.stock = 0;
    } else {
      category.size_schema.forEach((k) => (row[k] = ""));
    }
    setSizeChart([...sizeChart, row]);
  };

  const updateSizeRow = (idx, key, value) => {
    const next = [...sizeChart];
    next[idx] = { ...next[idx], [key]: value };
    setSizeChart(next);
  };

  const updateShoeRowGender = (idx, value) => {
    if (!isShoes) return;
    const next = [...sizeChart];
    next[idx] = { ...next[idx], gender: value };
    setSizeChart(next);
  };

  const updateShoeSizePair = (idx, raw) => {
    if (!isShoes) return;
    const parts = raw.split("/").map((p) => p.trim());
    const us = parts[0] || "";
    const eu = parts[1] || "";
    const next = [...sizeChart];
    next[idx] = { ...next[idx], us, eu };
    setSizeChart(next);
  };

  const updateShoeRowStock = (idx, value) => {
    if (!isShoes) return;
    const next = [...sizeChart];
    const stock = parseInt(value, 10);
    next[idx] = { ...next[idx], stock: Number.isNaN(stock) ? 0 : Math.max(0, stock) };
    setSizeChart(next);
  };

  const removeSizeRow = (idx) => {
    const next = sizeChart.filter((_, i) => i !== idx);
    setSizeChart(next);
  };

  const addColorway = () => {
    const color = isShoes ? defaultShoeColorway : colorwayInput.trim();
    if (!color) return;
    const next = [...variants];
    sizeChart.forEach((row) => {
      const sizeKey = sizeKeyFromRow(row);
      if (!next.some((v) => v.size_key === sizeKey && v.colorway === color)) {
        next.push({ size_key: sizeKey, colorway: color, stock_qty: Math.max(0, parseInt(initialStock, 10) || 0), sold_out: false });
      }
    });
    setVariants(next);
    setColorwayInput("");
  };

  const updateVariant = (index, updates) => {
    const next = [...variants];
    next[index] = { ...next[index], ...updates };
    setVariants(next);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImageName(file.name);
    try {
      const { url } = await api.uploadImage(file, getToken());
      setImages([...images, url]);
      setSelectedImageName("");
    } catch (err) {
      alert(err.message);
      setSelectedImageName("");
    } finally {
      e.target.value = "";
    }
  };

  const moveImage = (idx, dir) => {
    const next = [...images];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setImages(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!categoryId) {
      setError("Category is required.");
      return;
    }

    if (!brand.trim()) {
      setError("Brand is required.");
      return;
    }

    if (!isShoes && !gender) {
      setError("Gender is required.");
      return;
    }

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    if (!material.trim() || !fit.trim() || !care.trim()) {
      setError("Material, fit, and care are required.");
      return;
    }

    if (sizeChart.length === 0) {
      setError("Add at least one size row.");
      return;
    }

    if (isShoes && sizeChart.some((row) => !row.us || !row.eu)) {
      setError("Shoe sizes require both US and EU values.");
      return;
    }

    if (isShoes && sizeChart.some((row) => !row.stock || parseInt(row.stock, 10) <= 0)) {
      setError("Stock must be greater than 0 for every shoe size.");
      return;
    }

    if (!isShoes && sizeChart.some((row) => category.size_schema.some((k) => !row[k]))) {
      setError("All size values are required.");
      return;
    }

    if (!isShoes && variants.length === 0) {
      setError("Add at least one colorway.");
      return;
    }

    if (images.length === 0) {
      setError("Upload at least one product image.");
      return;
    }

    if (variants.length === 0) {
      setError("Add at least one colorway with sizes before saving.");
      return;
    }

    setSaving(true);

    const productGender = isShoes
      ? (sizeChart.every((r) => r.gender === sizeChart[0]?.gender)
          ? sizeChart[0]?.gender
          : "unisex") || "unisex"
      : gender;

    const payload = {
      sku,
      name,
      description,
      price: Math.round(parseFloat(price) * 100),
      category_id: categoryId,
      brand,
      gender: productGender,
      images,
      details: { material, fit, care },
      size_chart: sizeChart,
      variants: variants.map((v) => ({
        size_key: v.size_key,
        colorway: v.colorway,
        gender: v.gender || "unisex",
        stock_qty: parseInt(v.stock_qty) || 0,
        sold_out: !!v.sold_out,
      })),
    };

    try {
      await api.saveProduct(payload, getToken());
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-form product-form" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}

      <SortSelect
        value={categoryId}
        label="Category *"
        placeholder="Select category"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        onChange={handleCategoryChange}
        required
      />

      <label>SKU <span className="field-hint">(auto-generated)</span></label>
      <input value={sku} readOnly required className="readonly-input" />

      <label>Brand *</label>
      <input
        value={brand}
        onChange={(e) => handleBrandChange(e.target.value)}
        placeholder="e.g. Nike"
        required
      />

      {!isShoes && (
        <SortSelect
          value={gender}
          label="Gender *"
          placeholder="Select gender"
          options={[
            { value: "men", label: "Men" },
            { value: "women", label: "Women" },
            { value: "unisex", label: "Unisex" },
          ]}
          onChange={(value) => setGender(value)}
          required
        />
      )}

      <label>Name *</label>
      <input value={name} onChange={(e) => setName(e.target.value)} required />

      <label>Description *</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />

      <label>Price (PHP) *</label>
      <input
        type="number"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
      />

      <h4>Details *</h4>
      <label>Material *</label>
      <input value={material} onChange={(e) => setMaterial(e.target.value)} required />
      <label>Fit *</label>
      <input value={fit} onChange={(e) => setFit(e.target.value)} required />
      <label>Care *</label>
      <input value={care} onChange={(e) => setCare(e.target.value)} required />

      <h4>Size Chart *</h4>
      {category && sizeChart.map((row, idx) => (
        <div key={idx} className="size-row">
          {isShoes ? (
            <>
              <SortSelect
                label=""
                options={[
                  { value: "men", label: "Men" },
                  { value: "women", label: "Women" },
                  { value: "unisex", label: "Unisex" },
                ]}
                value={row.gender || "men"}
                onChange={(value) => updateShoeRowGender(idx, value)}
              />
              <input
                placeholder="US / EU *"
                value={row.us || row.eu ? `${row.us || ""} / ${row.eu || ""}` : ""}
                onChange={(e) => updateShoeSizePair(idx, e.target.value)}
                className="shoe-size-pair-input"
                required
              />
              <input
                type="number"
                min={1}
                placeholder="Stock *"
                value={row.stock}
                onChange={(e) => updateShoeRowStock(idx, e.target.value)}
                className="shoe-stock-input"
                required
              />
            </>
          ) : (
            category.size_schema.map((k) => (
              <input
                key={k}
                placeholder={`${k.toUpperCase()} *`}
                value={row[k] || ""}
                onChange={(e) => updateSizeRow(idx, k, e.target.value)}
                required
              />
            ))
          )}
          <button type="button" className="btn btn-danger" onClick={() => removeSizeRow(idx)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={addSizeRow}>
        Add Size Row
      </button>

      {!isShoes && <h4>Colorways & Stock *</h4>}
      {!isShoes && (
        <div className="colorway-input">
          <input
            placeholder="New colorway, e.g. Black *"
            value={colorwayInput}
            onChange={(e) => setColorwayInput(e.target.value)}
            required
          />
          <input
            type="number"
            min={0}
            placeholder="Initial stock *"
            value={initialStock}
            onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
            title="Initial stock per size for this colorway"
            required
          />
          <button type="button" className="btn btn-secondary" onClick={addColorway}>
            Add Colorway
          </button>
        </div>
      )}

      {!isShoes && variants.length > 0 && (
        <div className="colorway-stock-summary">
          {Object.entries(
            variants.reduce((acc, v) => {
              acc[v.colorway] = (acc[v.colorway] || 0) + (parseInt(v.stock_qty, 10) || 0);
              return acc;
            }, {})
          )
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([color, total]) => (
              <div key={color} className="colorway-stock-row">
                <span className="colorway-name">{color}</span>
                <span className="colorway-total">{total} in stock</span>
              </div>
            ))}
        </div>
      )}

      {!isShoes && (
        <div className="variant-matrix">
          {variants.map((v, idx) => (
            <div key={`${v.size_key}-${v.colorway}-${v.gender || "unisex"}`} className="variant-row">
              <span>
                {displaySize(v.size_key)}
                {` / ${v.colorway}`}
              </span>
              <input
                type="number"
                min={0}
                placeholder="Stock *"
                value={v.stock_qty}
                onChange={(e) =>
                  updateVariant(idx, { stock_qty: parseInt(e.target.value) || 0 })
                }
                required
              />
              <label>
                <input
                  type="checkbox"
                  checked={v.sold_out}
                  onChange={(e) => updateVariant(idx, { sold_out: e.target.checked })}
                />
                Sold out
              </label>
            </div>
          ))}
        </div>
      )}

      <h4>Images *</h4>
      <div className="file-input-wrap">
        <label className="file-input-label">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
          />
          <span>Choose File</span>
        </label>
        <span className="file-input-hint">
          {selectedImageName || "No file chosen"}
        </span>
      </div>
      <div className="image-reorder-list">
        {images.map((url, idx) => (
          <div key={url} className="image-reorder-item">
            <img src={url} alt={`Product ${idx + 1}`} />
            <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0}>
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveImage(idx, 1)}
              disabled={idx === images.length - 1}
            >
              ↓
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setImages(images.filter((_, i) => i !== idx))}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Save Product
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function OrderManager() {
  const [code, setCode] = useState("");
  const [order, setOrder] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sort, setSort] = useState({ column: "created_at", direction: "desc" });

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listOrders(getToken());
      setOrdersList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api.getOrder(code);
      setOrder(data);
    } catch (err) {
      setError(err.message);
      setOrder(null);
    }
  };

  const handleView = async (id) => {
    setError("");
    try {
      const data = await api.getOrder(id);
      setOrder(data);
    } catch (err) {
      setError(err.message);
      setOrder(null);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.confirmOrder(order.id, getToken());
      const updated = await api.getOrder(order.id);
      setOrder(updated);
      loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleCloseOrder = () => {
    setOrder(null);
  };

  const handleSort = (column) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  };

  const sortedOrders = useMemo(() => {
    const sorted = [...ordersList];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.column) {
        case "id":
          comparison = a.id.localeCompare(b.id);
          break;
        case "created_at":
          comparison = new Date(a.created_at) - new Date(b.created_at);
          break;
        case "item_count":
          comparison = a.item_count - b.item_count;
          break;
        case "total":
          comparison = a.total - b.total;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          return 0;
      }
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [ordersList, sort]);

  const totalPages = Math.ceil(sortedOrders.length / limit);
  const paginatedOrders = sortedOrders.slice((page - 1) * limit, page * limit);

  return (
    <div className="admin-section">
      <h2>Orders</h2>
      <form onSubmit={handleLookup} className="admin-form">
        <label>Order Code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="OTL-XXXXXX"
        />
        <button type="submit" className="btn btn-primary">Look Up</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="page-status">Loading orders...</div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <SortHeader column="id" label="Order" sort={sort} onSort={handleSort} />
                  <SortHeader column="created_at" label="Date" sort={sort} onSort={handleSort} />
                  <SortHeader column="item_count" label="Items" sort={sort} onSort={handleSort} />
                  <SortHeader column="total" label="Total" sort={sort} onSort={handleSort} />
                  <SortHeader column="status" label="Status" sort={sort} onSort={handleSort} />
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-cell">No orders yet.</td>
                  </tr>
                )}
                {paginatedOrders.map((o) => (
                  <tr key={o.id}>
                    <td data-label="Order">{o.id}</td>
                    <td data-label="Date">{formatDate(o.created_at)}</td>
                    <td data-label="Items">{o.item_count}</td>
                    <td data-label="Total">{formatPrice(o.total)}</td>
                    <td data-label="Status">
                      <span className={`status-badge status-${o.status}`}>{o.status}</span>
                    </td>
                    <td data-label="Action">
                      <button className="btn btn-secondary" onClick={() => handleView(o.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <Pagination
              page={page}
              limit={limit}
              total={sortedOrders.length}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {order && (
        <Modal title={`Order ${order.id}`} onClose={handleCloseOrder}>
          <div className="order-detail-modal">
            <p className="order-detail-meta">
              <span>{formatDate(order.created_at)}</span>
              <span className={`status-badge status-${order.status}`}>{order.status}</span>
            </p>
            <ul className="order-detail-items">
              {order.items.map((item, idx) => (
                <li key={idx}>
                  <div className="order-item-main">
                    <span className="order-item-name">{item.name}</span>
                    <span className="order-item-price">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                  <div className="order-item-meta">
                    {displaySize(item.size_key)} / {item.colorway} × {item.quantity}
                  </div>
                  {item.quantity > 1 && (
                    <div className="order-item-unit">{formatPrice(item.price)} each</div>
                  )}
                </li>
              ))}
            </ul>
            <p className="order-detail-total">Total: {formatPrice(order.total)}</p>
            {order.status === "pending" && (
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={handleCloseOrder}>
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  Confirm Sale
                </button>
              </div>
            )}
            {order.status !== "pending" && (
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={handleCloseOrder}>
                  Close
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function SortHeader({ column, label, sort, onSort, align = "left" }) {
  const active = sort.column === column;
  return (
    <th
      className={`sortable-header ${active ? "active" : ""} ${align === "right" ? "text-right" : ""}`}
      onClick={() => onSort(column)}
    >
      <span>{label}</span>
      <span className="sort-indicator">
        {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}
