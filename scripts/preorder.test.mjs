import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { onRequestPost as saveProduct } from '../functions/api/admin/products.js';
import { onRequestGet as listProducts } from '../functions/api/products.js';
import { onRequestGet as getProduct } from '../functions/api/products/[id].js';

test('pre-order products persist, filter before pagination, and stay out of the shop', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort()) {
      db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
    }
    const env = {
      ADMIN_PASSWORD: 'test-only',
      DB: { prepare(sql) {
        const statement = db.prepare(sql);
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() { return statement.get(...values) || null; },
          async all() { return { results: statement.all(...values) }; },
          async run() { return statement.run(...values); },
        };
      } },
    };
    db.exec("INSERT INTO categories VALUES ('test-category', 'Test', 'test', '[\"alpha\"]')");
    const product = {
      sku: 'PRE-1', name: 'Pre-order one', price: 10000, category_id: 'test-category',
      is_preorder: true, variants: [{ size_key: 'alpha:M', colorway: 'Black', stock_qty: 4 }],
    };
    const save = async (body) => saveProduct({ env, request: new Request('https://test/api/admin/products', {
      method: 'POST', headers: { Authorization: 'Bearer test-only', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }) });
    const list = async (query = '', admin = false) => {
      const response = await listProducts({ env, request: new Request(`https://test/api/products${query}`, {
        headers: admin ? { Authorization: 'Bearer test-only' } : {},
      }) });
      assert.equal(response.status, 200);
      return response.json();
    };
    const saved = await (await save(product)).json();
    await save({ ...product, sku: 'PRE-2', name: 'Pre-order two', price: 20000 });
    await save({ ...product, sku: 'REGULAR', is_preorder: false });
    await save({ ...product, sku: 'UPCOMING', is_preorder: false, is_upcoming: true });
    assert.equal((await save({ ...product, is_upcoming: true })).status, 400);
    const first = await list('?preorder=true&limit=1&sort=price_asc');
    assert.equal(first.total, 2);
    assert.equal(first.products.length, 1);
    assert.equal(first.products[0].id, saved.id);
    const second = await list('?preorder=true&limit=1&sort=price_asc&page=2');
    assert.notEqual(first.products[0].id, second.products[0].id);
    assert.equal((await list()).total, 1);
    assert.equal((await list('?preorder=true&q=two')).total, 1);
    assert.equal((await list('?preorder=true&upcoming=false', true)).total, 2);
    assert.equal((await list('?upcoming=true')).total, 1);
    const detail = await (await getProduct({ env, params: { id: saved.id } })).json();
    assert.equal(detail.is_preorder, 1);
    await save({ ...product, is_preorder: false });
    assert.equal((await list('?preorder=true')).total, 1);
    assert.equal((await list()).total, 2);
  } finally {
    db.close();
  }
});
