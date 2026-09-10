import { api } from "../api";

// Test-only setup: exercise pre-orders without adding them to the app's sample catalog.
export async function preparePreorders() {
  const result = await api.getProducts({ preorder: false, limit: 2 });
  const originals = await Promise.all(result.products.map((product) => api.getProduct(product.id)));
  const previousToken = localStorage.getItem("admin-token");
  const save = async (products) => {
    await api.adminLogin({ password: "admin" });
    try {
      for (const product of products) await api.saveProduct(product);
    } finally {
      if (previousToken === null) localStorage.removeItem("admin-token");
      else localStorage.setItem("admin-token", previousToken);
    }
  };
  await save(originals.map((product) => ({ ...product, is_preorder: true })));
  return () => save(originals);
}
