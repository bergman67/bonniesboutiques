export interface CouponDefinition {
  code: string;
  percentOff: number;
  label: string;
  description: string;
}

export const PROMO_COUPONS: Record<string, CouponDefinition> = {
  BONNIE10: {
    code: 'BONNIE10',
    percentOff: 10,
    label: "Grandma Bonnie's 10% Gift",
    description: '10% off your handcrafted order',
  },
  SHORTS10: {
    code: 'SHORTS10',
    percentOff: 10,
    label: 'Trinket Tales Video 10% Off',
    description: '10% off from Bonnie & Tammy video showcase',
  },
  WELCOME10: {
    code: 'WELCOME10',
    percentOff: 10,
    label: 'Welcome 10% First-Order Gift',
    description: '10% off your first boutique keepsake order',
  },
  RECOVER10: {
    code: 'RECOVER10',
    percentOff: 10,
    label: '10% Cart Courtesy Offer',
    description: '10% off reserved items in your cart',
  },
  GRANDMA15: {
    code: 'GRANDMA15',
    percentOff: 15,
    label: 'Returning Collector 15% VIP',
    description: '15% thank-you savings from Bonnie & Tammy',
  },
};

export const MIN_ORDER_SUBTOTAL = 10.0;
export const SUBSIDIZED_SHIPPING_SUBTOTAL = 15.0;
export const STANDARD_FLAT_SHIPPING_CAP = 4.99;
export const SUBSIDIZED_FLAT_SHIPPING_RATE = 3.99;
export const PROMO_STORAGE_KEY = 'bonnies-promo-code';

export interface ValidatedCouponResult {
  valid: boolean;
  code: string;
  percentOff: number;
  label: string;
  description: string;
  discountAmount: number;
  error?: string;
}

export interface OrderPricingBreakdown {
  preDiscountSubtotal: number;
  coupon: ValidatedCouponResult | null;
  discountAmount: number;
  discountedSubtotal: number;
  shippingCost: number;
  shippingTierLabel: string;
  isFreeShipping: boolean;
  amountToFreeShipping: number;
  meetsMinimumOrder: boolean;
  amountToMinimumOrder: number;
  finalTotal: number;
}

export function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function validatePromoCode(
  rawCode: string | null | undefined,
  subtotal = 0
): ValidatedCouponResult {
  const normalized = (rawCode || '').trim().toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      code: '',
      percentOff: 0,
      label: '',
      description: '',
      discountAmount: 0,
      error: 'Please enter a promo code.',
    };
  }

  const found = PROMO_COUPONS[normalized];
  if (!found) {
    return {
      valid: false,
      code: normalized,
      percentOff: 0,
      label: '',
      description: '',
      discountAmount: 0,
      error: `Code "${normalized}" wasn't recognized. Try BONNIE10 for 10% off!`,
    };
  }

  const cleanSubtotal = Math.max(0, roundCurrency(subtotal));
  const discountAmount = roundCurrency(cleanSubtotal * (found.percentOff / 100));

  return {
    valid: true,
    code: found.code,
    percentOff: found.percentOff,
    label: found.label,
    description: found.description,
    discountAmount,
  };
}

/**
 * Margin-protective shipping & coupon calculator:
 * - Free shipping is evaluated on PRE-DISCOUNT subtotal >= freeShippingThreshold ($25.00),
 *   so applying a 10% coupon to a $27 cart never revokes free shipping.
 * - Orders $15.00–$24.99 unlock subsidized $3.99 USPS Ground Advantage shipping.
 * - Orders under $15.00 use $4.99 standard flat shipping (or lower if configured in StoreSettings).
 * - Enforces $10.00 minimum order threshold to prevent cash loss on single $2–$4 micro-charms.
 */
export function calculateOrderPricing(params: {
  subtotal: number;
  promoCode?: string | null;
  shippingFlatRate?: number;
  freeShippingThreshold?: number;
}): OrderPricingBreakdown {
  const preDiscountSubtotal = Math.max(0, roundCurrency(params.subtotal));
  const threshold =
    typeof params.freeShippingThreshold === 'number' && params.freeShippingThreshold >= 0
      ? params.freeShippingThreshold
      : 25.0;
  const rawFlatRate =
    typeof params.shippingFlatRate === 'number' && params.shippingFlatRate >= 0
      ? params.shippingFlatRate
      : STANDARD_FLAT_SHIPPING_CAP;

  let coupon: ValidatedCouponResult | null = null;
  let discountAmount = 0;
  if (params.promoCode && params.promoCode.trim()) {
    const res = validatePromoCode(params.promoCode, preDiscountSubtotal);
    if (res.valid) {
      coupon = res;
      discountAmount = res.discountAmount;
    }
  }

  const discountedSubtotal = Math.max(0, roundCurrency(preDiscountSubtotal - discountAmount));

  const isFreeShipping = threshold === 0 || preDiscountSubtotal >= threshold;
  const amountToFreeShipping = isFreeShipping
    ? 0
    : Math.max(0, roundCurrency(threshold - preDiscountSubtotal));

  let shippingCost = 0;
  let shippingTierLabel = 'Free US Shipping';
  if (!isFreeShipping && preDiscountSubtotal > 0) {
    if (preDiscountSubtotal >= SUBSIDIZED_SHIPPING_SUBTOTAL) {
      shippingCost = roundCurrency(Math.min(rawFlatRate, SUBSIDIZED_FLAT_SHIPPING_RATE));
      shippingTierLabel = 'USPS Ground Advantage (Subsidized $15+ Rate)';
    } else {
      shippingCost = roundCurrency(Math.min(rawFlatRate, STANDARD_FLAT_SHIPPING_CAP));
      shippingTierLabel = 'USPS Ground Advantage (2–5 Days)';
    }
  }

  const meetsMinimumOrder = preDiscountSubtotal >= MIN_ORDER_SUBTOTAL;
  const amountToMinimumOrder = meetsMinimumOrder
    ? 0
    : Math.max(0, roundCurrency(MIN_ORDER_SUBTOTAL - preDiscountSubtotal));

  const finalTotal = roundCurrency(discountedSubtotal + shippingCost);

  return {
    preDiscountSubtotal,
    coupon,
    discountAmount,
    discountedSubtotal,
    shippingCost,
    shippingTierLabel,
    isFreeShipping,
    amountToFreeShipping,
    meetsMinimumOrder,
    amountToMinimumOrder,
    finalTotal,
  };
}

export interface ImpulseAddonItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  imageUrl: string;
  badge: string;
}

export const CART_IMPULSE_ADDONS: ImpulseAddonItem[] = [
  {
    id: 'addon-ink-refill-3pk',
    title: '3-Pack Smooth Black 1.0mm Pen Ink Refills',
    subtitle: 'Fits every Bonnie & Tammy handcrafted beaded pen',
    price: 3.0,
    imageUrl: '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png',
    badge: 'Most Popular · $3',
  },
  {
    id: 'addon-velvet-gift-pouch',
    title: 'Rose Gold Velvet Gift Pouch & Satin Tie',
    subtitle: 'Ready-to-gift keepsake presentation pouch',
    price: 2.0,
    imageUrl: '/bt_logo.jpg',
    badge: 'Gift Ready · $2',
  },
  {
    id: 'addon-crystal-accent-clip',
    title: 'Sparkle Crystal Mini Charm Clip-On',
    subtitle: 'Clips onto any keychain, tote zipper, or planner',
    price: 3.5,
    imageUrl: '/uploads/transparent/transparent-1789413688662-2-IMG_8919.png',
    badge: '1-Click Add · $3.50',
  },
];
