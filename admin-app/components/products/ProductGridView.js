'use client';

import { Tooltip, IconButton } from '@mui/material';
import { Edit, Archive, RestoreFromTrash, Star, StarBorder, LocalFireDepartment, FiberNew } from '@mui/icons-material';

const STATUS_META = {
  active:   { dot: '#22c55e', bg: '#f0fdf4', text: '#15803d', label: 'Active' },
  archived: { dot: '#94a3b8', bg: '#f1f5f9', text: '#475569', label: 'Archived' },
  inactive: { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', label: 'Inactive' },
  pending:  { dot: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', label: 'Pending' },
};

/**
 * ProductGridView
 * Props: same as ProductListView minus onDelete
 */
export default function ProductGridView({
  products,
  getProductStatus,
  onEdit,
  onArchive,
  onRestore,
  onQuickToggle,
}) {
  const getThumbnail = (p) => {
    const imgs = p.images || [];
    const first = imgs[0];
    if (!first) return null;
    return typeof first === 'string' ? first : first.url || null;
  };

  const getProductPrice = (p) => p.pricing?.finalPrice
    ? `₹${Number(p.pricing.finalPrice).toLocaleString('en-IN')}`
    : '—';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 16,
      padding: 20,
    }}>
      {products.length === 0 && (
        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: '#aaa', fontSize: 14 }}>
          No products found
        </div>
      )}
      {products.map((p) => {
        const thumb = getThumbnail(p);
        const status = getProductStatus(p);
        const meta = STATUS_META[status] || STATUS_META.inactive;

        return (
          <div
            key={p.productId}
            style={{
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #EBEBEB',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s, transform 0.2s',
              cursor: 'default',
              position: 'relative',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            {/* Image */}
            <div style={{ position: 'relative', width: '100%', paddingTop: '100%', background: '#F8F6F2' }}>
              {thumb ? (
                <img
                  src={thumb}
                  alt={p.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 36, color: '#D4C4A0',
                }}>
                  💎
                </div>
              )}

              {/* Edit overlay on hover */}
              <div
                className="card-overlay"
                style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(30,27,75,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}
              >
                <button
                  onClick={() => onEdit(p)}
                  style={{
                    background: '#fff', color: '#1E1B4B',
                    border: 'none', borderRadius: 6, padding: '6px 14px',
                    fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  ✎ Edit
                </button>
              </div>

              {/* Status badge overlay */}
              <div style={{
                position: 'absolute', top: 8, left: 8,
                background: meta.bg, color: meta.text,
                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                borderRadius: 99, letterSpacing: 0.3,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot }} />
                {meta.label}
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{
                fontWeight: 600, fontSize: 13, color: '#1E1B4B',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2,
              }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace', marginBottom: 6 }}>
                {p.productCode}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1E1B4B' }}>
                  {getProductPrice(p)}
                </span>
                <span style={{ fontSize: 11, color: '#888' }}>{p.category}</span>
              </div>

              {/* Tag row + quick actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: '1px solid #F3F3F1', paddingTop: 8 }}>
                <span style={{ display: 'inline-flex', gap: 2 }}>
                  <Tooltip title="DP Signature" arrow>
                    <IconButton size="small" onClick={() => onQuickToggle(p.productId, 'featured')}
                      sx={{ p: '2px', color: p.featured ? '#C9A84C' : '#D1D5DB' }}>
                      {p.featured ? <Star sx={{ fontSize: 14 }} /> : <StarBorder sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Bestseller" arrow>
                    <IconButton size="small" onClick={() => onQuickToggle(p.productId, 'bestseller')}
                      sx={{ p: '2px', color: p.bestseller ? '#ef4444' : '#D1D5DB' }}>
                      <LocalFireDepartment sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="New Arrival" arrow>
                    <IconButton size="small" onClick={() => onQuickToggle(p.productId, 'newArrival')}
                      sx={{ p: '2px', color: p.newArrival ? '#3b82f6' : '#D1D5DB' }}>
                      <FiberNew sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </span>
                {status !== 'archived' ? (
                  <Tooltip title="Archive" arrow>
                    <IconButton size="small" onClick={() => onArchive(p.productId)}
                      sx={{ p: '2px', color: '#f59e0b' }}>
                      <Archive sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Restore" arrow>
                    <IconButton size="small" onClick={() => onRestore(p.productId)}
                      sx={{ p: '2px', color: '#22c55e' }}>
                      <RestoreFromTrash sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
