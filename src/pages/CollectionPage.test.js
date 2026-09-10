import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "../cart";
import CollectionPage from "./CollectionPage";
import { api } from "../api";
import { preparePreorders } from "../testHelpers/preorders";

function renderPage(initialEntries = ["/shop"]) {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <CartProvider>
        <Routes>
          <Route path="/shop" element={<CollectionPage />} />
          <Route path="/pre-order" element={<CollectionPage preOrderOnly />} />
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
      expect(searchInput).toHaveValue("ABC");
    });
  });

  it("commits the search query on blur", async () => {
    renderPage();

    const searchInputs = await screen.findAllByPlaceholderText("Search products...");
    const searchInput = searchInputs[0];

    await userEvent.type(searchInput, "hoodie");
    await userEvent.tab();

    await waitFor(() => {
      expect(searchInput).toHaveValue("HOODIE");
    });
  });

  it("commits the search query on Enter", async () => {
    renderPage();

    const searchInputs = await screen.findAllByPlaceholderText("Search products...");
    const searchInput = searchInputs[0];

    await userEvent.type(searchInput, "jacket{Enter}");

    await waitFor(() => {
      expect(searchInput).toHaveValue("JACKET");
    });
  });

  it("displays products on the shop page", async () => {
    renderPage();

    const productLinks = await screen.findAllByRole("link");
    expect(productLinks.length).toBeGreaterThan(1);
  });
});


describe("Pre-order catalog", () => {
  let restore;
  beforeAll(async () => { restore = await preparePreorders(); });
  afterAll(async () => { await restore(); });
  it("keeps only pre-orders after clearing filters and sorting", async () => {
    const preorder = await api.getProducts({ preorder: true });
    const regular = await api.getProducts({ preorder: false });
    renderPage(["/pre-order?q=does-not-exist&preorder=false"]);
    expect(await screen.findByText("No pre-order items match your filters right now.")).toBeInTheDocument();
    userEvent.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    expect(await screen.findByRole("heading", { name: preorder.products[0].name })).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Newest" }));
    userEvent.click(screen.getByRole("option", { name: "Price: Low to High" }));
    await screen.findByRole("button", { name: "Price: Low to High" });
    for (const product of regular.products) {
      expect(screen.queryByRole("heading", { name: product.name })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Pre-order", level: 1 })).toBeInTheDocument();
  });

  it("paginates within pre-order results", async () => {
    const result = await api.getProducts({ preorder: true, limit: 1 });
    const second = await api.getProducts({ preorder: true, page: 2, limit: 1 });
    renderPage(["/pre-order?limit=1"]);
    await screen.findByRole("heading", { name: result.products[0].name });
    userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("heading", { name: second.products[0].name })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: result.products[0].name })).not.toBeInTheDocument();
  });
});
