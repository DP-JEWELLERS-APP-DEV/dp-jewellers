'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Chip, Box, Grid, Divider,
} from '@mui/material';
import { GetApp, Store, LocalShipping } from '@mui/icons-material';

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  ready_for_pickup: 'primary',
  out_for_delivery: 'primary',
  delivered: 'success',
  completed: 'success',
  cancelled: 'error',
};

/**
 * OrderViewDialog
 * Props:
 *   open              - boolean
 *   onClose           - () => void
 *   order             - order object (may be null)
 *   onDownloadReceipt - (order) => void
 *   getStoreName      - (storeId) => string
 *   getStoreAddress   - (storeId) => string | null
 *   formatDate        - (dateString) => string
 *   formatDateOnly    - (dateString) => string
 *   formatAddress     - (address) => string
 */
export default function OrderViewDialog({
  open,
  onClose,
  order,
  onDownloadReceipt,
  getStoreName,
  getStoreAddress,
  formatDate,
  formatDateOnly,
  formatAddress,
}) {
  if (!order) return null;

  const isPickup = order.deliveryType === 'pickup' || order.deliveryType === 'store_pickup';
  const currentStatus = order.status || order.orderStatus || 'pending';

  const totalAmount = order.totalAmount || order.orderSummary?.totalAmount || 0;
  
  // Stricter check: it must be explicitly marked as paid OR have a valid Razorpay payment ID (e.g. "pay_xyz")
  const isPaidStatus = order.paymentStatus === 'paid' || order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'completed';
  const hasValidPaymentId = typeof order.paymentId === 'string' && order.paymentId.startsWith('pay_');
  const isPaidViaGateway = isPaidStatus || hasValidPaymentId;

  const amountPaid = order.partialPayment?.isPartialPayment ? (order.partialPayment.amountPaid || 0) : (isPaidViaGateway ? totalAmount : 0);
  const balanceDue = Math.max(0, totalAmount - amountPaid);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
        Order Details
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* ── Order Info Grid ── */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: '#666' }}>Order ID</Typography>
              <Typography variant="body1" fontWeight={600}>
                #{order.orderId || order.id?.slice(-8).toUpperCase()}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: '#666' }}>Order Date</Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatDate(order.createdAt || order.orderedAt)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: '#666' }}>Customer Name</Typography>
              <Typography variant="body1" fontWeight={600}>{order.userName}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: '#666' }}>Phone</Typography>
              <Typography variant="body1" fontWeight={600}>{order.userPhone}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: '#666' }}>Delivery Type</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isPickup
                  ? <Store fontSize="small" sx={{ color: '#1E1B4B' }} />
                  : <LocalShipping fontSize="small" sx={{ color: '#1E1B4B' }} />}
                <Typography variant="body1" fontWeight={600}>
                  {isPickup ? 'Store Pickup' : 'Home Delivery'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: '#666' }}>Status</Typography>
              <Chip
                label={(currentStatus || 'pending').replace(/_/g, ' ').toUpperCase()}
                color={statusColors[currentStatus] || 'default'}
                size="small"
              />
            </Grid>

            {/* Payment ID (shown only when paid) */}
            {order.paymentId && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ color: '#666' }}>Payment ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}>
                  {order.paymentId}
                </Typography>
                {order.paymentGateway && (
                  <Typography variant="caption" sx={{ color: '#888' }}>{order.paymentGateway}</Typography>
                )}
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: '#666' }}>Estimated Delivery Date</Typography>
              <Typography variant="body1" fontWeight={600}>
                {order.estimatedDeliveryDate ? formatDateOnly(order.estimatedDeliveryDate) : 'Not set'}
              </Typography>
            </Grid>

            {order.delayReason && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ color: '#666' }}>Delay Reason</Typography>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#d32f2f' }}>
                  {order.delayReason}
                </Typography>
              </Grid>
            )}

            {/* Pickup store */}
            {isPickup && (
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ color: '#666' }}>Pickup Store</Typography>
                <Typography variant="body1" fontWeight={600}>{getStoreName(order.selectedStore?.storeId || order.selectedStore)}</Typography>
                {getStoreAddress(order.selectedStore?.storeId || order.selectedStore) && (
                  <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                    {getStoreAddress(order.selectedStore?.storeId || order.selectedStore)}
                  </Typography>
                )}
              </Grid>
            )}

            {/* Delivery address */}
            {!isPickup && (
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ color: '#666' }}>Delivery Address</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatAddress(order.shippingAddress || order.deliveryAddress)}
                </Typography>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* ── Order Items ── */}
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1E1B4B', mb: 2 }}>
            Order Items
          </Typography>

          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => {
              const snap = item.priceSnapshot || {};
              return (
                <Box key={index} sx={{ p: 2, mb: 2, backgroundColor: '#F5F5F5', borderRadius: 2, border: '1px solid #E8E8E8' }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#1E1B4B', mb: 0.5 }}>
                    {index + 1}. {item.productName || 'Product'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                    SKU: {item.productCode || item.sku || 'N/A'}
                    {item.selectedMetalType ? ` · ${item.selectedMetalType}` : ''}
                    {item.selectedPurity ? ` ${item.selectedPurity.replace('_', ' ')}` : ''}
                    {item.selectedSize ? ` · Size: ${item.selectedSize}` : ''}
                    {` · Qty: ${item.quantity || 1}`}
                  </Typography>

                  {/* Price Breakup */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, pl: 1 }}>
                    {snap.metalValue > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#777' }}>Metal Value</Typography>
                        <Typography variant="caption">₹{Number(snap.metalValue).toLocaleString('en-IN')}</Typography>
                      </Box>
                    )}
                    {snap.diamondValue > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#777' }}>Diamond Value</Typography>
                        <Typography variant="caption">₹{Number(snap.diamondValue).toLocaleString('en-IN')}</Typography>
                      </Box>
                    )}
                    {snap.makingCharges > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#777' }}>Making Charges</Typography>
                        <Typography variant="caption">₹{Number(snap.makingCharges).toLocaleString('en-IN')}</Typography>
                      </Box>
                    )}
                    {snap.wastageCharges > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#777' }}>Wastage</Typography>
                        <Typography variant="caption">₹{Number(snap.wastageCharges).toLocaleString('en-IN')}</Typography>
                      </Box>
                    )}
                    {snap.otherCharges > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#777' }}>Stone / Design Charges</Typography>
                        <Typography variant="caption">₹{Number(snap.otherCharges).toLocaleString('en-IN')}</Typography>
                      </Box>
                    )}
                    {snap.tax > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#777' }}>GST</Typography>
                        <Typography variant="caption">₹{Number(snap.tax).toLocaleString('en-IN')}</Typography>
                      </Box>
                    )}
                    {snap.discount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#4CAF50' }}>Discount</Typography>
                        <Typography variant="caption" sx={{ color: '#4CAF50' }}>
                          -₹{Number(snap.discount).toLocaleString('en-IN')}
                        </Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E1B4B' }}>Item Total</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E1B4B' }}>
                        ₹{Number(snap.itemTotal || item.price || 0).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" sx={{ color: '#666' }}>No items found</Typography>
          )}

          {/* ── Order History / Tracking ── */}
          {order.trackingUpdates && order.trackingUpdates.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" fontWeight={700} sx={{ color: '#1E1B4B', mb: 2 }}>
                Order History
              </Typography>
              {order.trackingUpdates.map((update, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2, mb: 1, backgroundColor: '#F5F5F5', borderRadius: 2,
                    borderLeft: `3px solid ${
                      statusColors[update.status] === 'success' ? '#4caf50'
                      : statusColors[update.status] === 'error' ? '#d32f2f'
                      : '#1E1B4B'
                    }`,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight={600}>
                      {(update.status || 'pending').replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {formatDate(update.timestamp)}
                    </Typography>
                  </Box>
                  {update.note && (
                    <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>{update.note}</Typography>
                  )}
                </Box>
              ))}
            </>
          )}

          {/* ── Grand Total ── */}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1E1B4B' }}>Total Amount</Typography>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1E1B4B' }}>
              ₹{Number(totalAmount).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body1" fontWeight={600} sx={{ color: '#4CAF50' }}>Amount Paid</Typography>
            <Typography variant="body1" fontWeight={600} sx={{ color: '#4CAF50' }}>
              ₹{Number(amountPaid).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" fontWeight={600} sx={{ color: '#D32F2F' }}>Balance Due</Typography>
            <Typography variant="body1" fontWeight={600} sx={{ color: '#D32F2F' }}>
              ₹{Number(balanceDue).toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#666' }}>Close</Button>
        <Button
          onClick={() => onDownloadReceipt(order)}
          variant="contained"
          startIcon={<GetApp />}
          sx={{ backgroundColor: '#1E1B4B', '&:hover': { backgroundColor: '#2D2963' }, textTransform: 'none' }}
        >
          Download Receipt
        </Button>
      </DialogActions>
    </Dialog>
  );
}
