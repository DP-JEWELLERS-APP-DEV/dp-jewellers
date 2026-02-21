import React, { useState } from 'react';
import { IconButton, Tooltip, Chip } from '@mui/material';
import { Edit, Delete, Image as ImageIcon, ArrowUpward, ArrowDownward } from '@mui/icons-material';

export default function BannerListView({ banners, customCollections, onEdit, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: 'displayOrder', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedBanners = [...banners].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'title') {
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
        {key && <SortIcon columnKey={key} />}
      </div>
    </th>
  );

  if (!banners || banners.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        No banners found.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {renderSortableHeader('Image', null, { width: 140, paddingLeft: 24 })}
              {renderSortableHeader('Title', 'title', { minWidth: 200 })}
              {renderSortableHeader('Link Target', 'linkTarget')}
              {renderSortableHeader('Order', 'displayOrder')}
              {renderSortableHeader('Status', 'isActive')}
              <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', borderBottom: '1px solid #EBEBEB' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBanners.map((banner) => (
              <tr 
                key={banner.id}
                style={{
                  borderBottom: '1px solid #F3F3F1',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: '#FAFAF8' }
                }}
              >
                {/* Image */}
                <td style={{ padding: '16px 16px 16px 24px', verticalAlign: 'middle' }}>
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      style={{ width: 100, height: 50, objectFit: 'cover', borderRadius: 6, border: '1px solid #EBEBEB' }}
                    />
                  ) : (
                    <div style={{ width: 100, height: 50, background: '#FAFAF8', borderRadius: 6, border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon sx={{ color: '#ccc' }} />
                    </div>
                  )}
                </td>

                {/* Title */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{banner.title}</div>
                </td>

                {/* Link */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  {(() => {
                    if (banner.linkType === 'category') {
                      return <span style={{ fontSize: 13, color: '#444' }}>{banner.linkTarget}</span>;
                    }
                    if (banner.linkType === 'custom_collection') {
                      const col = customCollections.find((c) => c.id === banner.linkTarget);
                      return <span style={{ fontSize: 13, color: '#444' }}>{col ? col.name : banner.linkTarget}</span>;
                    }
                    return <span style={{ fontSize: 13, color: '#444' }}>Search Page</span>;
                  })()}
                </td>

                {/* Order */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ 
                    width: 28, height: 28, borderRadius: '50%', background: '#FAFAF8', border: '1px solid #EBEBEB', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1E1B4B' 
                  }}>
                    {banner.displayOrder}
                  </div>
                </td>

                {/* Status */}
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  {banner.isActive !== false ? (
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
                    <Tooltip title="Edit Banner" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onEdit(banner)}
                        sx={{ color: '#666', '&:hover': { color: '#1E1B4B', background: '#FAFAF8' } }}
                      >
                        <Edit fontSize="small" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Banner" arrow placement="top">
                      <IconButton 
                        size="small" 
                        onClick={() => onDelete(banner.id)}
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
