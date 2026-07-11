import { api } from "./api";

describe("mock API getProducts", () => {
  it("returns a paginated envelope with default values", async () => {
    const result = await api.getProducts();
    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page", 1);
    expect(result).toHaveProperty("limit", 24);
    expect(Array.isArray(result.products)).toBe(true);
  });

  it("filters by category", async () => {
    const result = await api.getProducts({ category: "cat-shoes" });
    expect(result.products.every((p) => p.category_id === "cat-shoes")).toBe(true);
  });

  it("searches by keyword", async () => {
    const result = await api.getProducts({ q: "Black" });
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products[0].name.toLowerCase()).toContain("black");
  });

  it("sorts by price ascending", async () => {
    const result = await api.getProducts({ sort: "price_asc" });
    for (let i = 1; i < result.products.length; i++) {
      expect(result.products[i].price).toBeGreaterThanOrEqual(
        result.products[i - 1].price
      );
    }
  });

  it("paginates results", async () => {
    const page1 = await api.getProducts({ page: 1, limit: 2 });
    expect(page1.products.length).toBeLessThanOrEqual(2);
    expect(page1.page).toBe(1);
  });
});
