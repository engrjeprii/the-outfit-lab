import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../cart";

export function formatPrice(cents) {
  return `₱${(cents / 100).toFixed(2)}`;
}

export default function ProductCard({ product }) {
  const { items } = useCart();
  const image = product.images[0];
  const cartItem = items.find((i) => i.product_id === product.id);
  const inCart = Boolean(cartItem);
  const cartQuantity = cartItem?.quantity || 0;

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-image-wrap">
        {image ? (
          <img src={image} alt={product.name} className="product-image" />
        ) : (
          <div className="product-image-placeholder" />
        )}
        {inCart && <span className="in-cart-badge">In Cart</span>}
      </Link>
      <div className="product-info">
        <p className="product-brand">{product.brand} <span className="product-gender">{product.gender}</span></p>
        <div className="product-name-row">
          <h3 className="product-name">{product.name}</h3>
          {inCart && <span className="in-cart-dot" title={`${cartQuantity} in cart`} />}
        </div>
        <p className="product-price">{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}
