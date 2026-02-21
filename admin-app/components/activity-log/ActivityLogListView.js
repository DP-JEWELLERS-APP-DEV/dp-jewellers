import React, { useState } from 'react';
import { Chip, Button, Box, Typography } from '@mui/material';
import { ArrowUpward, ArrowDownward, ListAlt } from '@mui/icons-material';

const moduleLabels = {
  products: 'Products',
  orders: 'Orders',
  users: 'Users',
  adminUsers: 'Admin Users',
  metalRates: 'Metal Rates',
  banners: 'Banners',
  approvals: 'Approvals',
  stores: 'Stores',
  support: 'Support',
};

const moduleColors = {
  products: 'primary',
  orders: 'secondary',
  users: 'info',
  adminUsers: 'warning',
  metalRates: 'success',
  banners: 'default',
  approvals: 'error',
  stores: 'default',
  support: 'default',
};

const actionColors = {
  create: 'success',
  update: 'info',
  delete: 'error',
  archive: 'warning',
  restore: 'success',
  approve: 'success',
  reject: 'error',
  updateStatus: 'info',
  deactivate: 'warning',
  reactivate: 'success',
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '—';
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toLocaleString();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toLocaleString();
  }
  return '—';
};

export default function ActivityLogListView({ logs, onViewDetails }) {
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedLogs = [...logs].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Special handling for dates
    if (sortConfig.key === 'timestamp') {
       const aTime = aValue?._seconds || aValue?.seconds || (typeof aValue === 'string' ? new Date(aValue).getTime() / 1000 : 0);
       const bTime = bValue?._seconds || bValue?.seconds || (typeof bValue === 'string' ? new Date(bValue).getTime() / 1000 : 0);
       if (aTime < bTime) return sortConfig.direction === 'asc' ? -1 : 1;
       if (aTime > bTime) return sortConfig.direction === 'asc' ? 1 : -1;
       return 0;
    }

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

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
      onClick={() => key && handleSort(key)}
      style={{
        cursor: key ? 'pointer' : 'default',
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

  if (!logs || logs.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        <div style={{ marginBottom: 16 }}>
          <ListAlt sx={{ fontSize: 48, color: '#E0E0E0' }} />
        </div>
        No activity logs found.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr>
              {renderSortableHeader('Action', 'action', { minWidth: 120, paddingLeft: 24 })}
              {renderSortableHeader('Module', 'module', { minWidth: 120 })}
              {renderSortableHeader('Entity', 'entityName', { minWidth: 200 })}
              {renderSortableHeader('Status', 'status')}
              {renderSortableHeader('Performed By', 'performedByEmail')}
              {renderSortableHeader('Date/Time', 'timestamp')}
              <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', borderBottom: '1px solid #EBEBEB' }}>
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((log) => (
              <tr 
                key={log.id}
                style={{
                  borderBottom: '1px solid #F3F3F1',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: '#FAFAF8' },
                }}
              >
                {/* Action */}
                <td style={{ padding: '16px 16px 16px 24px', verticalAlign: 'middle' }}>
                  <Chip
                    label={log.action?.replace(/([A-Z])/g, ' $1').trim() || 'N/A'}
                    color={actionColors[log.action] || 'default'}
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 11, background: '#fff' }}
                  />
                </td>

                {/* Module */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <Chip
                    label={moduleLabels[log.module] || log.module || 'N/A'}
                    color={moduleColors[log.module] || 'default'}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                </td>

                {/* Entity */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E1B4B' }} noWrap>
                      {log.entityName || 'N/A'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888' }} noWrap>
                      {log.entityId || '—'}
                    </Typography>
                  </Box>
                </td>

                {/* Status */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <Chip
                    label={log.status || 'N/A'}
                    color={log.status === 'success' ? 'success' : 'error'}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                </td>

                {/* Performed By */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#333' }} noWrap>
                      {log.performedByEmail || 'N/A'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888', textTransform: 'capitalize' }}>
                      {log.performedByRole?.replace('_', ' ') || '—'}
                    </Typography>
                  </Box>
                </td>

                {/* Date/Time */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {formatTimestamp(log.timestamp)}
                  </Typography>
                </td>

                {/* Details */}
                <td style={{ padding: '16px 24px 16px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                  {log.details && Object.keys(log.details).length > 0 ? (
                    <Button
                      size="small"
                      sx={{ textTransform: 'none', color: '#1E1B4B', fontWeight: 600 }}
                      onClick={() => onViewDetails(log.details)}
                    >
                      View
                    </Button>
                  ) : (
                    <span style={{ color: '#aaa', fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
