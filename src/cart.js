import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

const CART_KEY = "the-outfit-lab-cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, variant, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.product_id === product.id &&
          i.variant_id === variant.id
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant.id,
          name: product.name,
          image: product.images[0] || "",
          size_key: variant.size_key,
          colorway: variant.colorway,
          price: product.price,
          quantity,
        },
      ];
    });
  };

  const removeItem = (productId, variantId) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product_id === productId && i.variant_id === variantId))
    );
  };

  const updateQuantity = (productId, variantId, quantity) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === productId && i.variant_id === variantId
          ? { ...i, quantity: Math.max(1, quantity) }
          : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
