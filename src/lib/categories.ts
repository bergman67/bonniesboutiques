export type AssignableProductCategory =
  | 'Beaded Pens'
  | 'Keychains'
  | 'Charms & Bookmarks'
  | 'Diamond Art'
  | 'Accessories';

export type ProductCategory = 'All' | AssignableProductCategory;

export const PRODUCT_CATEGORIES: readonly AssignableProductCategory[] = [
  'Beaded Pens',
  'Keychains',
  'Charms & Bookmarks',
  'Diamond Art',
  'Accessories',
] as const;

export const CATEGORIES: readonly ProductCategory[] = [
  'All',
  'Beaded Pens',
  'Keychains',
  'Charms & Bookmarks',
  'Diamond Art',
  'Accessories',
] as const;

const CATEGORY_TAG_REGEX = /\s*\[Category:\s*([^\]]+)\]\s*$/i;

/**
 * Removes any trailing [Category: ...] metadata tag from a product description for display.
 */
export function stripCategoryTag(description?: string | null): string {
  if (!description) return '';
  return description.replace(CATEGORY_TAG_REGEX, '').trim();
}

/**
 * Ensures that if a user explicitly selected a category in Admin, it is preserved
 * deterministically when reading back via getProductCategory(title, description).
 */
export function applyCategoryTag(
  title: string,
  description: string | null | undefined,
  category?: ProductCategory | string | null
): string {
  const cleanDesc = stripCategoryTag(description);
  if (!category || category === 'All') {
    return cleanDesc;
  }
  const normalizedTarget = PRODUCT_CATEGORIES.find(
    (c) => c.toLowerCase() === category.trim().toLowerCase()
  );
  if (!normalizedTarget) {
    return cleanDesc;
  }
  const inferred = getProductCategory(title, cleanDesc);
  if (inferred === normalizedTarget) {
    return cleanDesc;
  }
  return `${cleanDesc} [Category: ${normalizedTarget}]`.trim();
}

/**
 * Deterministically maps product title and description to one of the 5 boutique categories:
 * - 'Diamond Art': framed diamond art, diamond paintings, canvas art
 * - 'Accessories': bracelets, wristlets, pen & keychain sets, boutique accessories
 * - 'Beaded Pens': contains "pen"
 * - 'Keychains': contains "keychain", "loop", "fob"
 * - 'Charms & Bookmarks': contains "bookmark", "charm", "tassel"
 */
export function getProductCategory(
  title: string,
  description?: string | null
): AssignableProductCategory {
  // 0. Check explicit [Category: ...] override tag first
  if (description) {
    const tagMatch = description.match(CATEGORY_TAG_REGEX);
    if (tagMatch && tagMatch[1]) {
      const matched = PRODUCT_CATEGORIES.find(
        (c) => c.toLowerCase() === tagMatch[1].trim().toLowerCase()
      );
      if (matched) {
        return matched;
      }
    }
  }

  const titleLower = (title ?? '').toLowerCase();
  const fullLower = `${title ?? ''} ${stripCategoryTag(description)}`.toLowerCase();

  // 1. Diamond Art takes precedence for framed diamond art & diamond paintings
  if (
    fullLower.includes('diamond art') ||
    fullLower.includes('framed art') ||
    fullLower.includes('diamond painting') ||
    fullLower.includes('framed diamond')
  ) {
    return 'Diamond Art';
  }

  // 2. Accessories (bracelets, wristlets, pen/keychain sets, wearable accessories)
  if (
    titleLower.includes('bracelet') ||
    titleLower.includes('bracelelt') ||
    titleLower.includes('wristlet') ||
    titleLower.includes('wrislet') ||
    titleLower.includes('accessory') ||
    titleLower.includes('accessories') ||
    titleLower.includes('bangle') ||
    titleLower.includes('anklet') ||
    titleLower.includes('necklace') ||
    titleLower.includes('earring') ||
    titleLower.includes('lanyard') ||
    /\bset\b/.test(titleLower)
  ) {
    return 'Accessories';
  }

  // 3. Beaded Pens (contains 'pen')
  if (fullLower.includes('pen')) {
    return 'Beaded Pens';
  }

  // 4. Keychains (contains 'keychain', 'wristlet', 'loop', 'fob')
  if (
    fullLower.includes('keychain') ||
    fullLower.includes('wristlet') ||
    fullLower.includes('loop') ||
    fullLower.includes('fob')
  ) {
    return 'Keychains';
  }

  // 5. Charms & Bookmarks (contains 'bookmark', 'charm', 'tassel')
  if (
    fullLower.includes('bookmark') ||
    fullLower.includes('charm') ||
    fullLower.includes('tassel')
  ) {
    return 'Charms & Bookmarks';
  }

  // Fallback to Keychains
  return 'Keychains';
}

/**
 * Calculates live product counts for each category pill:
 * All, Beaded Pens, Keychains, Charms & Bookmarks, Diamond Art, Accessories.
 */
export function getCategoryCounts(
  products: Array<{ title: string; description?: string | null }>
): Record<ProductCategory, number> {
  const counts: Record<ProductCategory, number> = {
    'All': products.length,
    'Beaded Pens': 0,
    'Keychains': 0,
    'Charms & Bookmarks': 0,
    'Diamond Art': 0,
    'Accessories': 0,
  };

  for (const product of products) {
    const category = getProductCategory(product.title, product.description);
    counts[category]++;
  }

  return counts;
}
