import React, { useState } from 'react';
import { IconButton, Tooltip, Chip } from '@mui/material';
import { Edit, Delete, Visibility, Block, CheckCircle, Person, ArrowUpward, ArrowDownward } from '@mui/icons-material';

export default function UserListView({ users, onViewUser, onEditUser, onToggleStatus, onDeleteUser }) {
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
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
      aValue = aValue !== false ? 1 : 0;
      bValue = bValue !== false ? 1 : 0;
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

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp._seconds) return '—';
    const date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1e6);
    return date.toLocaleDateString();
  };

  if (!users || users.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        <div style={{ marginBottom: 16 }}>
          <Person sx={{ fontSize: 48, color: '#E0E0E0' }} />
        </div>
        No users found.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {renderSortableHeader('User', 'name', { minWidth: 200, paddingLeft: 24 })}
              {renderSortableHeader('Contact', 'email', { minWidth: 200 })}
              {renderSortableHeader('Joined Date', 'createdAt')}
              {renderSortableHeader('Status', 'isActive')}
              <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', borderBottom: '1px solid #EBEBEB' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr 
                key={user.id}
                style={{
                  borderBottom: '1px solid #F3F3F1',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: '#FAFAF8' },
                  opacity: user.isActive !== false ? 1 : 0.6,
                }}
              >
                {/* User Name */}
                <td style={{ padding: '16px 16px 16px 24px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0F2FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#1E1B4B', fontWeight: 700 }}>
                      {user.name ? user.name.charAt(0).toUpperCase() : <Person sx={{ color: '#1E1B4B' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1E1B4B' }}>{user.name || 'Unknown User'}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>ID: {user.id.substring(0, 8)}</div>
                    </div>
                  </div>
                </td>

                {/* Contact Info (Email and Phone) */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{user.email || '—'}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{user.phone || '—'}</div>
                </td>

                {/* Joined Date */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, color: '#444' }}>{formatDate(user.createdAt)}</div>
                </td>

                {/* Status */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {user.isActive !== false ? (
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

                {/* Actions */}
                <td style={{ padding: '16px 24px 16px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
                    <Tooltip title="View user profile and order history" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onViewUser(user)}
                        sx={{ color: '#666', '&:hover': { color: '#1E1B4B', background: '#FAFAF8' } }}
                      >
                        <Visibility fontSize="small" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit user details" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onEditUser(user)}
                        sx={{ color: '#666', '&:hover': { color: '#1E1B4B', background: '#FAFAF8' } }}
                      >
                        <Edit fontSize="small" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={user.isActive !== false ? 'Deactivate user' : 'Activate user'} arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onToggleStatus(user)}
                        sx={{ color: user.isActive !== false ? '#f59e0b' : '#22c55e', '&:hover': { background: user.isActive !== false ? '#fef3c7' : '#dcfce7' } }}
                      >
                        {user.isActive !== false ? <Block fontSize="small" sx={{ fontSize: 18 }} /> : <CheckCircle fontSize="small" sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Deactivate user account (soft delete)" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onDeleteUser(user.id)}
                        sx={{ color: '#666', '&:hover': { color: '#ef4444', background: '#fef2f2' } }}
                      >
                        <Delete fontSize="small" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
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
