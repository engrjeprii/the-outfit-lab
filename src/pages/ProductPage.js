import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useCart } from "../cart";
import { Price } from "../components/ProductCard";
import Reviews from "../components/Reviews";
import { displaySize } from "../components/SizeColorSelector";

function shoeSizeKey(row) {
  return Object.entries({ us: row.us, uk: row.uk })
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
}

function availableGenderLabel(product) {
  const genders = [
    ...new Set(
      product.variants
        .filter((v) => !v.sold_out && v.stock_qty > 0)
        .map((v) => v.gender || "unisex")
    ),
  ];
  if (genders.length === 0) return product.gender || "unisex";
  return genders.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(" / ");
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChevronIcon({ direction = "down" }) {
  const rotate = direction === "up" ? "180deg" : "0deg";
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${rotate})`, transition: "transform 0.2s" }}
    >
      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <ChevronIcon direction={open ? "up" : "down"} />
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

const SHOW_SHIPPING_RETURNS = false;

export default function ProductPage() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const isShoes = product?.category_id === "cat-shoes";

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getProduct(id);
        setProduct(data);
        if (data.category_id === "cat-shoes") {
          const genders = [...new Set(data.size_chart.map((row) => row.gender || "unisex"))];
          if (genders.length > 0) {
            setSelectedGender(genders[0]);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const selectedVariant = useMemo(() => {
    if (!product || !selectedSize) return undefined;
    if (isShoes) {
      return product.variants.find(
        (v) =>
          v.size_key === selectedSize &&
          v.gender === selectedGender &&
          v.colorway === selectedColor
      );
    }
    return product.variants.find(
      (v) => v.size_key === selectedSize && v.colorway === selectedColor
    );
  }, [product, selectedSize, selectedColor, selectedGender, isShoes]);

  useEffect(() => {
    setSelectedSize("");
    setSelectedColor("");
    setSelectedGender("");
    setQuantity(1);
    setMediaIndex(0);
  }, [id]);

  useEffect(() => {
    if (selectedVariant && quantity > selectedVariant.stock_qty) {
      setQuantity(Math.max(1, selectedVariant.stock_qty));
    }
  }, [selectedVariant, quantity]);

  useEffect(() => {
    if (isShoes) {
      setSelectedSize("");
      setSelectedColor("");
      setQuantity(1);
    }
  }, [selectedGender, isShoes]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedSize]);

  if (loading) return <div className="page-status">Loading...</div>;
  if (error) return <div className="page-status error">{error}</div>;
  if (!product) return <div className="page-status">Product not found.</div>;

  const colorways = [...new Set(product.variants.map((v) => v.colorway))];
  const hasOnlyDefault = colorways.length === 1 && colorways[0] === "Default";
  const displayColorways = hasOnlyDefault ? [] : colorways.filter((c) => c !== "Default");
  const defaultColorway = hasOnlyDefault ? "Default" : (displayColorways[0] || null);

  // For shoes, derive available genders and sizes from size_chart rows.
  const shoeGenders = isShoes
    ? [...new Set(product.size_chart.map((row) => row.gender || "unisex"))]
    : [];
  const activeShoeGender = selectedGender || shoeGenders[0] || "";
  const sizes = isShoes
    ? product.size_chart.filter((row) => (row.gender || "unisex") === activeShoeGender)
    : product.size_chart.length > 0
    ? product.size_chart
    : [];

  const activeColor = isShoes ? selectedColor || defaultColorway : selectedColor || defaultColorway;

  const isVariantAvailable = (sizeKey, colorway, gender = null) => {
    const variant = product.variants.find(
      (v) =>
        v.size_key === sizeKey &&
        v.colorway === colorway &&
        (gender === null || v.gender === gender)
    );
    return variant && !variant.sold_out && variant.stock_qty > 0;
  };

  const visibleSizes = isShoes
    ? sizes.filter((row) => {
        const key = shoeSizeKey(row);
        return isVariantAvailable(key, activeColor || "Default", activeShoeGender);
      })
    : sizes;

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem(product, selectedVariant, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  const images = product.images || [];
  const videos = product.videos || [];
  const mediaItems = [];
  if (videos.length > 0) {
    mediaItems.push({ type: "video", url: videos[0], poster: images[0] });
  }
  images.forEach((url) => mediaItems.push({ type: "image", url }));

  const activeMedia = mediaItems[mediaIndex];

  return (
    <React.Fragment>
      <Link to="/shop" className="back-link">
        <BackIcon /> Back to Shop
      </Link>

      <div className="product-page">
        <div className="product-gallery">
          {activeMedia ? (
            activeMedia.type === "video" ? (
              <video
                key={`video-${mediaIndex}`}
                src={activeMedia.url}
                poster={activeMedia.poster}
                controls
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
                className="product-gallery-main"
                aria-label={`${product.name} video`}
              />
            ) : (
              <img
                key={`img-${mediaIndex}`}
                src={activeMedia.url}
                alt={product.name}
                className="product-gallery-main"
              />
            )
          ) : (
            <img
              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              alt={product.name}
              className="product-gallery-main"
            />
          )}
          {mediaItems.length > 1 && (
            <div className="product-gallery-thumbs">
              {mediaItems.map((item, idx) =>
                item.type === "video" ? (
                  <div
                    key={idx}
                    className={`product-gallery-thumb video-thumb ${idx === mediaIndex ? "active" : ""}`}
                    onClick={() => setMediaIndex(idx)}
                    role="button"
                    aria-label="Play product video"
                  >
                    {item.poster ? (
                      <img src={item.poster} alt="Video thumbnail" />
                    ) : (
                      <div className="video-thumb-poster" />
                    )}
                    <span className="video-thumb-icon">▶</span>
                  </div>
                ) : (
                  <img
                    key={idx}
                    src={item.url}
                    alt={`${product.name} ${idx + 1}`}
                    className={`product-gallery-thumb ${idx === mediaIndex ? "active" : ""}`}
                    onClick={() => setMediaIndex(idx)}
                  />
                )
              )}
            </div>
          )}
        </div>

        <div className="product-details">
          <p className="product-brand">{product.brand} <span className="product-gender">{availableGenderLabel(product)}</span></p>
          <h1>{product.name}</h1>
          <p className="product-price-large">
            <Price price={product.price} retailPrice={product.retail_price} />
          </p>
          <p className="product-description">{product.description}</p>

          {isShoes && shoeGenders.length > 0 && (
            <div className="selector-group">
              <label>Gender Fit</label>
              <div className="selector-options">
                {shoeGenders.map((g) => {
                  const available = product.variants.some(
                    (v) => v.gender === g && !v.sold_out && v.stock_qty > 0
                  );
                  return (
                    <button
                      key={g}
                      className={`selector-option ${activeShoeGender === g ? "active" : ""} ${!available ? "disabled" : ""}`}
                      onClick={() => available && setSelectedGender(g)}
                      disabled={!available}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {displayColorways.length > 0 && (
            <div className="selector-group">
              <label>Color</label>
              <div className="selector-options">
                {displayColorways.map((color) => {
                  const available = selectedSize
                    ? isVariantAvailable(selectedSize, color, isShoes ? activeShoeGender : null)
                    : product.variants.some(
                        (v) =>
                          v.colorway === color &&
                          !v.sold_out &&
                          v.stock_qty > 0 &&
                          (isShoes ? v.gender === activeShoeGender : true)
                      );
                  return (
                    <button
                      key={color}
                      className={`selector-option ${selectedColor === color ? "active" : ""} ${!available ? "disabled" : ""}`}
                      onClick={() => available && setSelectedColor(color)}
                      disabled={!available}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="selector-group">
            <label>Size</label>
            <div className="selector-options">
              {visibleSizes.map((row, idx) => {
                const key = isShoes
                  ? shoeSizeKey(row)
                  : Object.keys(row)
                      .sort()
                      .map((k) => `${k}:${row[k]}`)
                      .join("|");
                const available = activeColor
                  ? isVariantAvailable(key, activeColor, isShoes ? activeShoeGender : null)
                  : product.variants.some((v) => v.size_key === key && !v.sold_out && v.stock_qty > 0);
                return (
                  <button
                    key={idx}
                    className={`selector-option ${selectedSize === key ? "active" : ""} ${!available ? "disabled" : ""}`}
                    onClick={() => available && setSelectedSize(key)}
                    disabled={!available}
                  >
                    {displaySize(key, isShoes ? activeShoeGender : product.gender)}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedVariant && (
            <div className="quantity-row">
              <label htmlFor="qty">Quantity</label>
              <div className="quantity-stepper">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <input
                  id="qty"
                  type="number"
                  min={1}
                  max={selectedVariant?.stock_qty || 1}
                  value={quantity}
                  onChange={(e) => {
                    const max = selectedVariant?.stock_qty || 1;
                    setQuantity(Math.max(1, Math.min(max, parseInt(e.target.value, 10) || 1)));
                  }}
                />
                <button
                  onClick={() => setQuantity((q) => Math.min(q + 1, selectedVariant?.stock_qty || q))}
                  disabled={!selectedVariant || quantity >= selectedVariant?.stock_qty}
                >
                  +
                </button>
              </div>
              <span className="stock-hint">{selectedVariant.stock_qty} left</span>
            </div>
          )}

          <button
            className="btn btn-primary btn-large"
            onClick={handleAddToCart}
            disabled={!selectedVariant}
          >
            {selectedVariant ? "Add to Cart" : isShoes ? "Select gender, color, and size" : "Select size and color"}
          </button>

          {added && (
            <div className="add-to-cart-confirmation">
              <p>Added to cart.</p>
              <Link to="/cart" className="btn btn-secondary">View Cart</Link>
            </div>
          )}

          <div className="accordion-list">
            {product.details?.material && (
              <Accordion title="Details" defaultOpen>
                <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
                  {Object.entries(product.details).map(([k, v]) => (
                    <li key={k}><strong>{k.charAt(0).toUpperCase() + k.slice(1)}:</strong> {v}</li>
                  ))}
                </ul>
              </Accordion>
            )}
            {SHOW_SHIPPING_RETURNS && (
              <Accordion title="Shipping & Returns">
                <p>Free shipping on orders over ₱2,000. Easy 30-day returns on unused items.</p>
              </Accordion>
            )}
          </div>

          <Reviews productId={id} />
        </div>
      </div>
    </React.Fragment>
  );
}
