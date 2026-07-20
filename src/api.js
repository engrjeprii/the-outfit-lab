/**
 * Dual-mode API layer.
 *
 * - Local dev (`npm start`): in-memory mock API.
 * - Production builds (deployed to Cloudflare Pages): real backend via Pages Functions.
 * - Override: set REACT_APP_USE_REAL_API=true/false.
 */

import { formatPrice } from "./components/ProductCard";
import { displaySize } from "./components/SizeColorSelector";

const USE_REAL_API =
  process.env.REACT_APP_USE_REAL_API !== undefined
    ? process.env.REACT_APP_USE_REAL_API === "true"
    : process.env.NODE_ENV === "production";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OTL-${code}`;
}

function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOrderMessage(order) {
  const lines = order.items.map((item) => {
    const size = displaySize(item.size_key, item.gender);
    return `- ${item.name} (${size} / ${item.colorway}) x${item.quantity} — ${formatPrice(item.price * item.quantity)}`;
  });

  return [
    `Hi! I'd like to order ${order.id}`,
    "",
    ...lines,
    "",
    `Total: ${formatPrice(order.total)}`,
  ].join("\n");
}

function sizeKeyFromRow(row) {
  return Object.keys(row)
    .sort()
    .map((k) => `${k}:${row[k]}`)
    .join("|");
}

function normalizeSizeKey(sizeKeyOrRow) {
  let row;
  if (typeof sizeKeyOrRow === "string") {
    row = Object.fromEntries(sizeKeyOrRow.split("|").map((part) => part.split(":")));
  } else {
    row = sizeKeyOrRow || {};
  }
  const filtered = Object.fromEntries(
    Object.entries(row).filter(([k]) => k && k !== "gender" && k !== "stock")
  );
  return sizeKeyFromRow(filtered);
}

function isStalePending(createdAt) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  return Date.now() - created > 24 * 60 * 60 * 1000;
}

function maybeCancelStaleMockOrder(order) {
  if (!order || order.status !== "pending" || !isStalePending(order.created_at)) {
    return order;
  }

  for (const item of order.items) {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) continue;
    let variant = product.variants.find((v) => v.id === item.variant_id);
    if (!variant && item.size_key && item.colorway) {
      const gender = item.gender || "unisex";
      variant = product.variants.find(
        (v) => v.gender === gender && v.size_key === item.size_key && v.colorway === item.colorway
      );
    }
    if (variant) {
      variant.stock_qty += item.quantity || 1;
      if (variant.stock_qty > 0) variant.sold_out = 0;
    }
  }

  order.status = "cancelled";
  order.cancelled_at = new Date().toISOString();
  return order;
}

const placeholderImage = (text) =>
  `https://placehold.co/600x600/e5e5e5/111111?text=${encodeURIComponent(text)}`;

const MOCK_BRAND_POOLS = {
  "cat-shirts": ["Nike", "Adidas", "Champion", "Tommy Hilfiger", "Puma"],
  "cat-shorts": ["Nike", "Adidas", "Champion"],
  "cat-pants": ["Levi's", "Adidas", "Nike", "Champion"],
  "cat-shoes": ["Nike", "Converse", "Vans", "Adidas", "Puma"],
  "cat-caps": ["New Era", "Nike", "Adidas"],
};

const MOCK_PRODUCT_TEMPLATES = [
  { name: "Classic White Tee", category: "cat-shirts", price: 12000, colorways: ["White", "Black", "Beige"] },
  { name: "Relaxed Fit Hoodie", category: "cat-shirts", price: 28000, colorways: ["Black", "Gray", "Navy"] },
  { name: "Oversized Cotton T-Shirt", category: "cat-shirts", price: 14500, colorways: ["White", "Beige", "Olive"] },
  { name: "Striped Long Sleeve Tee", category: "cat-shirts", price: 16500, colorways: ["Navy/White", "Black/White"] },
  { name: "Ribbed Tank Top", category: "cat-shirts", price: 8500, colorways: ["White", "Black", "Gray"] },
  { name: "Henley Shirt", category: "cat-shirts", price: 19500, colorways: ["Navy", "Olive", "White"] },
  { name: "Polo Shirt", category: "cat-shirts", price: 22000, colorways: ["White", "Navy", "Beige"] },
  { name: "Flannel Shirt", category: "cat-shirts", price: 26000, colorways: ["Red/Black", "Blue/Gray"] },
  { name: "Bomber Jacket", category: "cat-shirts", price: 52000, colorways: ["Black", "Olive", "Navy"] },
  { name: "Denim Jacket", category: "cat-shirts", price: 45000, colorways: ["Blue", "Black"] },
  { name: "Windbreaker", category: "cat-shirts", price: 38000, colorways: ["Black", "Gray", "Navy"] },
  { name: "Beach Shorts", category: "cat-shorts", price: 18000, colorways: ["Navy", "Olive", "Beige"] },
  { name: "Chino Shorts", category: "cat-shorts", price: 21000, colorways: ["Khaki", "Navy", "Olive"] },
  { name: "Athletic Shorts", category: "cat-shorts", price: 16000, colorways: ["Black", "Gray"] },
  { name: "Pleated Trousers", category: "cat-pants", price: 32000, colorways: ["Black", "Beige", "Gray"] },
  { name: "Cargo Pants", category: "cat-pants", price: 29000, colorways: ["Olive", "Black", "Khaki"] },
  { name: "Slim Fit Jeans", category: "cat-pants", price: 34000, colorways: ["Blue", "Black", "Gray"] },
  { name: "Drawstring Joggers", category: "cat-pants", price: 24000, colorways: ["Black", "Gray", "Navy"] },
  { name: "Linen Trousers", category: "cat-pants", price: 31000, colorways: ["Beige", "White", "Olive"] },
  { name: "Black Running Shoes", category: "cat-shoes", price: 350000, colorways: ["Black", "White"] },
  { name: "Leather Sneakers", category: "cat-shoes", price: 420000, colorways: ["White", "Black", "Tan"] },
  { name: "Canvas Loafers", category: "cat-shoes", price: 280000, colorways: ["Navy", "Beige", "Black"] },
  { name: "Hiking Boots", category: "cat-shoes", price: 480000, colorways: ["Brown", "Black"] },
  { name: "Slip-On Sandals", category: "cat-shoes", price: 150000, colorways: ["Black", "Brown", "Beige"] },
  { name: "High Top Sneakers", category: "cat-shoes", price: 390000, colorways: ["White", "Black"] },
  { name: "Dad Cap", category: "cat-caps", price: 9500, colorways: ["Black", "Beige", "Navy"] },
  { name: "Bucket Hat", category: "cat-caps", price: 8500, colorways: ["Beige", "Black"] },
  { name: "Beanie", category: "cat-caps", price: 6500, colorways: ["Black", "Gray", "Navy", "Beige"] },
  { name: "Trucker Cap", category: "cat-caps", price: 7500, colorways: ["Black", "White", "Navy"] },
  { name: "Tote Bag", category: "cat-caps", price: 12500, colorways: ["Beige", "Black"] },
  { name: "Crossbody Bag", category: "cat-caps", price: 18500, colorways: ["Black", "Brown"] },
  { name: "Leather Belt", category: "cat-caps", price: 14500, colorways: ["Black", "Brown", "Tan"] },
  { name: "Crew Socks 3-Pack", category: "cat-caps", price: 5500, colorways: ["White", "Black", "Gray"] },
  { name: "Sun Glasses", category: "cat-caps", price: 22000, colorways: ["Black", "Tortoise", "Gold"] },
  { name: "Canvas Backpack", category: "cat-caps", price: 32000, colorways: ["Olive", "Black", "Beige"] },
  { name: "Wool Scarf", category: "cat-caps", price: 16500, colorways: ["Gray", "Navy", "Beige"] },
  { name: "Leather Wallet", category: "cat-caps", price: 12500, colorways: ["Black", "Brown"] },
  { name: "Sport Watch", category: "cat-caps", price: 45000, colorways: ["Black", "Silver", "Gold"] },
  { name: "Bracelet", category: "cat-caps", price: 8500, colorways: ["Silver", "Gold"] },
  { name: "Phone Case", category: "cat-caps", price: 6500, colorways: ["Black", "Clear", "Beige"] },
  { name: "Keychain", category: "cat-caps", price: 3500, colorways: ["Black", "Brown", "Tan"] },
  { name: "Notebook", category: "cat-caps", price: 4500, colorways: ["Black", "Navy"] },
  { name: "Water Bottle", category: "cat-caps", price: 9500, colorways: ["Black", "White", "Olive"] },
  { name: "Umbrella", category: "cat-caps", price: 11500, colorways: ["Black", "Navy"] },
  { name: "Travel Pouch", category: "cat-caps", price: 8500, colorways: ["Black", "Beige"] },
  { name: "Cardholder", category: "cat-caps", price: 5500, colorways: ["Black", "Brown", "Tan"] },
  { name: "Face Mask 3-Pack", category: "cat-caps", price: 4500, colorways: ["Black", "Gray", "Navy"] },
  { name: "Laptop Sleeve", category: "cat-caps", price: 18500, colorways: ["Black", "Gray", "Beige"] },
  { name: "Weekender Bag", category: "cat-caps", price: 65000, colorways: ["Black", "Olive", "Tan"] },
];

const MOCK_GENDERS = ["men", "women", "unisex"];

function sizeChartFor(categoryId) {
  switch (categoryId) {
    case "cat-shirts":
      return [{ alpha: "S" }, { alpha: "M" }, { alpha: "L" }, { alpha: "XL" }];
    case "cat-shorts":
    case "cat-pants":
      return [{ waist: "30", length: "8" }, { waist: "32", length: "8" }, { waist: "34", length: "8" }];
    case "cat-shoes":
      return [{ us: "8", uk: "7" }, { us: "9", uk: "8" }, { us: "10", uk: "9" }];
    case "cat-caps":
    default:
      return [{ one_size: "OS" }];
  }
}

function generateMockProducts() {
  const products = [];
  MOCK_PRODUCT_TEMPLATES.forEach((template, idx) => {
    const baseId = `prod-${idx.toString().padStart(3, "0")}`;
    const brandPool = MOCK_BRAND_POOLS[template.category] || ["Nike"];
    const brand = brandPool[idx % brandPool.length];
    const gender = MOCK_GENDERS[idx % MOCK_GENDERS.length];
    const sizeChart = sizeChartFor(template.category);
    const variants = [];
    template.colorways.forEach((color, cIdx) => {
      sizeChart.forEach((row, sIdx) => {
        const sizeKey = sizeKeyFromRow(row);
        variants.push({
          id: `var-${idx}-${cIdx}-${sIdx}`,
          product_id: baseId,
          size_key: sizeKey,
          colorway: color,
          gender,
          stock_qty: Math.floor(Math.random() * 15),
          sold_out: Math.random() < 0.1 ? 1 : 0,
        });
      });
    });

    products.push({
      id: baseId,
      category_id: template.category,
      brand,
      gender,
      sku: `${brand.toUpperCase().replace(/[^a-z0-9]/gi, "")}-${template.name.toUpperCase().replace(/\s+/g, "-")}`,
      name: template.name,
      description: `Premium ${template.name.toLowerCase()} designed for everyday comfort and timeless style.`,
      price: template.price,
      retail_price: template.retail_price || 0,
      images: [
        placeholderImage(template.name),
        placeholderImage(`${template.name} Back`),
      ],
      details: {
        material: "Premium materials",
        fit: "True to size",
        care: "Machine wash cold",
      },
      size_chart: sizeChart,
      created_at: new Date(Date.now() - idx * 86400000).toISOString(),
      variants,
    });
  });
  return products;
}

function generateMockOrders() {
  const mockOrders = {};
  const statuses = ["pending", "confirmed", "confirmed", "pending", "confirmed", "cancelled", "pending", "confirmed"];
  const now = new Date();

  for (let i = 0; i < 25; i++) {
    const orderItems = [];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const variant = product.variants[Math.floor(Math.random() * product.variants.length)];
      orderItems.push({
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        price: product.price,
        size_key: variant.size_key,
        colorway: variant.colorway,
        gender: variant.gender || product.gender || "unisex",
        quantity: Math.floor(Math.random() * 2) + 1,
      });
    }

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const date = new Date(now);
    date.setHours(date.getHours() - i * 3);

    let code;
    do {
      code = generateOrderCode();
    } while (mockOrders[code]);

    mockOrders[code] = {
      id: code,
      status: statuses[i % statuses.length],
      shipping_status: statuses[i % statuses.length] === "confirmed" ? "pending" : null,
      tracking_number: null,
      cancelled_at: null,
      items: orderItems,
      total,
      source: "messenger",
      created_at: date.toISOString(),
    };
  }

  return mockOrders;
}

let categories = [
  { id: "cat-shirts", name: "Shirts", slug: "shirts", size_schema: ["alpha"] },
  { id: "cat-shorts", name: "Shorts", slug: "shorts", size_schema: ["waist", "length"] },
  { id: "cat-pants", name: "Pants", slug: "pants", size_schema: ["waist", "length"] },
  { id: "cat-shoes", name: "Shoes", slug: "shoes", size_schema: ["us", "uk"] },
  { id: "cat-caps", name: "Caps", slug: "caps", size_schema: ["one_size"] },
];

let products = generateMockProducts();
let orders = generateMockOrders();

const ADMIN_PASSWORD = "admin";

const mockApi = {
  isAdminToken: (token) => token === ADMIN_PASSWORD,

  getCategories: async () => {
    await delay();
    return categories.map((c) => ({ ...c, size_schema: [...c.size_schema] }));
  },

  getBrands: async () => {
    await delay();
    const brands = [...new Set(products.filter((p) => !p.deleted_at).map((p) => p.brand))];
    return brands.sort();
  },

  getBrandSummaries: async () => {
    await delay();
    const map = new Map();
    products
      .filter((p) => !p.deleted_at)
      .forEach((p) => {
        const existing = map.get(p.brand);
        if (!existing) {
          map.set(p.brand, { name: p.brand, count: 1, image: p.images[0] });
        } else {
          existing.count += 1;
        }
      });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  getFilters: async (options = {}) => {
    await delay();
    let list = products.filter((p) => !p.deleted_at);
    if (options.category) {
      list = list.filter((p) => p.category_id === options.category);
    }
    const colorways = [...new Set(list.flatMap((p) => p.variants.map((v) => v.colorway)))]
      .filter(Boolean)
      .sort();
    const sizes = [...new Set(list.flatMap((p) => p.variants.map((v) => v.size_key)))]
      .filter(Boolean)
      .sort();
    return { colorways, sizes };
  },

  getProducts: async (options = {}) => {
    await delay();
    const {
      category,
      brand,
      gender,
      q,
      minPrice,
      maxPrice,
      size,
      colorway,
      sort = "newest",
      page = 1,
      limit = 24,
    } = options;

    const isAdmin = mockApi.isAdminToken(localStorage.getItem("admin-token") || "");

    let list = products
      .filter((p) => !p.deleted_at)
      .map((p) => {
        const inStockGenders = [
          ...new Set(
            p.variants
              .filter((v) => !v.sold_out && v.stock_qty > 0)
              .map((v) => v.gender || "unisex")
          ),
        ];
        return {
          ...p,
          images: [...p.images],
          videos: [...(p.videos || [])],
          details: { ...p.details },
          size_chart: p.size_chart.map((row) => ({ ...row })),
          variants: isAdmin ? p.variants.map((v) => ({ ...v })) : undefined,
          total_stock: p.variants.reduce((sum, v) => sum + (v.stock_qty || 0), 0),
          variant_count: p.variants.length,
          available_genders: inStockGenders.length > 0 ? inStockGenders : [p.gender || "unisex"],
        };
      });

    if (category) {
      list = list.filter((p) => p.category_id === category);
    }

    if (brand) {
      list = list.filter((p) => p.brand === brand);
    }

    if (gender) {
      list = list.filter((p) => p.available_genders.includes(gender));
    }

    if (minPrice !== undefined && minPrice !== "") {
      const min = parseInt(minPrice, 10);
      if (!Number.isNaN(min)) {
        list = list.filter((p) => p.price >= min);
      }
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      const max = parseInt(maxPrice, 10);
      if (!Number.isNaN(max)) {
        list = list.filter((p) => p.price <= max);
      }
    }

    if (q) {
      const term = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          (p.description || "").toLowerCase().includes(term)
      );
    }

    if (size) {
      list = list.filter((p) =>
        products
          .find((prod) => prod.id === p.id)
          ?.variants.some((v) => v.size_key.includes(size))
      );
    }

    if (colorway) {
      list = list.filter((p) =>
        products
          .find((prod) => prod.id === p.id)
          ?.variants.some((v) => v.colorway === colorway)
      );
    }

    list.sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "stock_asc":
          return a.total_stock - b.total_stock;
        case "stock_desc":
          return b.total_stock - a.total_stock;
        case "newest":
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    const total = list.length;
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(limit, 10) || 24), 100);
    const offset = (currentPage - 1) * pageSize;
    const paginated = list.slice(offset, offset + pageSize);

    return { products: paginated, total, page: currentPage, limit: pageSize };
  },

  getProduct: async (id) => {
    await delay();
    const p = products.find((p) => p.id === id && !p.deleted_at);
    if (!p) throw new Error("Product not found");
    return {
      ...p,
      images: [...p.images],
      videos: [...(p.videos || [])],
      details: { ...p.details },
      size_chart: p.size_chart.map((row) => ({ ...row })),
      variants: p.variants.map((v) => ({ ...v })),
    };
  },

  createOrder: async (items) => {
    await delay();
    const total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    let code;
    do {
      code = generateOrderCode();
    } while (orders[code]);

    const order = {
      id: code,
      status: "pending",
      items: items.map((i) => ({ ...i })),
      total,
      source: "messenger",
      created_at: new Date().toISOString(),
    };
    orders[code] = order;
    return { ...order, message: buildOrderMessage(order) };
  },

  getProductReviews: async () => {
    await delay();
    return { reviews: [], summary: { count: 0, average: 0 } };
  },

  submitReview: async (productId, review) => {
    await delay();
    return {
      id: generateId(),
      product_id: productId,
      rating: review.rating,
      status: "pending",
      created_at: new Date().toISOString(),
    };
  },

  getReviews: async () => {
    await delay();
    return { reviews: [], summary: { count: 0, average: 0 } };
  },

  submitShopReview: async (review) => {
    await delay();
    return {
      id: generateId(),
      rating: review.rating,
      status: "pending",
      created_at: new Date().toISOString(),
    };
  },

  getOrder: async (id) => {
    await delay();
    const order = orders[id];
    if (!order) throw new Error("Order not found");
    maybeCancelStaleMockOrder(order);
    return { ...order, items: order.items.map((i) => ({ ...i })) };
  },

  listOrders: async () => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    return Object.values(orders)
      .map((o) => {
        maybeCancelStaleMockOrder(o);
        return {
          id: o.id,
          status: o.status,
          shipping_status: o.shipping_status,
          tracking_number: o.tracking_number,
          total: o.total,
          created_at: o.created_at,
          item_count: o.items.reduce((sum, i) => sum + (i.quantity || 1), 0),
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getReports: async (range = "30d") => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }

    const now = new Date();
    const cutoff =
      range === "today"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : range === "7d"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : range === "30d"
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : null;

    const filtered = Object.values(orders).filter((o) => {
      if (!cutoff) return true;
      return new Date(o.created_at) >= cutoff;
    });

    const orderSummary = filtered.reduce(
      (acc, o) => {
        acc.total += 1;
        if (o.status === "pending") acc.pending += 1;
        if (o.status === "confirmed") {
          acc.confirmed += 1;
          acc.revenue += o.total;
        }
        if (o.status === "cancelled") acc.cancelled += 1;
        return acc;
      },
      { total: 0, pending: 0, confirmed: 0, cancelled: 0, revenue: 0 }
    );

    const shipping = filtered
      .filter((o) => o.status === "confirmed" && o.shipping_status)
      .reduce(
        (acc, o) => {
          acc[o.shipping_status] = (acc[o.shipping_status] || 0) + 1;
          return acc;
        },
        { pending: 0, packed: 0, shipped: 0, delivered: 0, pickup: 0 }
      );

    const inventory = products.reduce(
      (acc, p) => {
        acc.total_products += 1;
        for (const v of p.variants || []) {
          if (v.stock_qty <= 5 && v.stock_qty > 0) acc.low_stock += 1;
          if (v.stock_qty === 0 || v.sold_out) acc.out_of_stock += 1;
        }
        return acc;
      },
      { total_products: 0, low_stock: 0, out_of_stock: 0 }
    );

    return { orders: orderSummary, shipping, inventory, range };
  },

  adminLogin: async ({ password }) => {
    await delay();
    if (password !== ADMIN_PASSWORD) throw new Error("Invalid password");
    localStorage.setItem("admin-token", ADMIN_PASSWORD);
    return { token: ADMIN_PASSWORD };
  },

  createCategory: async (category) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    const id = generateId();
    const slug = category.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const created = { id, name: category.name, slug, size_schema: [...category.size_schema] };
    categories.push(created);
    return created;
  },

  updateCategory: async (id, category) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    const existing = categories.find((c) => c.id === id);
    if (!existing) throw new Error("Category not found");
    const slug = category.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    existing.name = category.name;
    existing.slug = slug;
    existing.size_schema = [...category.size_schema];
    return existing;
  },

  saveProduct: async (product) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    const now = new Date().toISOString();

    // Normalize incoming variants and merge duplicates by gender + size_key + colorway.
    const incomingVariants = (product.variants || [])
      .map((v) => ({
        ...v,
        size_key: normalizeSizeKey(v.size_key || v.size_row || {}),
        colorway: v.colorway,
        gender: v.gender || "unisex",
      }))
      .filter((v) => v.size_key && v.colorway);

    const mergedMap = new Map();
    for (const v of incomingVariants) {
      const key = `${v.gender}::${v.size_key}::${v.colorway}`;
      const existing = mergedMap.get(key);
      if (existing) {
        existing.stock_qty = (existing.stock_qty ?? 0) + (v.stock_qty ?? 0);
        if (!v.sold_out) existing.sold_out = false;
      } else {
        mergedMap.set(key, { ...v });
      }
    }
    const mergedVariants = Array.from(mergedMap.values());

    let existing = products.find((p) => p.sku === product.sku);
    if (existing) {
      existing.category_id = product.category_id;
      existing.brand = product.brand || existing.brand;
      existing.gender = product.gender || existing.gender;
      existing.name = product.name;
      existing.description = product.description;
      existing.price = product.price;
      existing.retail_price = product.retail_price || 0;
      existing.images = [...product.images];
      existing.videos = [...(product.videos || [])];
      existing.details = { ...product.details };
      existing.size_chart = product.size_chart.map((row) => ({ ...row }));

      // Preserve existing variant IDs for matching gender + size_key + colorway.
      const existingVariantIds = new Map(
        existing.variants.map((v) => [
          `${v.gender || "unisex"}::${normalizeSizeKey(v.size_key)}::${v.colorway}`,
          v.id,
        ])
      );
      existing.variants = mergedVariants.map((v) => ({
        id:
          existingVariantIds.get(`${v.gender}::${v.size_key}::${v.colorway}`) ||
          v.id ||
          generateId(),
        product_id: existing.id,
        size_key: v.size_key,
        colorway: v.colorway,
        gender: v.gender,
        stock_qty: v.stock_qty ?? 0,
        sold_out: v.sold_out ? 1 : 0,
      }));
      return { id: existing.id, sku: existing.sku, name: existing.name, updated: true };
    }

    const id = generateId();
    const variants = mergedVariants.map((v) => ({
      id: v.id || generateId(),
      product_id: id,
      size_key: v.size_key,
      colorway: v.colorway,
      gender: v.gender,
      stock_qty: v.stock_qty ?? 0,
      sold_out: v.sold_out ? 1 : 0,
    }));
    const created = {
      id,
      category_id: product.category_id,
      brand: product.brand || "",
      gender: product.gender || "unisex",
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price,
      retail_price: product.retail_price || 0,
      images: [...product.images],
      videos: [...(product.videos || [])],
      details: { ...product.details },
      size_chart: product.size_chart.map((row) => ({ ...row })),
      created_at: now,
      variants,
    };
    products.push(created);
    return { id, sku: created.sku, name: created.name, created: true };
  },

  deleteProduct: async (id) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    const product = products.find((p) => p.id === id);
    if (!product) throw new Error("Product not found");
    product.deleted_at = new Date().toISOString();
    return { deleted: true };
  },

  confirmOrder: async (id) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    const order = orders[id];
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") throw new Error("Order is not pending");

    for (const item of order.items) {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) throw new Error(`Product not found: ${item.name}`);
      let variant = product.variants.find((v) => v.id === item.variant_id);
      if (!variant && item.size_key && item.colorway) {
        const gender = item.gender || "unisex";
        variant = product.variants.find(
          (v) => v.gender === gender && v.size_key === item.size_key && v.colorway === item.colorway
        );
      }
      if (!variant) throw new Error(`Variant not found: ${item.name}`);
      if (variant.sold_out || variant.stock_qty < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
      variant.stock_qty -= item.quantity;
      if (variant.stock_qty <= 0) variant.sold_out = 1;
    }

    order.status = "confirmed";
    order.shipping_status = "pending";
    order.tracking_number = null;
    return { id, status: "confirmed", shipping_status: "pending" };
  },

  updateOrderStatus: async (id, { shipping_status, tracking_number }) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    const order = orders[id];
    if (!order) throw new Error("Order not found");
    if (order.status !== "confirmed") throw new Error("Order must be confirmed");
    order.shipping_status = shipping_status;
    order.tracking_number = tracking_number || null;
    return { id, shipping_status, tracking_number: order.tracking_number };
  },

  listReviews: async (status = "pending") => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    return { reviews: [], counts: { pending: 0, approved: 0, rejected: 0 } };
  },

  updateReviewStatus: async (id, status) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    return { id, status };
  },

  deleteReview: async (id) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    return { id, deleted: true };
  },

  uploadImage: async (file) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    return { url: placeholderImage(file.name || "Image"), key: generateId() };
  },

  uploadVideo: async (file) => {
    await delay();
    if (!mockApi.isAdminToken(localStorage.getItem("admin-token") || "")) {
      throw new Error("Unauthorized");
    }
    return { url: placeholderImage(file.name || "Video"), key: generateId() };
  },
};

// ============================================================================
// Real API: fetch wrappers for Cloudflare Pages Functions
// ============================================================================

function getAdminToken() {
  return localStorage.getItem("admin-token") || "";
}

function setAdminToken(token) {
  localStorage.setItem("admin-token", token);
}

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path, options = {}) {
  const url = `/api${path}`;
  const headers = {
    Accept: "application/json",
    ...authHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

const realApi = {
  isAdminToken: (token) => !!token && token === getAdminToken(),

  getCategories: async () => {
    return apiRequest("/categories");
  },

  getBrands: async () => {
    const brands = await apiRequest("/brands");
    return brands.map((b) => b.name).sort();
  },

  getBrandSummaries: async () => {
    return apiRequest("/brands");
  },

  getFilters: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.category) params.set("category", options.category);
    const query = params.toString();
    return apiRequest(`/filters${query ? `?${query}` : ""}`);
  },

  getProducts: async (options = {}) => {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        params.set(key, String(value));
      }
    });
    const query = params.toString();
    return apiRequest(`/products${query ? `?${query}` : ""}`);
  },

  getProduct: async (id) => {
    return apiRequest(`/products/${encodeURIComponent(id)}`);
  },

  createOrder: async (items) => {
    const order = await apiRequest("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    return { ...order, message: buildOrderMessage(order) };
  },

  getOrder: async (id) => {
    return apiRequest(`/orders/${encodeURIComponent(id)}`);
  },

  listOrders: async () => {
    return apiRequest("/admin/orders");
  },

  getReports: async (range = "30d") => {
    const params = new URLSearchParams();
    params.set("range", range);
    return apiRequest(`/admin/reports?${params.toString()}`);
  },

  adminLogin: async ({ password }) => {
    const data = await apiRequest("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (data.token) {
      setAdminToken(data.token);
    }
    return data;
  },

  createCategory: async (category) => {
    return apiRequest("/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    });
  },

  updateCategory: async (id, category) => {
    // Backend currently only supports create; treat update as create with same id.
    return apiRequest("/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...category, id }),
    });
  },

  saveProduct: async (product) => {
    return apiRequest("/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
  },

  deleteProduct: async (id) => {
    return apiRequest(`/admin/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  confirmOrder: async (id) => {
    return apiRequest(`/admin/orders/${encodeURIComponent(id)}/confirm`, {
      method: "POST",
    });
  },

  updateOrderStatus: async (id, { shipping_status, tracking_number }) => {
    return apiRequest(`/admin/orders/${encodeURIComponent(id)}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipping_status, tracking_number }),
    });
  },

  getProductReviews: async (id) => {
    return apiRequest(`/products/${encodeURIComponent(id)}/reviews`);
  },

  submitReview: async (id, review) => {
    return apiRequest(`/products/${encodeURIComponent(id)}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    });
  },

  getReviews: async () => {
    return apiRequest("/reviews");
  },

  submitShopReview: async (review) => {
    return apiRequest("/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    });
  },

  listReviews: async (status = "pending") => {
    return apiRequest(`/admin/reviews?status=${encodeURIComponent(status)}`);
  },

  updateReviewStatus: async (id, status) => {
    return apiRequest("/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  },

  deleteReview: async (id) => {
    return apiRequest(`/admin/reviews?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return apiRequest("/admin/upload", {
      method: "POST",
      body: formData,
    });
  },

  uploadVideo: async (file) => {
    const formData = new FormData();
    formData.append("video", file);
    return apiRequest("/admin/upload", {
      method: "POST",
      body: formData,
    });
  },
};

export const api = USE_REAL_API ? realApi : mockApi;
