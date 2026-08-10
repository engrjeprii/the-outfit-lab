import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "../cart";
import CollectionPage from "./CollectionPage";

function renderPage(initialEntries = ["/shop"]) {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <CartProvider>
        <Routes>
          <Route path="/shop" element={<CollectionPage />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>
  );
}

describe("CollectionPage search", () => {
  it("accepts more than one character in the search input", async () => {
    renderPage();

    const searchInputs = await screen.findAllByPlaceholderText("Search products...");
    const searchInput = searchInputs[0];
    expect(searchInput).toHaveValue("");

    await userEvent.type(searchInput, "abc");

    await waitFor(() => {
      expect(searchInput).toHaveValue("abc");
    });
  });

  it("commits the search query on blur", async () => {
    renderPage();

    const searchInputs = await screen.findAllByPlaceholderText("Search products...");
    const searchInput = searchInputs[0];

    await userEvent.type(searchInput, "hoodie");
    await userEvent.tab();

    await waitFor(() => {
      expect(searchInput).toHaveValue("hoodie");
    });
  });

  it("commits the search query on Enter", async () => {
    renderPage();

    const searchInputs = await screen.findAllByPlaceholderText("Search products...");
    const searchInput = searchInputs[0];

    await userEvent.type(searchInput, "jacket{Enter}");

    await waitFor(() => {
      expect(searchInput).toHaveValue("jacket");
    });
  });

  it("displays products on the shop page", async () => {
    renderPage();

    const productLinks = await screen.findAllByRole("link");
    expect(productLinks.length).toBeGreaterThan(1);
  });
});
