import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../cart";
import { formatPrice } from "../components/ProductCard";
import { displaySize } from "../components/SizeColorSelector";

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6H5H21" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="cart-page empty">
        <Link to="/" className="back-link">
          <BackIcon /> Continue Shopping
        </Link>
        <h1>Your Cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/" className="btn btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  const subtotal = total;
  const shipping = subtotal >= 200000 ? 0 : 15000;
  const finalTotal = subtotal + shipping;

  return (
    <div className="cart-page">
      <Link to="/" className="back-link">
        <BackIcon /> Continue Shopping
      </Link>
      <h1>Your Cart ({items.reduce((sum, i) => sum + i.quantity, 0)})</h1>

      <div className="cart-layout">
        <div className="cart-items">
          {items.map((item) => (
            <div key={`${item.product_id}-${item.variant_id}`} className="cart-item">
              <img src={item.image} alt={item.name} className="cart-item-image" />
              <div className="cart-item-meta">
                <h3>{item.name}</h3>
                <p>{displaySize(item.size_key)} · {item.colorway}</p>
                <p className="cart-item-price">{formatPrice(item.price)}</p>
                <div className="quantity-stepper" style={{ marginTop: "0.75rem" }}>
                  <button
                    onClick={() =>
                      updateQuantity(item.product_id, item.variant_id, item.quantity - 1)
                    }
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(
                        item.product_id,
                        item.variant_id,
                        parseInt(e.target.value, 10) || 1
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      updateQuantity(item.product_id, item.variant_id, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="cart-item-actions">
                <p className="cart-item-price">{formatPrice(item.price * item.quantity)}</p>
                <button
                  className="icon-btn"
                  onClick={() => removeItem(item.product_id, item.variant_id)}
                  aria-label="Remove item"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>
          <div className="cart-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={() => navigate("/checkout")}
            >
              Checkout
            </button>
            <Link to="/" className="btn btn-secondary btn-large">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
