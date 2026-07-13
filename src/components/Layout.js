import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../cart";

function MenuIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 1H20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M0 7H20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M0 13H20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 1L1 15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CartIcon({ count }) {
  return (
    <span className="icon-btn" style={{ position: "relative" }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 4H3L5 14H13L15 4H17"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-2px",
            right: "-2px",
            background: "#111",
            color: "#fff",
            fontSize: "0.625rem",
            width: "1rem",
            height: "1rem",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/collections", label: "Collections" },
  // { to: "/", label: "Sale" },
];

export default function Layout({ children }) {
  const { items } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app">
      {!isAdmin && (
        <>
          <header className="header">
            <div className="header-inner">
              <button
                className="icon-btn mobile-menu-btn"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                <MenuIcon />
              </button>

              <Link to="/" className="logo">The Outfit Lab</Link>

              <nav className="nav">
                {NAV_LINKS.map((link) => (
                  <Link key={link.label} to={link.to} className="nav-link">{link.label}</Link>
                ))}
              </nav>

              <div className="header-actions">
                <Link to="/cart" className="icon-btn" aria-label="Cart">
                  <CartIcon count={items.reduce((sum, i) => sum + i.quantity, 0)} />
                </Link>
              </div>
            </div>
          </header>

          <div className={`mobile-nav-overlay ${menuOpen ? "open" : ""}`} onClick={closeMenu} />
          <nav className={`mobile-nav ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
            <div className="mobile-nav-header">
              <Link to="/" className="logo" onClick={closeMenu}>The Outfit Lab</Link>
              <button className="icon-btn" onClick={closeMenu} aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>
            {NAV_LINKS.map((link) => (
              <Link key={link.label} to={link.to} className="nav-link" onClick={closeMenu}>{link.label}</Link>
            ))}
            <Link to="/cart" className="nav-link" onClick={closeMenu}>Cart</Link>
          </nav>
        </>
      )}

      <main className="main">{children}</main>
    </div>
  );
}
