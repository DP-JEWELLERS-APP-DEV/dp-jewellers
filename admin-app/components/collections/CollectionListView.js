import React, { useState } from 'react';
import { IconButton, Tooltip, Chip } from '@mui/material';
import { Edit, Delete, ArrowUpward, ArrowDownward } from '@mui/icons-material';

export default function CollectionListView({ collections, onEdit, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCollections = [...collections].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'productCount') {
      aValue = (a.productIds || []).length;
      bValue = (b.productIds || []).length;
    } else if (sortConfig.key === 'name') {
      aValue = (aValue || '').toLowerCase();
      bValue = (bValue || '').toLowerCase();
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
        <SortIcon columnKey={key} />
      </div>
    </th>
  );

  if (!collections || collections.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        No collections found.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {renderSortableHeader('Collection Name', 'name', { minWidth: 200, paddingLeft: 24 })}
              {renderSortableHeader('Products', 'productCount')}
              {renderSortableHeader('Status', 'isActive')}
              <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', borderBottom: '1px solid #EBEBEB' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCollections.map((collection) => (
              <tr 
                key={collection.id}
                style={{
                  borderBottom: '1px solid #F3F3F1',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: '#FAFAF8' }
                }}
              >
                {/* Name */}
                <td style={{ padding: '16px 16px 16px 24px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{collection.name}</div>
                </td>

                {/* Products Count */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <Chip
                    label={`${(collection.productIds || []).length} products`}
                    size="small"
                    sx={{ 
                      backgroundColor: '#FAFAF8', 
                      color: '#444', 
                      fontWeight: 600,
                      border: '1px solid #EBEBEB',
                      height: 24,
                      fontSize: 12
                    }}
                  />
                </td>

                {/* Status */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  {collection.isActive !== false ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>Active</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Inactive</span>
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: '16px 24px 16px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Tooltip title="Edit Collection" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onEdit(collection)}
                        sx={{ color: '#666', '&:hover': { color: '#1E1B4B', background: '#FAFAF8' } }}
                      >
                        <Edit fontSize="small" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Collection" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onDelete(collection.id)}
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
