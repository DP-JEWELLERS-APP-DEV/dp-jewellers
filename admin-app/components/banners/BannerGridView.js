import React from 'react';
import { Grid, IconButton, Tooltip, Chip } from '@mui/material';
import { Edit, Delete, Image as ImageIcon } from '@mui/icons-material';

export default function BannerGridView({ banners, customCollections, onEdit, onDelete }) {
  if (!banners || banners.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        No banners found.
      </div>
    );
  }

  return (
    <Grid container spacing={3}>
      {banners.map((banner) => (
        <Grid item xs={12} sm={6} md={4} key={banner.id}>
          <div
            style={{
              background: '#fff',
              border: '1px solid #EBEBEB',
              borderRadius: 12,
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.2s ease-in-out',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.04)',
                borderColor: '#1E1B4B'
              }
            }}
          >
            {/* Status & Order Badges */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', gap: 6 }}>
              {banner.isActive !== false ? (
                <Chip
                  label="Active"
                  size="small"
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', color: '#15803d',
                    fontWeight: 700, fontSize: 10, height: 22, border: '1px solid rgba(21, 128, 61, 0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
              ) : (
                <Chip
                  label="Inactive"
                  size="small"
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', color: '#64748b',
                    fontWeight: 700, fontSize: 10, height: 22, border: '1px solid rgba(100, 116, 139, 0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
              )}
              <Chip
                label={`Order: ${banner.displayOrder}`}
                size="small"
                sx={{
                  background: 'rgba(30, 27, 75, 0.9)', backdropFilter: 'blur(4px)', color: '#fff',
                  fontWeight: 700, fontSize: 10, height: 22, border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
            </div>

            {/* Quick Action Overlay (Hover) */}
            <div
              className="action-overlay"
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, padding: '12px', display: 'flex', justifyContent: 'flex-end', gap: 8,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)', opacity: 0, transition: 'opacity 0.2s', zIndex: 1,
              }}
            >
              <Tooltip title="Edit" placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onEdit(banner); }}
                  sx={{ background: '#fff', color: '#1E1B4B', '&:hover': { background: '#f5f5f5' }, width: 32, height: 32 }}
                >
                  <Edit fontSize="small" sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete" placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onDelete(banner.id); }}
                  sx={{ background: '#fff', color: '#ef4444', '&:hover': { background: '#fef2f2' }, width: 32, height: 32 }}
                >
                  <Delete fontSize="small" sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </div>

            {/* Image Graphic */}
            <div style={{ position: 'relative', width: '100%', paddingTop: '50%', background: '#FAFAF8', borderBottom: '1px solid #EBEBEB' }}>
              {banner.imageUrl ? (
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon sx={{ fontSize: 48, color: '#E0E0E0' }} />
                </div>
              )}
            </div>

            {/* Content Details */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1E1B4B', lineHeight: 1.3, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }}>
                {banner.title}
              </div>

              <div style={{ fontSize: 13, color: '#666' }}>
                <span style={{ fontWeight: 600, color: '#999', marginRight: 6 }}>Links to:</span>
                {(() => {
                  if (banner.linkType === 'category') return banner.linkTarget;
                  if (banner.linkType === 'custom_collection') {
                    const col = customCollections.find((c) => c.id === banner.linkTarget);
                    return col ? col.name : banner.linkTarget;
                  }
                  return 'Search Page';
                })()}
              </div>
            </div>

            {/* Add global CSS to handle the action-overlay hover */}
            <style dangerouslySetInnerHTML={{__html: `
              div:hover > .action-overlay {
                opacity: 1 !important;
              }
            `}} />
          </div>
        </Grid>
      ))}
    </Grid>
  );
}
