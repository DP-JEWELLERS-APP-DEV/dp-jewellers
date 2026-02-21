import React, { useState } from 'react';
import { IconButton, Tooltip, Chip, Box, Typography } from '@mui/material';
import { Visibility, GetApp, Edit, Store, LocalShipping, ArrowUpward, ArrowDownward } from '@mui/icons-material';

const statusColors = {
  pending: { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
  confirmed: { bg: '#e0f2fe', text: '#0369a1', dot: '#0ea5e9' },
  processing: { bg: '#e0f2fe', text: '#0369a1', dot: '#0ea5e9' },
  ready_for_pickup: { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6' },
  out_for_delivery: { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6' },
  delivered: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  completed: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  cancelled: { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
};

export default function OrderListView({ 
  orders, 
  onView, 
  onEditStatus, 
  onDownloadReceipt,
  formatDate,
  formatDateOnly 
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'orderId') {
      aValue = a.orderId || a.id?.slice(-8).toUpperCase() || '';
      bValue = b.orderId || b.id?.slice(-8).toUpperCase() || '';
    } else if (sortConfig.key === 'customer') {
      aValue = (a.userName || '').toLowerCase();
      bValue = (b.userName || '').toLowerCase();
    } else if (sortConfig.key === 'createdAt') {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 
                    a.orderedAt?.toDate ? a.orderedAt.toDate().getTime() : a.orderedAt ? new Date(a.orderedAt).getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 
                    b.orderedAt?.toDate ? b.orderedAt.toDate().getTime() : b.orderedAt ? new Date(b.orderedAt).getTime() : 0;
      aValue = aTime;
      bValue = bTime;
    } else if (sortConfig.key === 'estimatedDeliveryDate') {
      aValue = a.estimatedDeliveryDate?.toDate ? a.estimatedDeliveryDate.toDate().getTime() : a.estimatedDeliveryDate ? new Date(a.estimatedDeliveryDate).getTime() : 0;
      bValue = b.estimatedDeliveryDate?.toDate ? b.estimatedDeliveryDate.toDate().getTime() : b.estimatedDeliveryDate ? new Date(b.estimatedDeliveryDate).getTime() : 0;
    } else if (sortConfig.key === 'totalAmount') {
      aValue = a.totalAmount || a.orderSummary?.totalAmount || 0;
      bValue = b.totalAmount || b.orderSummary?.totalAmount || 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? 
      <ArrowUpward sx={{ fontSize: 14, ml: 0.5, color: '#1E1B4B' }} /> : 
      <ArrowDownward sx={{ fontSize: 14, ml: 0.5, color: '#1E1B4B' }} />;
  };

  const renderSortableHeader = (label, key, style = {}) => (
    <th 
      onClick={() => handleSort(key)}
      style={{
        cursor: 'pointer',
        padding: '16px',
        textAlign: 'left',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        color: '#666',
        borderBottom: '1px solid #EBEBEB',
        userSelect: 'none',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {label}
        {key && <SortIcon columnKey={key} />}
      </div>
    </th>
  );

  if (!orders || orders.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        No orders found.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr>
              {renderSortableHeader('Order ID', 'orderId', { paddingLeft: 24 })}
              {renderSortableHeader('Customer', 'customer')}
              {renderSortableHeader('Order Date', 'createdAt')}
              {renderSortableHeader('Est. Delivery', 'estimatedDeliveryDate')}
              {renderSortableHeader('Amount', 'totalAmount')}
              {renderSortableHeader('Delivery Type', 'deliveryType')}
              {renderSortableHeader('Status', 'status')}
              <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', borderBottom: '1px solid #EBEBEB' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => {
              const displayId = order.orderId || order.id?.slice(-8).toUpperCase();
              const amount = order.totalAmount || order.orderSummary?.totalAmount || 0;
              const date = order.createdAt || order.orderedAt;
              const isPickup = order.deliveryType === 'pickup' || order.deliveryType === 'store_pickup';
              const s = (order.status || order.orderStatus || 'pending').toLowerCase();
              const colorTheme = statusColors[s] || { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };

              return (
                <tr 
                  key={order.id}
                  style={{
                    borderBottom: '1px solid #F3F3F1',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: '#FAFAF8' },
                  }}
                >
                  {/* Order ID */}
                  <td style={{ padding: '16px 16px 16px 24px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1E1B4B', fontFamily: 'monospace' }}>
                      #{displayId}
                    </div>
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{order.userName || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{order.userPhone || '—'}</div>
                  </td>

                  {/* Order Date */}
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 13, color: '#444' }}>{formatDate(date)}</div>
                  </td>

                  {/* Est. Delivery */}
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 13, color: order.estimatedDeliveryDate ? '#444' : '#999' }}>
                      {order.estimatedDeliveryDate ? formatDateOnly(order.estimatedDeliveryDate) : 'Not specified'}
                    </div>
                  </td>

                  {/* Amount */}
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1E1B4B' }}>
                      ₹{Number(amount || 0).toLocaleString('en-IN')}
                    </div>
                  </td>

                  {/* Delivery Type */}
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#666' }}>
                      {isPickup ? <Store sx={{ fontSize: 16 }} /> : <LocalShipping sx={{ fontSize: 16 }} />}
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{isPickup ? 'Pickup' : 'Delivery'}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 6, 
                      background: colorTheme.bg, padding: '4px 10px', borderRadius: 20 
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: colorTheme.dot }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: colorTheme.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {(s || 'pending').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 24px 16px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <Tooltip title="View Order" arrow placement="top">
                        <IconButton 
                          size="small" 
                          onClick={() => onView(order)}
                          sx={{ color: '#666', '&:hover': { color: '#0ea5e9', background: '#f0f9ff' } }}
                        >
                          <Visibility fontSize="small" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Update Status" arrow placement="top">
                        <IconButton 
                          size="small" 
                          onClick={() => onEditStatus(order)}
                          sx={{ color: '#666', '&:hover': { color: '#1E1B4B', background: '#FAFAF8' } }}
                        >
                          <Edit fontSize="small" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download Receipt" arrow placement="top">
                        <IconButton 
                          size="small" 
                          onClick={() => onDownloadReceipt(order)}
                          sx={{ color: '#666', '&:hover': { color: '#16a34a', background: '#f0fdf4' } }}
                        >
                          <GetApp fontSize="small" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
