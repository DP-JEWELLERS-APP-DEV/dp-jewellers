import React, { useState } from 'react';
import { IconButton, Tooltip, Chip } from '@mui/material';
import { Edit, Delete, LocationOn, Star, StarBorder, ArrowUpward, ArrowDownward } from '@mui/icons-material';

export default function StoreListView({ stores, onEdit, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStores = [...stores].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    // Special sort logic for booleans
    if (sortConfig.key === 'isPrimary' || sortConfig.key === 'isActive') {
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

  if (!stores || stores.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        No stores found.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {renderSortableHeader('Store Name', 'name', { minWidth: 160, paddingLeft: 24 })}
              {renderSortableHeader('Address', 'address', { minWidth: 240 })}
              {renderSortableHeader('Phone', 'phone')}
              {renderSortableHeader('Hours', 'openingHours')}
              {renderSortableHeader('Primary', 'isPrimary')}
              {renderSortableHeader('Status', 'isActive')}
              <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', borderBottom: '1px solid #EBEBEB' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStores.map((store) => (
              <tr 
                key={store.id}
                style={{
                  borderBottom: '1px solid #F3F3F1',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: '#FAFAF8' },
                  background: store.isPrimary ? '#F8F9FD' : 'transparent',
                }}
              >
                {/* Store Name */}
                <td style={{ padding: '16px 16px 16px 24px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E1E8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <LocationOn sx={{ color: '#1E1B4B', fontSize: 18 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1E1B4B' }}>{store.name}</div>
                      {store.email && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{store.email}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Address */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, color: '#333', lineHeight: 1.4 }}>{store.address}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {store.city}, {store.state} - {store.pincode}
                  </div>
                </td>

                {/* Phone */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, color: '#444' }}>{store.phone || '—'}</div>
                </td>

                {/* Hours */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, color: '#444', maxWidth: 160 }}>{store.openingHours || '—'}</div>
                </td>

                {/* Primary */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {store.isPrimary ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF3C7', padding: '4px 8px', borderRadius: 4 }}>
                      <Star sx={{ fontSize: 14, color: '#D97706' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>Primary</span>
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
                      <StarBorder sx={{ fontSize: 14, color: '#CBD5E1' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Normal</span>
                    </div>
                  )}
                </td>

                {/* Status */}
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {store.isActive !== false ? (
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
                    <Tooltip title="Edit Store" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onEdit(store)}
                        sx={{ color: '#666', '&:hover': { color: '#1E1B4B', background: '#FAFAF8' } }}
                      >
                        <Edit fontSize="small" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Store" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onDelete(store.id)}
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
