import React, { useState } from 'react';
import { IconButton, Tooltip, Chip } from '@mui/material';
import { Visibility, CheckCircle, Cancel, ArrowUpward, ArrowDownward, Inbox } from '@mui/icons-material';

const getEntityTypeChip = (entityType) => {
  switch (entityType) {
    case 'product':
      return { label: 'Product', color: 'primary' };
    case 'metalRates':
      return { label: 'Metal Rates', color: 'secondary' };
    case 'banner':
      return { label: 'Banner', color: 'info' };
    default:
      return { label: entityType, color: 'default' };
  }
};

const getActionTypeChip = (actionType) => {
  switch (actionType) {
    case 'create':
      return { label: 'Create', color: 'success' };
    case 'update':
      return { label: 'Update', color: 'info' };
    case 'archive':
      return { label: 'Archive', color: 'warning' };
    case 'restore':
      return { label: 'Restore', color: 'primary' };
    case 'delete':
      return { label: 'Delete', color: 'error' };
    default:
      return { label: actionType, color: 'default' };
  }
};

const getStatusChip = (status) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'warning' };
    case 'approved':
      return { label: 'Approved', color: 'success' };
    case 'rejected':
      return { label: 'Rejected', color: 'error' };
    default:
      return { label: status, color: 'default' };
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '—';
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toLocaleString();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }
  return '—';
};

export default function ApprovalListView({ 
  approvals, 
  activeTab, 
  onViewDetail, 
  onApprove, 
  onReject, 
  actionLoading 
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedApprovals = [...approvals].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Special handling for dates
    if (sortConfig.key === 'submittedAt') {
       const aTime = aValue?._seconds || aValue?.seconds || 0;
       const bTime = bValue?._seconds || bValue?.seconds || 0;
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

  if (!approvals || approvals.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        <div style={{ marginBottom: 16 }}>
          <Inbox sx={{ fontSize: 48, color: '#E0E0E0' }} />
        </div>
        No approvals found.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {renderSortableHeader('Type', 'entityType', { minWidth: 120, paddingLeft: 24 })}
              {renderSortableHeader('Action', 'actionType', { minWidth: 110 })}
              {renderSortableHeader('Name', 'entityName', { minWidth: 200 })}
              {renderSortableHeader('Submitted By', 'submittedByEmail')}
              {activeTab > 0 && renderSortableHeader('Reviewed By', 'reviewedByEmail')}
              {renderSortableHeader('Date', 'submittedAt')}
              {renderSortableHeader('Status', 'status')}
              <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', borderBottom: '1px solid #EBEBEB' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedApprovals.map((approval) => (
              <tr 
                key={approval.id}
                style={{
                  borderBottom: '1px solid #F3F3F1',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: '#FAFAF8' },
                }}
              >
                {/* Type */}
                <td style={{ padding: '16px 16px 16px 24px', verticalAlign: 'middle' }}>
                  <Chip
                    {...getEntityTypeChip(approval.entityType)}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                </td>

                {/* Action */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <Chip
                    {...getActionTypeChip(approval.actionType)}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: 11, background: '#fff' }}
                  />
                </td>

                {/* Name */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E1B4B' }}>{approval.entityName}</div>
                </td>

                {/* Submitted By */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 13, color: '#444' }}>{approval.submittedByEmail}</div>
                </td>

                {/* Reviewed By */}
                {activeTab > 0 && (
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 13, color: '#444' }}>{approval.reviewedByEmail || '—'}</div>
                  </td>
                )}

                {/* Date */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 13, color: '#666' }}>{formatTimestamp(approval.submittedAt)}</div>
                </td>

                {/* Status */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <Chip
                    {...getStatusChip(approval.status)}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                </td>

                {/* Actions */}
                <td style={{ padding: '16px 24px 16px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <Tooltip title="View details" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onViewDetail(approval)}
                        sx={{ color: '#1E1B4B', '&:hover': { background: '#F0F2FA' } }}
                      >
                        <Visibility fontSize="small" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    {approval.status === 'pending' && (
                      <>
                        <Tooltip title="Approve" arrow placement="top">
                          <IconButton 
                            size="small" 
                            onClick={() => onApprove(approval.id)}
                            sx={{ color: '#22c55e', '&:hover': { background: '#dcfce7' } }}
                            disabled={actionLoading}
                          >
                            <CheckCircle fontSize="small" sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject" arrow placement="top">
                          <IconButton 
                            size="small" 
                            onClick={() => onReject(approval)}
                            sx={{ color: '#ef4444', '&:hover': { background: '#fef2f2' } }}
                            disabled={actionLoading}
                          >
                            <Cancel fontSize="small" sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
