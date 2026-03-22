/**
 * Builds the same receipt HTML as the admin panel (generateOrderReceipt.js),
 * without browser APIs — for WebView or data URLs in the mobile app.
 */

function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatAddress(addr) {
    if (!addr || typeof addr !== 'object') return 'N/A';
    const parts = [
        addr.addressLine1,
        addr.addressLine2,
        addr.city,
        addr.state,
        addr.pincode,
    ].filter(Boolean);
    if (parts.length) return parts.join(', ');
    return addr.fullAddress || addr.address || 'N/A';
}

export function buildOrderReceiptHtml(order, formatDate, formatDateOnly) {
    const isPickup =
        order.deliveryType === 'pickup' || order.deliveryType === 'store_pickup';
    const store = order.selectedStore || {};
    const storeName = store.storeName || store.name || '';
    const storeAddress = [store.address, store.city].filter(Boolean).join(', ') || '';
    const orderDate = formatDate(order.createdAt || order.orderedAt);
    const totalAmountNum = Number(order.totalAmount || order.orderSummary?.totalAmount || 0);
    const totalAmount = totalAmountNum.toLocaleString('en-IN');

    const isPaidStatus =
        order.paymentStatus === 'paid' ||
        order.paymentStatus === 'SUCCESS' ||
        order.paymentStatus === 'completed';
    const hasValidPaymentId =
        typeof order.paymentId === 'string' && order.paymentId.startsWith('pay_');
    const isPaidViaGateway = isPaidStatus || hasValidPaymentId;

    const amountPaidNum = isPaidViaGateway
        ? order.partialPayment?.isPartialPayment
            ? Number(order.partialPayment.amountPaid || 0)
            : totalAmountNum
        : 0;
    const balanceDueNum = Math.max(0, totalAmountNum - amountPaidNum);

    const itemsHtml = (order.items || [])
        .map((item, idx) => {
            const snap = item.priceSnapshot || {};
            const rows = [
                snap.metalValue > 0
                    ? `<tr><td>Metal Value</td><td>₹${Number(snap.metalValue).toLocaleString('en-IN')}</td></tr>`
                    : '',
                snap.diamondValue > 0
                    ? `<tr><td>Diamond Value</td><td>₹${Number(snap.diamondValue).toLocaleString('en-IN')}</td></tr>`
                    : '',
                snap.makingCharges > 0
                    ? `<tr><td>Making Charges</td><td>₹${Number(snap.makingCharges).toLocaleString('en-IN')}</td></tr>`
                    : '',
                snap.wastageCharges > 0
                    ? `<tr><td>Wastage</td><td>₹${Number(snap.wastageCharges).toLocaleString('en-IN')}</td></tr>`
                    : '',
                snap.otherCharges > 0
                    ? `<tr><td>Stone / Design</td><td>₹${Number(snap.otherCharges).toLocaleString('en-IN')}</td></tr>`
                    : '',
                snap.tax > 0
                    ? `<tr><td>GST</td><td>₹${Number(snap.tax).toLocaleString('en-IN')}</td></tr>`
                    : '',
                snap.discount > 0
                    ? `<tr><td>Discount</td><td>-₹${Number(snap.discount).toLocaleString('en-IN')}</td></tr>`
                    : '',
            ]
                .filter(Boolean)
                .join('');

            const purity = item.selectedPurity
                ? String(item.selectedPurity).replace(/_/g, ' ')
                : '';
            const metalLine = [item.selectedMetalType || '', purity].filter(Boolean).join(' – ');

            return `
      <div class="item-block">
        <div class="item-header">${idx + 1}. ${escapeHtml(item.productName || item.name || 'Product')}</div>
        <table class="item-table">
          <tr><td>SKU</td><td>${escapeHtml(item.productCode || item.sku || 'N/A')}</td></tr>
          <tr><td>Metal / Purity</td><td>${escapeHtml(metalLine || '—')}</td></tr>
          ${item.selectedSize ? `<tr><td>Size</td><td>${escapeHtml(item.selectedSize)}</td></tr>` : ''}
          <tr><td>Quantity</td><td>${item.quantity || 1}</td></tr>
          ${rows}
          <tr class="total-row"><td><strong>Item Total</strong></td><td><strong>₹${Number(snap.itemTotal || item.price || item.totalPrice || 0).toLocaleString('en-IN')}</strong></td></tr>
        </table>
      </div>`;
        })
        .join('');

    const deliveryHtml = isPickup
        ? `<tr><td>Pickup Store</td><td>${escapeHtml(storeName || 'N/A')}</td></tr>
       ${storeAddress ? `<tr><td>Store Address</td><td>${escapeHtml(storeAddress)}</td></tr>` : ''}
       ${store.pickupDate ? `<tr><td>Pickup Date</td><td>${escapeHtml(formatDateOnly(store.pickupDate))}</td></tr>` : ''}`
        : `<tr><td>Delivery Address</td><td>${escapeHtml(formatAddress(order.shippingAddress || order.deliveryAddress))}</td></tr>
       ${order.estimatedDeliveryDate ? `<tr><td>Est. Delivery</td><td>${escapeHtml(formatDateOnly(order.estimatedDeliveryDate))}</td></tr>` : ''}`;

    const paymentHtml = order.paymentId
        ? `<tr><td>Payment ID</td><td>${escapeHtml(order.paymentId)}</td></tr>
       <tr><td>Gateway</td><td>${escapeHtml(order.paymentGateway || 'Razorpay')}</td></tr>`
        : '';

    const statusRaw = order.status || order.orderStatus || 'pending';
    const statusLabel = escapeHtml(String(statusRaw).replace(/_/g, ' '));

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Receipt – ${escapeHtml(order.orderId || '')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 24px 16px; max-width: 680px; margin: auto; }
    .header { text-align: center; border-bottom: 2px solid #1E1B4B; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #1E1B4B; letter-spacing: 1px; }
    .header p { font-size: 12px; color: #555; margin-top: 3px; }
    .receipt-title { text-align: center; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #1E1B4B; margin-bottom: 20px; }
    section { margin-bottom: 20px; }
    section h2 { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1E1B4B; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    table td { padding: 4px 0; vertical-align: top; }
    table td:first-child { color: #555; width: 45%; }
    table td:last-child { text-align: right; font-weight: 500; }
    .item-block { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
    .item-header { font-weight: bold; color: #1E1B4B; margin-bottom: 8px; font-size: 13px; }
    .item-table td { padding: 3px 0; }
    .total-row td { border-top: 1px solid #ccc; padding-top: 6px; }
    .grand-total { background: #1E1B4B; color: #fff; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin-top: 16px; }
    .status-badge { display: inline-block; background: #1E1B4B; color: #fff; border-radius: 4px; padding: 2px 10px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
    .disclaimer { margin-top: 32px; border-top: 1px dashed #aaa; padding-top: 12px; text-align: center; font-size: 11px; color: #888; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DP Jewellers</h1>
    <p>Pure Since 1941 &nbsp;|&nbsp; Ballia, Uttar Pradesh</p>
  </div>
  <div class="receipt-title">Order Receipt</div>

  <section>
    <h2>Order Information</h2>
    <table>
      <tr><td>Order ID</td><td>#${escapeHtml(order.orderId || order.id || '')}</td></tr>
      <tr><td>Order Date</td><td>${escapeHtml(orderDate)}</td></tr>
      <tr><td>Status</td><td><span class="status-badge">${statusLabel}</span></td></tr>
      <tr><td>Delivery Type</td><td>${isPickup ? 'Store Pickup' : 'Home Delivery'}</td></tr>
      ${deliveryHtml}
    </table>
  </section>

  <section>
    <h2>Customer</h2>
    <table>
      <tr><td>Name</td><td>${escapeHtml(order.userName || 'N/A')}</td></tr>
      <tr><td>Phone</td><td>${escapeHtml(order.userPhone || 'N/A')}</td></tr>
    </table>
  </section>

  <section>
    <h2>Order Items</h2>
    ${itemsHtml || '<p style="color:#888">No items</p>'}
  </section>

  <section>
    <h2>Payment</h2>
    <table>
      <tr><td>Payment Method</td><td>${escapeHtml(order.paymentMethod || 'Online')}</td></tr>
      <tr><td>Payment Status</td><td>${escapeHtml(String(order.paymentStatus || 'pending').toUpperCase())}</td></tr>
      ${paymentHtml}
    </table>
    <div class="grand-total">
      <span>Total Amount</span>
      <span>₹${totalAmount}</span>
    </div>
    <table style="margin-top:8px">
      <tr><td>Amount Paid</td><td style="color: #4CAF50; font-weight: bold;">₹${Number(amountPaidNum).toLocaleString('en-IN')}</td></tr>
      <tr><td>Balance Due</td><td style="color: #D32F2F; font-weight: bold;">₹${Number(balanceDueNum).toLocaleString('en-IN')}</td></tr>
    </table>
  </section>

  <div class="disclaimer">
    This is a digital copy of your order confirmation only.<br/>
    <strong>This is NOT an original receipt.</strong><br/>
    The original receipt / invoice will be provided by the store at the time of delivery or pickup.
  </div>
</body>
</html>`;

    return html;
}
