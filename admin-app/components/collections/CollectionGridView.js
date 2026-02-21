import React from 'react';
import { Grid, IconButton, Tooltip, Chip } from '@mui/material';
import { Edit, Delete, PhotoLibrary } from '@mui/icons-material';

export default function CollectionGridView({ collections, onEdit, onDelete }) {
  if (!collections || collections.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB' }}>
        No collections found.
      </div>
    );
  }

  return (
    <Grid container spacing={3}>
      {collections.map((collection) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={collection.id}>
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
            {/* Status Badge */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
              {collection.isActive !== false ? (
                <Chip
                  label="Active"
                  size="small"
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    color: '#15803d',
                    fontWeight: 700,
                    fontSize: 10,
                    height: 22,
                    border: '1px solid rgba(21, 128, 61, 0.2)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
              ) : (
                <Chip
                  label="Inactive"
                  size="small"
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: 10,
                    height: 22,
                    border: '1px solid rgba(100, 116, 139, 0.2)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
              )}
            </div>

            {/* Quick Action Overlay (Hover) */}
            <div
              className="action-overlay"
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                padding: '12px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
                opacity: 0,
                transition: 'opacity 0.2s',
                zIndex: 1,
              }}
            >
              <Tooltip title="Edit" placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onEdit(collection); }}
                  sx={{ background: '#fff', color: '#1E1B4B', '&:hover': { background: '#f5f5f5' }, width: 32, height: 32 }}
                >
                  <Edit fontSize="small" sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete" placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onDelete(collection.id); }}
                  sx={{ background: '#fff', color: '#ef4444', '&:hover': { background: '#fef2f2' }, width: 32, height: 32 }}
                >
                  <Delete fontSize="small" sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </div>

            {/* Graphic Placeholder */}
            <div style={{ height: 140, background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #EBEBEB' }}>
              <PhotoLibrary sx={{ fontSize: 48, color: '#E0E0E0' }} />
            </div>

            {/* Content Details */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B', lineHeight: 1.2, marginBottom: 8, flex: 1 }}>
                {collection.name}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F3F1', paddingTop: 12, marginTop: 'auto' }}>
                <div style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>
                  <span style={{ color: '#1E1B4B', fontWeight: 700 }}>{(collection.productIds || []).length}</span> products
                </div>
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
