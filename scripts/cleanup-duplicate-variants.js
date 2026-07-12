const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function sizeKeyFromRow(row) {
  return Object.keys(row)
    .sort()
    .map((k) => `${k}:${row[k]}`)
    .join("|");
}

function normalizeSizeKey(sizeKey) {
  if (!sizeKey) return "";
  const parts = sizeKey.split("|").filter((part) => {
    const [k] = part.split(":");
    return k && k !== "gender" && k !== "stock";
  });
  return sizeKeyFromRow(Object.fromEntries(parts.map((part) => part.split(":"))));
}

console.log("Fetching variants from D1...");
const result = execSync(
  'npx wrangler d1 execute the-outfit-lab-db --command "SELECT id, product_id, gender, size_key, colorway, stock_qty, sold_out FROM variants" --json',
  { encoding: "utf-8", cwd: process.cwd() }
);

let data;
try {
  data = JSON.parse(result);
} catch (e) {
  console.error("Failed to parse wrangler output:", result);
  process.exit(1);
}

const rows = Array.isArray(data) && data.length > 0 && data[0].results ? data[0].results : [];
if (!Array.isArray(rows) || rows.length === 0) {
  console.log("No variants found.");
  process.exit(0);
}

const groups = new Map();
for (const row of rows) {
  const normalized = normalizeSizeKey(row.size_key);
  const key = `${row.product_id}::${row.gender || "unisex"}::${normalized}::${row.colorway}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const updates = [];
let mergeCount = 0;
for (const [key, variants] of groups.entries()) {
  if (variants.length <= 1) continue;
  mergeCount++;
  variants.sort((a, b) => (a.id < b.id ? -1 : 1));
  const keeper = variants[0];
  const totalStock = variants.reduce((sum, v) => sum + (v.stock_qty || 0), 0);
  const allSoldOut = variants.every((v) => v.sold_out);
  updates.push(
    `UPDATE variants SET stock_qty = ${totalStock}, sold_out = ${allSoldOut ? 1 : 0} WHERE id = '${keeper.id}';`
  );
  for (let i = 1; i < variants.length; i++) {
    updates.push(
      `UPDATE variants SET stock_qty = 0, sold_out = 1 WHERE id = '${variants[i].id}';`
    );
  }
}

if (updates.length === 0) {
  console.log("No duplicate variants found.");
  process.exit(0);
}

console.log(`Found ${mergeCount} duplicate groups. Merging ${updates.length} update statements...`);
const sqlFile = path.join(process.cwd(), "scripts", "cleanup-duplicate-variants.sql");
fs.writeFileSync(sqlFile, updates.join("\n"));
console.log(`Wrote ${sqlFile}`);

const execResult = execSync(
  `npx wrangler d1 execute the-outfit-lab-db --file ${sqlFile}`,
  { encoding: "utf-8", cwd: process.cwd() }
);
console.log(execResult);
console.log("Cleanup complete.");
