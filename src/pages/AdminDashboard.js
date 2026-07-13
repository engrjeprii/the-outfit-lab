import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function formatShoeSize(sizeKey) {
  return displaySize(sizeKey);
}

function formatVariantSize(sizeKey, isShoes, gender = null) {
  if (isShoes) return formatShoeSize(sizeKey);
  const filtered = sizeKey
    .split("|")
    .filter((part) => {
      const [k] = part.split(":");
      return k !== "gender" && k !== "stock";
    })
    .join("|");
  return displaySize(filtered || sizeKey, gender);
}

function parseSizeKey(sizeKey) {
  if (!sizeKey) return {};
  return Object.fromEntries(sizeKey.split("|").map((part) => part.split(":")));
}

function emptyVariantRow(category) {
  const row = { gender: "men", colorway: "", stock_qty: "" };
  (category?.size_schema || []).forEach((k) => {
    row[k] = "";
  });
  return row;
}

function variantRowsFromProduct(product, category) {
  if (!product?.variants || product.variants.length === 0) {
    return [emptyVariantRow(category)];
  }
  return product.variants.map((v) => {
    const sizeFields = parseSizeKey(v.size_key || "");
    return {
      id: v.id,
      gender: v.gender || product.gender || "unisex",
      ...sizeFields,
      colorway: v.colorway === "Default" ? "" : v.colorway || "",
      stock_qty: v.stock_qty ?? "",
    };
  });
}

function sizeChartFromRows(rows, category) {
  if (!category) return [];
  const seen = new Set();
  const chart = [];
  for (const row of rows) {
    const sizeFields = {};
    for (const k of category.size_schema) {
      if (row[k]) sizeFields[k] = row[k];
    }
    if (Object.keys(sizeFields).length !== category.size_schema.length) continue;
    const key = sizeKeyFromRow(sizeFields);
    if (seen.has(key)) continue;
    seen.add(key);
    const chartRow = { ...sizeFields };
    if (category.id === "cat-shoes") {
      chartRow.gender = row.gender || "unisex";
    }
    chart.push(chartRow);
  }
  return chart;
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
                                <SortHeader
                                  column="color"
                                  label="Color"
                                  sort={getVariantSort(p.id)}
                                  onSort={() => handleVariantSort(p.id, "color")}
                                />
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
                                    <td>{formatVariantSize(v.size_key, isShoes, v.gender || p.gender)}</td>
                                    <td>{v.colorway && v.colorway !== "Default" ? v.colorway : "—"}</td>
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
  const [material, setMaterial] = useState(product.details?.material || "");
  const [fit, setFit] = useState(product.details?.fit || "");
  const [care, setCare] = useState(product.details?.care || "");
  const [images, setImages] = useState(product.images || []);
  const initialCategory = categories.find((c) => c.id === product.category_id);
  const initialCategoryIdRef = useRef(product.category_id || "");
  const [variantRows, setVariantRows] = useState(() =>
    variantRowsFromProduct(product, initialCategory)
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState("");

  const category = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    if (!category) return;
    if (category.id === initialCategoryIdRef.current) return;
    setVariantRows([emptyVariantRow(category)]);
    initialCategoryIdRef.current = category.id;
  }, [category]);

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

  const addVariantRow = () => {
    if (!category) return;
    setVariantRows([...variantRows, emptyVariantRow(category)]);
  };

  const updateVariantRow = (idx, key, value) => {
    const next = [...variantRows];
    next[idx] = { ...next[idx], [key]: value };
    setVariantRows(next);
  };

  const removeVariantRow = (idx) => {
    setVariantRows(variantRows.filter((_, i) => i !== idx));
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

    if (!category) {
      setError("Invalid category.");
      return;
    }

    if (!brand.trim()) {
      setError("Brand is required.");
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

    const validRows = [];
    for (let i = 0; i < variantRows.length; i++) {
      const row = variantRows[i];
      if (!row.gender) {
        setError(`Gender is required for variant ${i + 1}.`);
        return;
      }
      for (const k of category.size_schema) {
        if (!row[k]) {
          setError(`${k} is required for variant ${i + 1}.`);
          return;
        }
      }
      if (!row.colorway || !row.colorway.trim()) {
        setError(`Colorway is required for variant ${i + 1}.`);
        return;
      }
      const stock = parseInt(row.stock_qty, 10);
      if (Number.isNaN(stock) || stock <= 0) {
        setError(`Stock must be greater than 0 for variant ${i + 1}.`);
        return;
      }
      validRows.push(row);
    }

    if (validRows.length === 0) {
      setError("Add at least one variant row.");
      return;
    }

    if (images.length === 0) {
      setError("Upload at least one product image.");
      return;
    }

    const sizeChart = sizeChartFromRows(validRows, category);

    const genders = [...new Set(validRows.map((r) => r.gender))];
    const productGender = genders.length === 1 ? genders[0] : "unisex";

    const variants = validRows.map((row) => {
      const sizeFields = {};
      for (const k of category.size_schema) {
        sizeFields[k] = row[k];
      }
      return {
        size_key: sizeKeyFromRow(sizeFields),
        colorway: row.colorway.trim(),
        gender: row.gender,
        stock_qty: parseInt(row.stock_qty, 10) || 0,
        sold_out: false,
      };
    });

    setSaving(true);

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
      variants,
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

      <h4>Variants *</h4>
      {category && variantRows.map((row, idx) => (
        <div key={idx} className="variant-row unified-variant-row">
          <SortSelect
            label=""
            options={[
              { value: "men", label: "Men" },
              { value: "women", label: "Women" },
              { value: "unisex", label: "Unisex" },
            ]}
            value={row.gender || "men"}
            onChange={(value) => updateVariantRow(idx, "gender", value)}
            required
          />
          {category.size_schema.map((k) => (
            <input
              key={k}
              placeholder={`${k.toUpperCase()} *`}
              value={row[k] || ""}
              onChange={(e) => updateVariantRow(idx, k, e.target.value)}
              required
            />
          ))}
          <input
            placeholder="Color *"
            value={row.colorway || ""}
            onChange={(e) => updateVariantRow(idx, "colorway", e.target.value)}
            required
          />
          <input
            type="number"
            min={1}
            placeholder="Stock *"
            value={row.stock_qty}
            onChange={(e) => updateVariantRow(idx, "stock_qty", e.target.value)}
            required
          />
          <button type="button" className="btn btn-danger" onClick={() => removeVariantRow(idx)}>
            Remove
          </button>
        </div>
      ))}
      {!category && <p>Select a category to add variants.</p>}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={addVariantRow}
        disabled={!category}
      >
        Add Variant Row
      </button>

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
  const [updatingStatus, setUpdatingStatus] = useState(false);
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

  const handleUpdateStatus = async () => {
    if (!order) return;
    setUpdatingStatus(true);
    setError("");
    try {
      await api.updateOrderStatus(order.id, {
        shipping_status: order.shipping_status,
        tracking_number: order.tracking_number,
      });
      const updated = await api.getOrder(order.id);
      setOrder(updated);
      loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
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
        case "shipping_status":
          comparison = (a.shipping_status || "").localeCompare(b.shipping_status || "");
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
                  <SortHeader column="shipping_status" label="Shipping" sort={sort} onSort={handleSort} />
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-cell">No orders yet.</td>
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
                    <td data-label="Shipping">
                      <span className={`status-badge status-${o.shipping_status || "pending"}`}>
                        {o.shipping_status || "—"}
                      </span>
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
              {order.status !== "pending" && (
                <span className={`status-badge status-${order.shipping_status || "pending"}`}>
                  {order.shipping_status || "pending"}
                </span>
              )}
            </p>
            <ul className="order-detail-items">
              {order.items.map((item, idx) => (
                <li key={idx}>
                  <div className="order-item-main">
                    <span className="order-item-name">{item.name}</span>
                    <span className="order-item-price">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                  <div className="order-item-meta">
                    {displaySize(item.size_key, item.gender)} / {item.colorway} × {item.quantity}
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
            {order.status === "confirmed" && (
              <>
                <div className="order-shipping-edit">
                  <SortSelect
                    label="Shipping status"
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "packed", label: "Packed" },
                      { value: "shipped", label: "Shipped" },
                      { value: "delivered", label: "Delivered" },
                      { value: "pickup", label: "Pickup" },
                    ]}
                    value={order.shipping_status || "pending"}
                    onChange={(value) => setOrder({ ...order, shipping_status: value })}
                  />
                  <label>Tracking Number</label>
                  <input
                    type="text"
                    value={order.tracking_number || ""}
                    onChange={(e) => setOrder({ ...order, tracking_number: e.target.value })}
                    placeholder="Leave empty if pickup"
                  />
                </div>
                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={handleCloseOrder}>
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus}
                  >
                    Update Status
                  </button>
                </div>
              </>
            )}
            {order.status !== "pending" && order.status !== "confirmed" && (
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
