import React, { useState } from 'react';
import { IconButton, Tooltip, Chip, Box, Typography } from '@mui/material';
import { Edit, Block, CheckCircle, ArrowUpward, ArrowDownward, Shield } from '@mui/icons-material';

const PERMISSION_OPTIONS = [
  { key: 'manageProducts', label: 'Manage Products' },
  { key: 'manageOrders', label: 'Manage Orders' },
  { key: 'manageRates', label: 'Manage Rates' },
  { key: 'managePromotions', label: 'Manage Promotions' },
  { key: 'manageUsers', label: 'Manage Users' },
];

const getRoleChipColor = (role) => {
  switch (role) {
    case 'super_admin':
      return 'primary';
    case 'admin':
      return 'info';
    default:
      return 'default';
  }
};

const formatRoleLabel = (role) => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'editor':
      return 'Editor';
    default:
      return role;
  }
};

const formatPermissions = (permissions) => {
  if (!permissions) return 'None';
  const activePermissions = PERMISSION_OPTIONS
    .filter((p) => permissions[p.key])
    .map((p) => p.label);
  return activePermissions.length > 0 ? activePermissions.join(', ') : 'None';
};

export default function AdminListView({ admins, onEditAdmin, onDeactivateAdmin, onReactivateAdmin, actionLoading }) {
  const [sortConfig, setSortConfig] = useState({ key: 'email', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAdmins = [...admins].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Special handling for dates
    if (sortConfig.key === 'createdAt') {
       const aTime = aValue?._seconds || 0;
       const bTime = bValue?._seconds || 0;
       if (aTime < bTime) return sortConfig.direction === 'asc' ? -1 : 1;
       if (aTime > bTime) return sortConfig.direction === 'asc' ? 1 : -1;
       return 0;
    }

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    // Special sort logic for booleans
    if (sortConfig.key === 'isActive') {
      aValue = aValue ? 1 : 0;
      bValue = bValue ? 1 : 0;
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

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp._seconds) return '—';
    const date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1e6);
    return date.toLocaleDateString();
  };

  if (!admins || admins.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        <div style={{ marginBottom: 16 }}>
          <Shield sx={{ fontSize: 48, color: '#E0E0E0' }} />
        </div>
        No admins found.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {renderSortableHeader('Email', 'email', { minWidth: 200, paddingLeft: 24 })}
              {renderSortableHeader('Role', 'role', { minWidth: 120 })}
              {renderSortableHeader('Permissions', null, { minWidth: 240 })}
              {renderSortableHeader('Status', 'isActive', { minWidth: 120 })}
              {renderSortableHeader('Created', 'createdAt', { minWidth: 120 })}
              <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', borderBottom: '1px solid #EBEBEB' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAdmins.map((admin) => (
              <tr 
                key={admin.uid}
                style={{
                  borderBottom: '1px solid #F3F3F1',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: '#FAFAF8' },
                  background: admin.role === 'super_admin' ? '#F8F9FD' : 'transparent',
                  opacity: admin.isActive ? 1 : 0.6,
                }}
              >
                {/* Email */}
                <td style={{ padding: '16px 16px 16px 24px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0F2FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#1E1B4B', fontWeight: 700 }}>
                      <Shield sx={{ color: '#1E1B4B', fontSize: 20 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1E1B4B' }}>{admin.email}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>ID: {admin.uid.substring(0, 8)}...</div>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <Chip
                    label={formatRoleLabel(admin.role)}
                    color={getRoleChipColor(admin.role)}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                </td>

                {/* Permissions */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                      {admin.role === 'super_admin' ? 'All permissions' : formatPermissions(admin.permissions)}
                    </Typography>
                    {admin.skipApproval && admin.role !== 'super_admin' && (
                      <Chip label="Auto-approve" size="small" color="warning" variant="outlined" sx={{ alignSelf: 'flex-start', mt: 0.5, height: 20, fontSize: 10, fontWeight: 600 }} />
                    )}
                  </Box>
                </td>

                {/* Status */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {admin.isActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>Active</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Inactive</span>
                    </div>
                  )}
                </td>

                {/* Created Date */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, color: '#444', marginTop: 3 }}>{formatDate(admin.createdAt)}</div>
                </td>

                {/* Actions */}
                <td style={{ padding: '16px 24px 16px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                  {admin.role === 'super_admin' ? (
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1976d2', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>Super Admin</div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 0 }}>
                      <Tooltip title="Edit admin role and permissions" arrow placement="top">
                        <IconButton 
                          size="small" 
                          onClick={() => onEditAdmin(admin)}
                          sx={{ color: '#666', '&:hover': { color: '#1E1B4B', background: '#FAFAF8' } }}
                          disabled={actionLoading}
                        >
                          <Edit fontSize="small" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      {admin.isActive ? (
                        <Tooltip title="Deactivate admin access" arrow placement="top">
                          <IconButton 
                            size="small" 
                            onClick={() => onDeactivateAdmin(admin)}
                            sx={{ color: '#f59e0b', '&:hover': { background: '#fef3c7' } }}
                            disabled={actionLoading}
                          >
                            <Block fontSize="small" sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reactivate admin access" arrow placement="top">
                          <IconButton 
                            size="small" 
                            onClick={() => onReactivateAdmin(admin)}
                            sx={{ color: '#22c55e', '&:hover': { background: '#dcfce7' } }}
                            disabled={actionLoading}
                          >
                            <CheckCircle fontSize="small" sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
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
