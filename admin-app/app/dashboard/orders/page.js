'use client';

import { useState, useEffect } from 'react';
import { Paper, Typography, Chip, IconButton, Alert, Box, Tooltip, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { Visibility, GetApp, Edit, Store, LocalShipping, Search } from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

import OrderViewDialog from '@/components/orders/OrderViewDialog';
import OrderEditDialog from '@/components/orders/OrderEditDialog';
import OrderListView from '@/components/orders/OrderListView';
import { generateOrderReceipt } from '@/components/orders/generateOrderReceipt';

const functions = getFunctions(app, 'asia-south1');

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

// ─── Utility helpers ─────────────────────────────────────────────────────────

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  let date;
  try { date = dateString?.toDate ? dateString.toDate() : new Date(dateString); } catch { date = new Date(dateString); }
  if (!date || isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDateOnly(dateString) {
  if (!dateString) return 'N/A';
  let date;
  try { date = dateString?.toDate ? dateString.toDate() : new Date(dateString); } catch { date = new Date(dateString); }
  if (!date || isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatAddress(address) {
  if (!address) return 'N/A';
  if (typeof address === 'string') return address;
  return [address.addressLine1, address.addressLine2, address.landmark, address.city, address.state, address.pincode]
    .filter(Boolean).join(', ') || 'N/A';
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [originalDeliveryDate, setOriginalDeliveryDate] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchStores();
  }, []);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await httpsCallable(functions, 'listOrders')({ limit: 100 });
      setOrders(result.data.orders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const result = await httpsCallable(functions, 'listStores')();
      setStores(result.data.stores || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  // ─── Store helpers ──────────────────────────────────────────────────────────

  const getStoreName = (storeId) => {
    const store = stores.find((s) => s.id === storeId);
    return store ? store.name : storeId || 'N/A';
  };

  const getStoreAddress = (storeId) => {
    const store = stores.find((s) => s.id === storeId);
    if (!store) return null;
    return `${store.address}, ${store.city}, ${store.state} - ${store.pincode}`;
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setOpenViewDialog(true);
  };

  const handleEditStatus = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status || order.orderStatus || 'pending');
    const dateStr = order.estimatedDeliveryDate
      ? new Date(order.estimatedDeliveryDate).toISOString().split('T')[0]
      : '';
    setEstimatedDeliveryDate(dateStr);
    setOriginalDeliveryDate(dateStr);
    setDelayReason('');
    setOpenEditDialog(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const updateData = { orderDocId: selectedOrder.id, newStatus, note: '' };
      if (estimatedDeliveryDate) updateData.estimatedDeliveryDate = estimatedDeliveryDate;
      if (estimatedDeliveryDate && originalDeliveryDate && estimatedDeliveryDate !== originalDeliveryDate && delayReason) {
        updateData.delayReason = delayReason;
        updateData.note = `Delivery date changed. Reason: ${delayReason}`;
      }
      await httpsCallable(functions, 'updateOrderStatus')(updateData);
      setSuccess('Order updated successfully!');
      setOpenEditDialog(false);
      fetchOrders();
    } catch (err) {
      setError('Failed to update order: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (order) => {
    generateOrderReceipt(order, { getStoreName, getStoreAddress, formatDate, formatDateOnly, formatAddress });
  };

  // ─── Filter Logic ─────────────────────────────────────────────────────────────
  
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const sq = searchQuery.toLowerCase();
    const idMatch = (o.orderId || o.id || '').toLowerCase().includes(sq);
    const nameMatch = (o.userName || '').toLowerCase().includes(sq);
    const phoneMatch = (o.userPhone || '').toLowerCase().includes(sq);
    const statusMatch = (o.status || o.orderStatus || '').toLowerCase().includes(sq);
    return idMatch || nameMatch || phoneMatch || statusMatch;
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100%', paddingBottom: 40 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <Typography variant="h4" sx={{ color: '#1E1B4B', fontWeight: 700, letterSpacing: -0.5, mb: 0.5 }}>
          Orders
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          Manage customer orders, track statuses, and download receipts.
        </Typography>
      </div>

      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Toolbar ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', padding: '16px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search by ID, Customer, Phone, or Status..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#999' }} /></InputAdornment>,
            sx: { borderRadius: 2, background: '#FAFAF8', '& fieldset': { borderColor: '#EBEBEB' }, fontSize: 14, width: 340 }
          }}
        />
      </div>

      {/* ── Listing ── */}
      {loading && orders.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <CircularProgress sx={{ color: '#1E1B4B' }} />
        </div>
      ) : (
        <OrderListView 
          orders={filteredOrders}
          onView={handleViewOrder}
          onEditStatus={handleEditStatus}
          onDownloadReceipt={handleDownloadReceipt}
          formatDate={formatDate}
          formatDateOnly={formatDateOnly}
        />
      )}

      {/* ── Dialogs ── */}
      <OrderViewDialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        order={selectedOrder}
        onDownloadReceipt={handleDownloadReceipt}
        getStoreName={getStoreName}
        getStoreAddress={getStoreAddress}
        formatDate={formatDate}
        formatDateOnly={formatDateOnly}
        formatAddress={formatAddress}
      />

      <OrderEditDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        newStatus={newStatus}
        onStatusChange={setNewStatus}
        estimatedDeliveryDate={estimatedDeliveryDate}
        onDeliveryDateChange={setEstimatedDeliveryDate}
        originalDeliveryDate={originalDeliveryDate}
        delayReason={delayReason}
        onDelayReasonChange={setDelayReason}
        onSubmit={handleUpdateStatus}
        loading={loading}
      />
    </div>
  );
}
