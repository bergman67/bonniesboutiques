/**
 * src/app/admin/utils/batchPrintPackingSlips.ts
 *
 * 1-Click Multi-Page Printable Packing Slips & Label Generator for Bonnie's Boutique.
 * Produces clean, accessible, print-ready HTML with @media print page breaks,
 * cut-out address labels with dashed lines, and clear item packing checklists.
 */

export interface OrderItem {
  id?: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

export interface PrintableOrder {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string | null;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  itemsJson: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  labelUrl?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelCarrier?: string | null;
  labelPrinted?: boolean;
  createdAt: string;
}

export interface StoreReturnAddress {
  returnName?: string;
  returnStreet?: string;
  returnCity?: string;
  returnState?: string;
  returnZip?: string;
}

/**
 * Generates the complete HTML string for multi-page batch packing slips.
 */
export function generateBatchPackingSlipsHtml(
  orders: PrintableOrder[],
  returnAddress?: StoreReturnAddress
): string {
  const fromName = returnAddress?.returnName || "Bonnie's Boutique";
  const fromLine = returnAddress?.returnStreet
    ? `${fromName}<br/>${returnAddress.returnStreet}<br/>${returnAddress.returnCity || ''}, ${returnAddress.returnState || ''} ${returnAddress.returnZip || ''}`
    : `${fromName}<br/>btboutiqe.com`;

  const slipsHtml = orders
    .map((order, idx) => {
      let items: OrderItem[] = [];
      try {
        items = JSON.parse(order.itemsJson);
      } catch (_e) {
        items = [];
      }

      const isLast = idx === orders.length - 1;
      const pageBreakClass = isLast ? '' : 'page-break';

      const itemRows = items
        .map(
          (it) => `
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; font-size: 16px;">
              <strong>[ &nbsp; ]</strong> &nbsp; ${it.title}
            </td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: center; font-size: 16px; font-weight: bold;">
              ${it.quantity}
            </td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: right; font-size: 16px;">
              $${(it.price * it.quantity).toFixed(2)}
            </td>
          </tr>`
        )
        .join('');

      return `
        <div class="packing-slip-container ${pageBreakClass}" style="padding: 24px; font-family: Arial, sans-serif; color: #111; max-width: 800px; margin: 0 auto 30px auto; background: #fff;">
          
          <!-- Top Order Header Banner -->
          <div style="background: #fdf2f4; border: 2px solid #e8748a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <strong style="font-size: 18px; color: #9f1239;">Order ${idx + 1} of ${orders.length}</strong>
              &nbsp;—&nbsp; Customer: <strong>${order.customerName}</strong>
              <span style="color: #666; font-size: 14px; margin-left: 8px;">(Order #${order.id})</span>
            </div>
            ${
              order.labelUrl
                ? `<a href="${order.labelUrl}" target="_blank" rel="noopener noreferrer" style="background: #0284c7; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold;">
                    🏷️ Open 4x6 USPS Label ↗
                  </a>`
                : ''
            }
          </div>

          <!-- Cut-out Address Label for Package -->
          <div style="border: 3px dashed #222; padding: 20px; margin-bottom: 24px; border-radius: 10px; background: #fafafa;">
            <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 8px; letter-spacing: 1px;">
              ✂ Cut out and tape to package
            </div>
            <div style="font-size: 14px; color: #444; line-height: 1.4; margin-bottom: 14px;">
              <strong>FROM:</strong><br/>
              ${fromLine}
            </div>
            <div style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #333; margin-bottom: 4px;">
              SHIP TO:
            </div>
            <div style="font-size: 24px; font-weight: bold; line-height: 1.35; color: #111; margin-left: 12px;">
              ${order.customerName}<br/>
              ${order.shippingAddress.replace(/,\s*/g, '<br/>')}
            </div>
            ${
              order.trackingNumber
                ? `<div style="margin-top: 14px; font-size: 16px; font-weight: bold; color: #2e7d32;">
                    USPS Tracking: ${order.trackingNumber}
                  </div>`
                : ''
            }
          </div>

          <!-- Order Summary & Packing Checklist -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <h1 style="font-size: 22px; margin: 0; color: #111;">Bonnie's Boutique — Packing Slip</h1>
              <p style="margin: 4px 0 0; color: #555; font-size: 14px;">
                Order Date: ${new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div style="text-align: right; font-size: 14px; color: #333;">
              <strong>Payment:</strong> ${order.paymentMethod.toUpperCase()} (${order.paymentStatus.toUpperCase()})<br/>
              ${order.customerEmail ? `Email: ${order.customerEmail}` : ''}
            </div>
          </div>

          <h2 style="font-size: 17px; margin-bottom: 8px; color: #222;">Items Checklist:</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr style="background: #f4f4f4; border-bottom: 2px solid #ccc; text-align: left;">
                <th style="padding: 10px 8px; font-size: 14px;">Item Description</th>
                <th style="padding: 10px 8px; text-align: center; width: 80px; font-size: 14px;">Qty</th>
                <th style="padding: 10px 8px; text-align: right; width: 100px; font-size: 14px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="margin-top: 16px; text-align: right; font-size: 16px; border-top: 1px solid #eee; padding-top: 10px;">
            <p style="margin: 3px 0; color: #555;">Subtotal: $${order.subtotal.toFixed(2)}</p>
            <p style="margin: 3px 0; color: #555;">Shipping: $${order.shippingCost.toFixed(2)}</p>
            <p style="margin: 6px 0; font-size: 20px; font-weight: bold; color: #111;">
              Total: $${order.total.toFixed(2)}
            </p>
          </div>

          <!-- Grandma Bonnie Thank You Footer -->
          <div style="margin-top: 24px; text-align: center; font-size: 15px; font-style: italic; color: #555; border-top: 1px dashed #ccc; padding-top: 12px;">
            Thank you so much for supporting Bonnie &amp; Tammy's handcrafted boutique! 💖
          </div>
        </div>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print Packing Slips — Bonnie's Boutique</title>
    <style>
      body {
        margin: 0;
        background: #f3f4f6;
        font-family: Arial, sans-serif;
        color: #111;
      }
      @media print {
        body {
          margin: 0;
          background: white;
        }
        .no-print {
          display: none !important;
        }
        .page-break {
          page-break-after: always;
          break-after: page;
        }
        @page {
          margin: 1cm;
          size: letter portrait;
        }
      }
    </style>
  </head>
  <body>
    <!-- Top toolbar for previewing before print -->
    <div class="no-print" style="position: sticky; top: 0; z-index: 100; background: #1a0f24; color: #f5efe6; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      <div>
        <h2 style="margin: 0; font-size: 18px; font-weight: bold; color: #e8748a;">
          👵 Bonnie's Batch Packing Slips (${orders.length} Orders)
        </h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(245,239,230,0.75);">
          All slips formatted sequentially with cut-out address labels and item checkboxes.
        </p>
      </div>
      <button onclick="window.print()" style="background: #10b981; color: white; border: none; padding: 12px 28px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.4);">
        🖨️ Print All Now
      </button>
    </div>

    <div style="padding: 24px 12px;">
      ${slipsHtml}
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 350);
      };
    </script>
  </body>
</html>`;
}

/**
 * 1-Click Batch Print function: opens the multi-page packing slip window,
 * opens any generated Shippo 4x6 label PDFs, and notifies callback to mark orders printed.
 */
export async function batchPrintWaitingOrders(
  orders: PrintableOrder[],
  returnAddress: StoreReturnAddress,
  onMarkPrinted?: (orderIds: string[]) => Promise<void> | void
): Promise<{ success: boolean; labelUrls: string[] }> {
  if (orders.length === 0) {
    return { success: false, labelUrls: [] };
  }

  const html = generateBatchPackingSlipsHtml(orders, returnAddress);
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // Collect label URLs for USPS labels
  const labelUrls: string[] = [];
  for (const order of orders) {
    if (order.labelUrl) {
      labelUrls.push(order.labelUrl);
      window.open(order.labelUrl, '_blank');
    }
  }

  if (onMarkPrinted) {
    await onMarkPrinted(orders.map((o) => o.id));
  }

  return { success: true, labelUrls };
}
