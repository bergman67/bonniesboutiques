import prisma from '@/lib/prisma';

export type AddressSource = 'admin_settings' | 'shippo_address_book' | 'none';

export interface ReturnAddress {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ResolveReturnAddressResult {
  address: ReturnAddress;
  activeAddressSource: AddressSource;
}

export type StoreSettingsLike = {
  returnName?: string | null;
  returnStreet?: string | null;
  returnCity?: string | null;
  returnState?: string | null;
  returnZip?: string | null;
  shippoApiKey?: string | null;
} | null;

export type ShippingLabelResult = {
  success: boolean;
  labelUrl?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  rate?: number;
  error?: string;
  status: 'created' | 'failed' | 'not_configured';
};

/**
 * Parses a combined shippingAddress string like:
 * "123 Main St, New York, NY 10001 (US)"
 */
export function parseShippingAddress(raw: string): {
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
} {
  let cleaned = (raw || '').trim();
  let country = 'US';

  const countryMatch = cleaned.match(/\(([A-Z]{2})\)\s*$/i);
  if (countryMatch) {
    country = countryMatch[1].toUpperCase();
    cleaned = cleaned.slice(0, countryMatch.index).trim();
  }

  const parts = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
  const street1 = parts[0] || '';
  const city = parts[1] || '';
  const stateZipPart = parts.slice(2).join(' ').trim();

  const stateZipMatch = stateZipPart.match(/^([A-Za-z]{2,})\s+([0-9A-Za-z-\s]+)$/);
  const state = stateZipMatch ? stateZipMatch[1].trim() : stateZipPart;
  const zip = stateZipMatch ? stateZipMatch[2].trim() : '';

  return { street1, city, state, zip, country };
}

/**
 * Resolves the active return address for Bonnie's Boutique.
 * 1. If `returnStreet` is populated in settings, uses admin settings ('admin_settings').
 * 2. If `returnStreet` is empty/missing, automatically queries Shippo's saved Address Book
 *    (GET https://api.goshippo.com/addresses/?results=10). If a valid sender address is found
 *    (with street1, city, state, zip), uses it ('shippo_address_book').
 * 3. Otherwise returns fallback defaults with source 'none'.
 */
export async function resolveReturnAddress(
  settings?: StoreSettingsLike,
  shippoKeyOverride?: string | null
): Promise<ResolveReturnAddressResult> {
  let activeSettings = settings;
  if (activeSettings === undefined) {
    activeSettings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  }

  const defaultName = activeSettings?.returnName?.trim() || "Bonnie's Boutique";

  // 1. Return address configured directly in Admin Settings
  if (activeSettings?.returnStreet && activeSettings.returnStreet.trim()) {
    return {
      address: {
        name: defaultName,
        street1: activeSettings.returnStreet.trim(),
        city: activeSettings.returnCity?.trim() || '',
        state: activeSettings.returnState?.trim() || '',
        zip: activeSettings.returnZip?.trim() || '',
        country: 'US',
      },
      activeAddressSource: 'admin_settings',
    };
  }

  // 2. Fallback to Shippo's saved Address Book
  const shippoKey = (shippoKeyOverride || activeSettings?.shippoApiKey || process.env.SHIPPO_API_KEY || '').trim();
  if (shippoKey) {
    try {
      const addrBookRes = await fetch('https://api.goshippo.com/addresses/?results=10', {
        headers: { Authorization: `ShippoToken ${shippoKey}` },
      });
      if (addrBookRes.ok) {
        const addrBookData = await addrBookRes.json();
        const savedAddr = Array.isArray(addrBookData?.results)
          ? addrBookData.results.find(
              (a: Record<string, unknown>) =>
                typeof a?.street1 === 'string' &&
                a.street1.trim().length > 0 &&
                typeof a?.city === 'string' &&
                a.city.trim().length > 0 &&
                typeof a?.state === 'string' &&
                a.state.trim().length > 0 &&
                typeof a?.zip === 'string' &&
                a.zip.trim().length > 0
            )
          : null;
        if (savedAddr) {
          const rawPhone = typeof savedAddr.phone === 'string' ? savedAddr.phone.replace(/\D/g, '') : '';
          const rawEmail = typeof savedAddr.email === 'string' ? savedAddr.email.trim() : '';
          return {
            address: {
              name: String(savedAddr.name || savedAddr.company || defaultName).trim(),
              street1: String(savedAddr.street1).trim(),
              city: String(savedAddr.city).trim(),
              state: String(savedAddr.state).trim(),
              zip: String(savedAddr.zip).trim(),
              country: String(savedAddr.country || 'US').trim(),
              phone: rawPhone.length >= 10 ? rawPhone : undefined,
              email: rawEmail.includes('@') ? rawEmail : undefined,
            },
            activeAddressSource: 'shippo_address_book',
          };
        }
      }
    } catch (_e) {
      // Ignore fallback lookup errors
    }
  }

  // 3. Neither admin settings nor Shippo address book has a valid return address
  return {
    address: {
      name: defaultName,
      street1: '',
      city: activeSettings?.returnCity?.trim() || '',
      state: activeSettings?.returnState?.trim() || '',
      zip: activeSettings?.returnZip?.trim() || '',
      country: 'US',
    },
    activeAddressSource: 'none',
  };
}

/**
 * Purchases a 4x6 PDF USPS shipping label via Shippo API for an Order,
 * saves the label details onto the Order record in Prisma, and returns the result.
 */
export async function generateShippingLabelForOrder(orderId: string): Promise<ShippingLabelResult> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return { success: false, status: 'failed', error: 'Order not found' };
    }

    // If order already has a purchased label, return it immediately
    if (order.labelUrl && order.labelStatus === 'created') {
      return {
        success: true,
        status: 'created',
        labelUrl: order.labelUrl,
        trackingNumber: order.trackingNumber || undefined,
        trackingUrl: order.trackingUrl || undefined,
        carrier: order.labelCarrier || 'USPS',
        rate: order.labelRate || undefined,
      };
    }

    // Atomic concurrency lock: ensure only ONE request can ever purchase a label for an order
    const lock = await prisma.order.updateMany({
      where: {
        id: orderId,
        OR: [
          { labelStatus: null },
          { labelStatus: { notIn: ['created', 'creating'] } },
        ],
      },
      data: {
        labelStatus: 'creating',
      },
    });

    if (lock.count === 0) {
      const latest = await prisma.order.findUnique({ where: { id: orderId } });
      if (latest?.labelUrl && latest.labelStatus === 'created') {
        return {
          success: true,
          status: 'created',
          labelUrl: latest.labelUrl,
          trackingNumber: latest.trackingNumber || undefined,
          trackingUrl: latest.trackingUrl || undefined,
          carrier: latest.labelCarrier || 'USPS',
          rate: latest.labelRate || undefined,
        };
      }
      return {
        success: false,
        status: 'failed',
        error: 'Shipping label generation is already in progress for this order.',
      };
    }

    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    const shippoKey = settings?.shippoApiKey || process.env.SHIPPO_API_KEY || '';

    if (!shippoKey) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          labelStatus: 'not_configured',
          labelError: 'Add your Shippo API Token & Return Address in Admin Settings to buy USPS postage automatically.',
        },
      });
      return {
        success: false,
        status: 'not_configured',
        error: 'Shippo API Token is not configured yet in Admin Settings.',
      };
    }

    const resolved = await resolveReturnAddress(settings, shippoKey);
    const fromAddr = resolved.address;

    if (
      resolved.activeAddressSource === 'none' ||
      !fromAddr.street1 ||
      !fromAddr.city ||
      !fromAddr.state ||
      !fromAddr.zip
    ) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          labelStatus: 'not_configured',
          labelError: 'Return address is incomplete in Admin Settings (or Shippo Sender Address Book).',
        },
      });
      return {
        success: false,
        status: 'not_configured',
        error: 'Return Address is needed in Admin Settings (kept 100% private) or in Shippo Settings → Addresses.',
      };
    }

    const toAddr = parseShippingAddress(order.shippingAddress);
    if (!toAddr.street1 || !toAddr.city || !toAddr.state || !toAddr.zip) {
      const msg = `Customer shipping address is missing street/city/state/zip: "${order.shippingAddress}"`;
      await prisma.order.update({
        where: { id: order.id },
        data: { labelStatus: 'failed', labelError: msg },
      });
      return { success: false, status: 'failed', error: msg };
    }

    const weightOz = settings?.defaultWeightOz && settings.defaultWeightOz > 0 ? settings.defaultWeightOz : 4.0;

    const sellerEmail =
      (fromAddr.email && fromAddr.email.includes('@') ? fromAddr.email : null) ||
      (settings?.paypalEmail && settings.paypalEmail.includes('@') ? settings.paypalEmail.trim() : null) ||
      'orders@btboutiqe.com';

    const sellerPhone =
      (fromAddr.phone && fromAddr.phone.replace(/\D/g, '').length >= 10
        ? fromAddr.phone.replace(/\D/g, '').slice(-10)
        : null) || '5405550199';

    // 1. Create Shipment in Shippo (synchronous rate calculation)
    const shipmentRes = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: {
        Authorization: `ShippoToken ${shippoKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_from: {
          name: fromAddr.name,
          street1: fromAddr.street1,
          city: fromAddr.city,
          state: fromAddr.state,
          zip: fromAddr.zip,
          country: fromAddr.country || 'US',
          email: sellerEmail,
          phone: sellerPhone,
        },
        address_to: {
          name: order.customerName || 'Valued Customer',
          street1: toAddr.street1,
          city: toAddr.city,
          state: toAddr.state,
          zip: toAddr.zip,
          country: toAddr.country || 'US',
          email: order.customerEmail || sellerEmail,
          phone: order.customerPhone || sellerPhone,
        },
        parcels: [
          {
            length: '6',
            width: '4',
            height: '2',
            distance_unit: 'in',
            weight: String(weightOz),
            mass_unit: 'oz',
          },
        ],
        async: false,
      }),
    });

    const shipmentData = await shipmentRes.json();

    if (!shipmentRes.ok || !Array.isArray(shipmentData.rates) || shipmentData.rates.length === 0) {
      const errDetail =
        shipmentData?.messages?.[0]?.text ||
        shipmentData?.detail ||
        'No shipping rates returned by Shippo for this address.';
      await prisma.order.update({
        where: { id: order.id },
        data: { labelStatus: 'failed', labelError: errDetail },
      });
      return { success: false, status: 'failed', error: errDetail };
    }

    // 2. Pick the cheapest USPS rate (or overall cheapest rate if USPS isn't listed)
    const rates: Array<{
      object_id: string;
      amount: string;
      provider: string;
      servicelevel?: { name?: string };
    }> = shipmentData.rates;

    const uspsRates = rates.filter((r) => r.provider?.toUpperCase() === 'USPS');
    const candidateRates = uspsRates.length > 0 ? uspsRates : rates;
    candidateRates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    const chosenRate = candidateRates[0];

    // 3. Purchase the 4x6 PDF Shipping Label Transaction
    const txRes = await fetch('https://api.goshippo.com/transactions/', {
      method: 'POST',
      headers: {
        Authorization: `ShippoToken ${shippoKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rate: chosenRate.object_id,
        label_file_type: 'PDF_4x6',
        async: false,
      }),
    });

    const txData = await txRes.json();

    if (!txRes.ok || txData.status !== 'SUCCESS' || !txData.label_url) {
      const txErr =
        txData?.messages?.[0]?.text ||
        txData?.detail ||
        'Shippo transaction failed to generate a label.';
      await prisma.order.update({
        where: { id: order.id },
        data: { labelStatus: 'failed', labelError: txErr },
      });
      return { success: false, status: 'failed', error: txErr };
    }

    const carrierName = `${chosenRate.provider} ${chosenRate.servicelevel?.name || ''}`.trim();
    const rateNum = parseFloat(chosenRate.amount) || 0;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        labelUrl: txData.label_url,
        trackingNumber: txData.tracking_number || null,
        trackingUrl: txData.tracking_url_provider || null,
        labelCarrier: carrierName,
        labelRate: rateNum,
        labelStatus: 'created',
        labelError: null,
      },
    });

    return {
      success: true,
      status: 'created',
      labelUrl: txData.label_url,
      trackingNumber: txData.tracking_number,
      trackingUrl: txData.tracking_url_provider,
      carrier: carrierName,
      rate: rateNum,
    };
  } catch (error) {
    const msg = (error as Error).message || 'Unexpected error creating shipping label';
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: { labelStatus: 'failed', labelError: msg },
      });
    } catch (_e) {}
    return { success: false, status: 'failed', error: msg };
  }
}
