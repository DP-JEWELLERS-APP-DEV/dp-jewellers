'use client';

import { useState, useEffect } from 'react';
import { Paper, Typography, Chip, IconButton, Alert, Box, Tooltip } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Visibility, GetApp, Edit, Store, LocalShipping } from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

import OrderViewDialog from '@/components/orders/OrderViewDialog';
import OrderEditDialog from '@/components/orders/OrderEditDialog';
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

  // ─── DataGrid columns ───────────────────────────────────────────────────────

  const columns = [
    {
      field: 'orderId', headerName: 'Order ID', width: 140,
      valueGetter: (_, row) => row.orderId || row.id?.slice(-8).toUpperCase() || '',
      renderCell: (params) => `#${params.row.orderId || params.row.id?.slice(-8).toUpperCase()}`,
    },
    {
      field: 'customer', headerName: 'Customer', flex: 1, minWidth: 150,
      valueGetter: (_, row) => row.userName || '',
      renderCell: (params) => (
        <Box>
          <div>{params.row.userName}</div>
          <Typography variant="caption" sx={{ color: '#666' }}>{params.row.userPhone}</Typography>
        </Box>
      ),
    },
    {
      field: 'createdAt', headerName: 'Order Date', width: 160,
      valueGetter: (_, row) => row.createdAt || row.orderedAt ? new Date(row.createdAt || row.orderedAt) : null,
      renderCell: (params) => formatDate(params.row.createdAt || params.row.orderedAt),
    },
    {
      field: 'estimatedDeliveryDate', headerName: 'Est. Delivery', width: 120,
      valueGetter: (_, row) => row.estimatedDeliveryDate ? new Date(row.estimatedDeliveryDate) : null,
      renderCell: (params) => formatDateOnly(params.row.estimatedDeliveryDate),
    },
    {
      field: 'totalAmount', headerName: 'Amount', width: 120,
      valueGetter: (_, row) => row.totalAmount || row.orderSummary?.totalAmount || 0,
      renderCell: (params) => `₹${(params.row.totalAmount || params.row.orderSummary?.totalAmount || 0).toLocaleString('en-IN')}`,
    },
    {
      field: 'deliveryType', headerName: 'Delivery', width: 100,
      renderCell: (params) => {
        const isPickup = params.row.deliveryType === 'pickup' || params.row.deliveryType === 'store_pickup';
        return (
          <Chip
            icon={isPickup ? <Store fontSize="small" /> : <LocalShipping fontSize="small" />}
            label={isPickup ? 'Pickup' : 'Delivery'}
            size="small" variant="outlined"
          />
        );
      },
    },
    {
      field: 'status', headerName: 'Status', width: 140,
      valueGetter: (_, row) => row.status || row.orderStatus || 'pending',
      renderCell: (params) => {
        const s = params.row.status || params.row.orderStatus;
        return (
          <Chip
            label={(s || 'pending').replace(/_/g, ' ').toUpperCase()}
            color={statusColors[s] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'actions', headerName: 'Actions', width: 140, sortable: false, filterable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="View order details" arrow>
            <IconButton size="small" onClick={() => handleViewOrder(params.row)} sx={{ color: '#1E1B4B', mr: 0.5 }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Update order status" arrow>
            <IconButton size="small" onClick={() => handleEditStatus(params.row)} sx={{ color: '#1E1B4B', mr: 0.5 }}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download receipt PDF" arrow>
            <IconButton size="small" onClick={() => handleDownloadReceipt(params.row)} sx={{ color: '#1E1B4B' }}>
              <GetApp fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <Typography variant="h4" fontWeight={700} sx={{ color: '#1E1B4B', mb: 3 }}>
        Orders Management
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper elevation={2} sx={{ backgroundColor: 'white', borderRadius: 2 }}>
        <DataGrid
          rows={orders}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading && orders.length === 0}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f5f5f5', fontWeight: 'bold' },
            '& .MuiDataGrid-row:hover': { backgroundColor: '#f9f9f9' },
            '& .MuiDataGrid-toolbarContainer': { p: 2, gap: 2 },
          }}
          localeText={{ noRowsLabel: 'No orders found' }}
        />
      </Paper>

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
