/**
 * Product validation and normalization.
 */

export function normalizeId(id) {
  return String(id ?? "").trim();
}

/**
 * @param {object} input
 * @param {Set<string>} [existingIds] — all used IDs; for edit, omit current id or use ignoreIdForDuplicate
 * @param {string} [ignoreIdForDuplicate] — when editing, the old id is not treated as a conflict
 */
export function normalizeProduct(input, existingIds = new Set(), ignoreIdForDuplicate = null) {
  const id = normalizeId(input.id);
  const name = String(input.name ?? "").trim();
  const category = String(input.category ?? "").trim();
  const costPrice = Number(input.costPrice);
  const sellingPrice = Number(input.sellingPrice);
  const stockNum = Number(input.stockQty);

  const dupSet = new Set(existingIds);
  if (ignoreIdForDuplicate) dupSet.delete(ignoreIdForDuplicate);

  const errors = validateFields({
    id,
    name,
    category,
    costPrice,
    sellingPrice,
    stockNum,
    existingIds: dupSet,
  });

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    product: {
      id,
      name,
      category,
      costPrice: roundMoney(costPrice),
      sellingPrice: roundMoney(sellingPrice),
      stockQty: stockNum,
    },
  };
}

function validateFields({
  id,
  name,
  category,
  costPrice,
  sellingPrice,
  stockNum,
  existingIds,
}) {
  const errors = [];
  if (!id) errors.push("Product ID (barcode/SKU) is required.");
  if (existingIds.has(id)) errors.push("This ID is already in use.");
  if (!name) errors.push("Name is required.");
  if (!category) errors.push("Category is required.");
  if (!Number.isFinite(costPrice) || costPrice < 0)
    errors.push("Cost price must be zero or greater.");
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0)
    errors.push("Selling price must be zero or greater.");
  if (!Number.isFinite(stockNum) || stockNum < 0 || !Number.isInteger(stockNum))
    errors.push("Stock quantity must be a whole number ≥ 0.");
  return errors;
}

export function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

export function productMatchesQuery(product, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  const id = normalizeId(product.id).toLowerCase();
  const name = String(product.name ?? "").toLowerCase();
  return name.includes(q) || id.includes(q);
}
