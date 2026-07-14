import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../cart";

export function formatPrice(cents) {
  return `₱${(cents / 100).toFixed(2)}`;
}

export function Price({ price, retailPrice, className = "" }) {
  const showRetail = retailPrice && retailPrice > price && price > 0;
  return (
    <span className={`price ${className}`}>
      {showRetail && (
        <span className="price-retail">{formatPrice(retailPrice)}</span>
      )}
      <span className="price-selling">{formatPrice(price)}</span>
    </span>
  );
}

function genderLabel(product) {
  const genders = product.available_genders || [product.gender || "unisex"];
  return genders.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(" / ");
}

export default function ProductCard({ product }) {
  const { items } = useCart();
  const image = product.images[0];
  const hasVideo = product.videos && product.videos.length > 0;
  const cartItem = items.find((i) => i.product_id === product.id);
  const inCart = Boolean(cartItem);
  const cartQuantity = cartItem?.quantity || 0;
  const isSoldOut = (product.total_stock || 0) === 0;

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-image-wrap">
        {image ? (
          <img src={image} alt={product.name} className="product-image" />
        ) : (
          <div className="product-image-placeholder" />
        )}
        {isSoldOut && <span className="sold-out-badge">Sold out</span>}
        {!isSoldOut && inCart && <span className="in-cart-badge">In Cart</span>}
        {hasVideo && <span className="video-badge" aria-label="Has video">▶</span>}
      </Link>
      <div className="product-info">
        <p className="product-brand">{product.brand} <span className="product-gender">{genderLabel(product)}</span></p>
        <div className="product-name-row">
          <h3 className="product-name">{product.name}</h3>
          {inCart && <span className="in-cart-dot" title={`${cartQuantity} in cart`} />}
        </div>
        <p className="product-price"><Price price={product.price} retailPrice={product.retail_price} /></p>
      </div>
    </div>
  );
}
