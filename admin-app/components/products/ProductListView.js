'use client';

import { useState } from 'react';
import { Tooltip, IconButton } from '@mui/material';
import {
  Edit, Delete, Archive, RestoreFromTrash,
  Star, StarBorder, LocalFireDepartment, FiberNew,
} from '@mui/icons-material';
import Image from 'next/image';

// ─── tiny helpers ────────────────────────────────────────────────────────────

const STATUS_META = {
  active:   { label: 'Active',   dot: '#22c55e', bg: '#f0fdf4', text: '#15803d' },
  archived: { label: 'Archived', dot: '#94a3b8', bg: '#f1f5f9', text: '#475569' },
  inactive: { label: 'Inactive', dot: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
  pending:  { label: 'Pending',  dot: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.inactive;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 99,
      background: m.bg, color: m.text,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

function TagDots({ featured, bestseller, newArrival }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {featured   && <Tooltip title="DP Signature" arrow><span style={{ fontSize: 13 }}>⭐</span></Tooltip>}
      {bestseller && <Tooltip title="Bestseller"   arrow><span style={{ fontSize: 13 }}>🔥</span></Tooltip>}
      {newArrival && <Tooltip title="New Arrival"  arrow><span style={{ fontSize: 13 }}>🆕</span></Tooltip>}
    </span>
  );
}

const COLS = [
  { key: 'name',     label: 'Product',   flex: 3 },
  { key: 'category', label: 'Category',  flex: 1.5 },
  { key: 'weight',   label: 'Wt (g)',    flex: 1, align: 'right' },
  { key: 'price',    label: 'Price',     flex: 1.5, align: 'right' },
  { key: 'status',   label: 'Status',    flex: 1.5 },
  { key: 'actions',  label: '',          flex: 2.5, align: 'right' },
];

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ProductListView
 * Props:
 *   products        []
 *   getProductStatus (p) => string
 *   onEdit          (product) => void
 *   onDelete        (productId) => void
 *   onArchive       (productId) => void
 *   onRestore       (productId) => void
 *   onQuickToggle   (productId, field) => void
 */
export default function ProductListView({
  products,
  getProductStatus,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onQuickToggle,
}) {
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...products].sort((a, b) => {
    let aVal, bVal;
    if (sortKey === 'price') {
      aVal = a.pricing?.finalPrice || 0;
      bVal = b.pricing?.finalPrice || 0;
    } else if (sortKey === 'weight') {
      const getW = (p) => {
        const cfg = p.configurator;
        const m = cfg?.configurableMetals?.find(x => x.type === cfg.defaultMetalType) || cfg?.configurableMetals?.[0];
        return m?.variants?.[0]?.netWeight || 0;
      };
      aVal = getW(a); bVal = getW(b);
    } else if (sortKey === 'status') {
      aVal = getProductStatus(a); bVal = getProductStatus(b);
    } else {
      aVal = (a[sortKey] || '').toString().toLowerCase();
      bVal = (b[sortKey] || '').toString().toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const sortIcon = (key) => {
    if (sortKey !== key) return <span style={{ opacity: 0.25, marginLeft: 3 }}>↕</span>;
    return <span style={{ marginLeft: 3, color: '#C9A84C' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // styles
  const th = {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid #EBEBEB',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    cursor: 'pointer',
    background: '#FAFAF8',
  };
  const td = {
    padding: '10px 12px',
    fontSize: 13,
    color: '#1a1a1a',
    borderBottom: '1px solid #F3F3F1',
    verticalAlign: 'middle',
  };

  const getProductWeight = (p) => {
    const cfg = p.configurator;
    if (!cfg) return '-';
    const m = cfg.configurableMetals?.find(x => x.type === cfg.defaultMetalType) || cfg.configurableMetals?.[0];
    const v = m?.variants?.find(x => x.purity === cfg.defaultPurity) || m?.variants?.[0];
    return v?.netWeight ? `${v.netWeight}g` : '-';
  };

  const getProductPrice = (p) => p.pricing?.finalPrice
    ? `₹${Number(p.pricing.finalPrice).toLocaleString('en-IN')}`
    : '—';

  const getThumbnail = (p) => {
    const imgs = p.images || [];
    const first = imgs[0];
    if (!first) return null;
    return typeof first === 'string' ? first : first.url || null;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 52 }} />
          {COLS.map(c => <col key={c.key} style={{ flex: c.flex }} />)}
        </colgroup>
        <thead>
          <tr>
            {/* thumbnail col — no sort */}
            <th style={{ ...th, width: 52, cursor: 'default' }} />
            {COLS.map(c => (
              <th
                key={c.key}
                style={{ ...th, textAlign: c.align || 'left' }}
                onClick={() => ['name','category','weight','price','status'].includes(c.key) ? handleSort(c.key) : null}
              >
                {c.label}{['name','category','weight','price','status'].includes(c.key) ? sortIcon(c.key) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLS.length + 1} style={{ ...td, textAlign: 'center', padding: '48px 0', color: '#aaa', fontSize: 14 }}>
                No products found
              </td>
            </tr>
          )}
          {sorted.map((p, i) => {
            const thumb = getThumbnail(p);
            const status = getProductStatus(p);
            return (
              <tr
                key={p.productId}
                style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F3EE'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAF8'}
              >
                {/* Thumbnail */}
                <td style={{ ...td, padding: '8px 10px', width: 52 }}>
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={p.name}
                      style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E5E5', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: 38, height: 38, borderRadius: 6, border: '1px dashed #DDD',
                      background: '#F8F8F8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16
                    }}>💎</div>
                  )}
                </td>

                {/* Product name + code */}
                <td style={td}>
                  <div style={{ fontWeight: 600, color: '#1E1B4B', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>
                    {p.productCode}
                    {(p.featured || p.bestseller || p.newArrival) && (
                      <span style={{ marginLeft: 6 }}>
                        <TagDots featured={p.featured} bestseller={p.bestseller} newArrival={p.newArrival} />
                      </span>
                    )}
                  </div>
                </td>

                {/* Category */}
                <td style={td}>
                  <span style={{ fontSize: 12, color: '#555' }}>{p.category || '—'}</span>
                </td>

                {/* Weight */}
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontSize: 13, color: '#444' }}>{getProductWeight(p)}</span>
                </td>

                {/* Price */}
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E1B4B' }}>{getProductPrice(p)}</span>
                </td>

                {/* Status */}
                <td style={td}>
                  <StatusBadge status={status} />
                </td>

                {/* Actions */}
                <td style={{ ...td, textAlign: 'right' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
                    <Tooltip title={p.featured ? 'Remove from Signature' : 'Add to Signature'} arrow>
                      <IconButton size="small" onClick={() => onQuickToggle(p.productId, 'featured')}
                        sx={{ color: p.featured ? '#C9A84C' : '#D1D5DB' }}>
                        {p.featured ? <Star sx={{ fontSize: 16 }} /> : <StarBorder sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={p.bestseller ? 'Remove Bestseller' : 'Mark Bestseller'} arrow>
                      <IconButton size="small" onClick={() => onQuickToggle(p.productId, 'bestseller')}
                        sx={{ color: p.bestseller ? '#ef4444' : '#D1D5DB' }}>
                        <LocalFireDepartment sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={p.newArrival ? 'Remove New Tag' : 'Mark New'} arrow>
                      <IconButton size="small" onClick={() => onQuickToggle(p.productId, 'newArrival')}
                        sx={{ color: p.newArrival ? '#3b82f6' : '#D1D5DB' }}>
                        <FiberNew sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <span style={{ width: 1, height: 16, background: '#E5E7EB', margin: '0 4px', display: 'inline-block', verticalAlign: 'middle' }} />
                    <Tooltip title="Edit" arrow>
                      <IconButton size="small" onClick={() => onEdit(p)} sx={{ color: '#1E1B4B' }}>
                        <Edit sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    {status !== 'archived' ? (
                      <Tooltip title="Archive" arrow>
                        <IconButton size="small" onClick={() => onArchive(p.productId)} sx={{ color: '#f59e0b' }}>
                          <Archive sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Restore" arrow>
                        <IconButton size="small" onClick={() => onRestore(p.productId)} sx={{ color: '#22c55e' }}>
                          <RestoreFromTrash sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete" arrow>
                      <IconButton size="small" onClick={() => onDelete(p.productId)} sx={{ color: '#ef4444' }}>
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
