import React, { useEffect, useState } from "react";
import { useCart } from "../cart";
import { api } from "../api";
import { formatPrice } from "../components/ProductCard";
import { displaySize } from "../components/SizeColorSelector";

const MESSENGER_URL = process.env.REACT_APP_MESSENGER_URL || "https://m.me/theoutfitlab";

function buildOrderMessage(order) {
  const lines = order.items.map((item) => {
    const size = displaySize(item.size_key, item.gender);
    const color = item.colorway && item.colorway !== "Default" ? ` / ${item.colorway}` : "";
    const gender = item.gender ? ` / ${item.gender}` : "";
    return `- ${item.name} (${size}${color}${gender}) x${item.quantity} — ${formatPrice(item.price * item.quantity)}`;
  });

  return [
    `Hi! I'd like to order ${order.id}`,
    "",
    ...lines,
    "",
    `Total: ${formatPrice(order.total)}`,
  ].join("\n");
}

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function createOrder() {
      if (items.length === 0) return;
      try {
        const created = await api.createOrder(items);
        setOrder(created);
        setMessage(buildOrderMessage(created));
      } catch (err) {
        setError(err.message);
      }
    }
    createOrder();
  }, [items]);

  useEffect(() => {
    if (!message) return;

    async function copyAndOpen() {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(message);
          setCopied(true);
        } else {
          throw new Error("Clipboard unavailable");
        }
      } catch {
        setCopyFailed(true);
      }

      // Open Messenger in a new tab regardless of copy result.
      window.open(MESSENGER_URL, "_blank");
    }

    copyAndOpen();
  }, [message]);

  const handleCopyAgain = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  const handleDone = () => {
    clearCart();
    window.location.href = "/";
  };

  if (items.length === 0 && !order) {
    return <div className="page-status">Your cart is empty.</div>;
  }

  if (error) return <div className="page-status error">{error}</div>;
  if (!order) return <div className="page-status">Creating your order...</div>;

  return (
    <div className="checkout-page">
      <h1>Checkout via Messenger</h1>
      <p className="order-code">
        Order code: <strong>{order.id}</strong>
      </p>

      <div className="checkout-notice">
        <h3>How to complete your order</h3>
        <ol>
          <li>Your order has been created and the message below has been copied to your clipboard.</li>
          <li>Send the copied message to us on Messenger to confirm your order.</li>
          <li>Wait for our team to confirm availability and send payment instructions.</li>
          <li>Once payment is received, your order will be marked as confirmed.</li>
        </ol>
        <p className="checkout-warning">
          <strong>Important:</strong> Your order is held for <strong>24 hours</strong> while we wait for
          your Messenger message. If we do not hear from you within 24 hours, your order will be
          automatically cancelled and the items returned to stock for other buyers.
        </p>
      </div>

      <div className="order-summary">
        <p className="checkout-warning">
          Your order is not final until confirmed by our team via messenger. Stock is not reserved
          during this time, and items may sell out. Please message us within 24 hours to complete
          your order.
        </p>
        {order.items.map((item, idx) => (
          <div key={idx} className="order-summary-item">
            <span>
              {item.name} ({displaySize(item.size_key, item.gender)}
              {item.colorway && item.colorway !== "Default" && ` / ${item.colorway}`}
              {item.gender && ` / ${item.gender}`}) x
              {item.quantity}
            </span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="order-summary-total">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {copied && <p className="copy-status success">Order message copied to clipboard.</p>}

      {copyFailed && (
        <div className="copy-fallback">
          <p>We couldn't copy automatically. Copy the message below:</p>
          <textarea readOnly rows={8} value={message} className="order-message" />
          <button className="btn btn-secondary" onClick={handleCopyAgain}>
            Copy Again
          </button>
        </div>
      )}

      <p className="checkout-warning">
        Your order is not final until confirmed by our team via messenger. Stock is not reserved
        during this time, and items may sell out. Please message us within 24 hours to complete
        your order.
      </p>

      <a
        href={MESSENGER_URL}
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary btn-large"
      >
        Open Messenger
      </a>

      <button className="btn btn-secondary" onClick={handleDone}>
        Done — Clear Cart
      </button>
    </div>
  );
}
