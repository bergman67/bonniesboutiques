export type CommerceEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'ApplyCoupon'
  | 'Lead'
  | 'Purchase';

export interface AttributionSnapshot {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  referrer?: string;
  landing_path?: string;
  captured_at?: string;
}

const ATTRIBUTION_KEY = 'bonnies-attribution';

type WindowWithPixels = Window & {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: Array<Record<string, unknown>>;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track?: (event: string, data?: Record<string, unknown>) => void; page?: () => void };
  pintrk?: (...args: unknown[]) => void;
};

export function captureInboundAttribution(): AttributionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const hasUtm =
      params.has('utm_source') ||
      params.has('utm_medium') ||
      params.has('utm_campaign') ||
      params.has('utm_content');

    const existingRaw = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (existingRaw && !hasUtm) {
      return JSON.parse(existingRaw) as AttributionSnapshot;
    }

    const snapshot: AttributionSnapshot = {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      referrer: document.referrer || undefined,
      landing_path: window.location.pathname,
      captured_at: new Date().toISOString(),
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return null;
  }
}

export function getSavedAttribution(): AttributionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as AttributionSnapshot) : null;
  } catch {
    return null;
  }
}

export function trackCommerceEvent(
  event: CommerceEventName,
  payload: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') return;
  try {
    const w = window as WindowWithPixels;
    const gaEventMap: Record<CommerceEventName, string> = {
      PageView: 'page_view',
      ViewContent: 'view_item',
      AddToCart: 'add_to_cart',
      InitiateCheckout: 'begin_checkout',
      ApplyCoupon: 'select_promotion',
      Lead: 'generate_lead',
      Purchase: 'purchase',
    };

    if (typeof w.gtag === 'function') {
      w.gtag('event', gaEventMap[event], payload);
    }
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: gaEventMap[event], ...payload });
    }
    if (typeof w.fbq === 'function') {
      if (event === 'PageView') {
        w.fbq('track', 'PageView');
      } else if (event === 'ApplyCoupon') {
        w.fbq('trackCustom', 'ApplyCoupon', payload);
      } else {
        w.fbq('track', event, payload);
      }
    }
    if (w.ttq) {
      if (event === 'PageView' && typeof w.ttq.page === 'function') {
        w.ttq.page();
      } else if (typeof w.ttq.track === 'function') {
        const ttEvent = event === 'Purchase' ? 'CompletePayment' : event;
        w.ttq.track(ttEvent, payload);
      }
    }
    if (typeof w.pintrk === 'function') {
      const pinMap: Partial<Record<CommerceEventName, string>> = {
        PageView: 'pagevisit',
        ViewContent: 'pagevisit',
        AddToCart: 'addtocart',
        InitiateCheckout: 'checkout',
        Lead: 'lead',
        Purchase: 'checkout',
      };
      const pinEvent = pinMap[event];
      if (pinEvent) {
        w.pintrk('track', pinEvent, payload);
      }
    }
  } catch {
    // Non-blocking telemetry
  }
}
