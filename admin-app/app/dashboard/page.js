'use client';

import { useState, useEffect } from 'react';
import { Paper, Typography, Grid, Box, Divider, Chip } from '@mui/material';
import {
  Inventory,
  ShoppingCart,
  People,
  TrendingUp,
  CurrencyRupee,
  CalendarToday,
  CalendarMonth,
  RemoveShoppingCart,
  Category,
} from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalAllProducts: 0,
    outOfStockCount: 0,
    categoryWise: {},
    totalOrders: 0,
    totalUsers: 0,
    pendingOrders: 0,
    todaySales: 0,
    todayOrders: 0,
    monthlySales: 0,
    monthlyOrders: 0,
  });
  const [metalRates, setMetalRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResult, ratesResult] = await Promise.all([
          httpsCallable(functions, 'getDashboardStats')(),
          httpsCallable(functions, 'getMetalRates')(),
        ]);
        setStats(statsResult.data);
        setMetalRates(ratesResult.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalAllProducts || stats.totalProducts,
      subtitle: `${stats.totalProducts} Active`,
      icon: <Inventory sx={{ fontSize: 40, color: '#1E1B4B' }} />,
      color: '#E8E5F7',
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStockCount || 0,
      icon: <RemoveShoppingCart sx={{ fontSize: 40, color: '#1E1B4B' }} />,
      color: '#FFE0E0',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: <ShoppingCart sx={{ fontSize: 40, color: '#1E1B4B' }} />,
      color: '#FFE8CC',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: <TrendingUp sx={{ fontSize: 40, color: '#1E1B4B' }} />,
      color: '#FFE0E0',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <People sx={{ fontSize: 40, color: '#1E1B4B' }} />,
      color: '#D4F4DD',
    },
  ];

  const formatCurrency = (value) => {
    if (!value) return '₹0';
    return `₹${Number(value).toLocaleString('en-IN')}`;
  };

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100%', paddingBottom: 40 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <Typography variant="h4" sx={{ color: '#1E1B4B', fontWeight: 700, letterSpacing: -0.5, mb: 0.5 }}>
          Dashboard Overview
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          Welcome back to the DP Jewellers admin center.
        </Typography>
      </div>

      {/* ── Top Summary Track ── */}
      <Grid container spacing={2}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <div style={{
              background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10,
              padding: '16px 20px', height: '100%', display: 'flex', alignItems: 'center', gap: 16
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 8, background: card.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {card.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B', lineHeight: 1.1 }}>
                  {loading ? '...' : card.value}
                </div>
                {card.subtitle && !loading && (
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    {card.subtitle}
                  </div>
                )}
              </div>
            </div>
          </Grid>
        ))}
      </Grid>

      {/* ── Category Breakdown ── */}
      {!loading && stats.categoryWise && Object.keys(stats.categoryWise).length > 0 && (
        <div style={{ marginTop: 24, background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Category sx={{ color: '#1E1B4B', fontSize: 20 }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B' }}>Products by Category</span>
          </div>
          <Grid container spacing={2}>
            {Object.entries(stats.categoryWise)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <Grid item xs={6} sm={4} md={2.4} key={category}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: '#FAFAF8', border: '1px solid #F3F3F1', borderRadius: 8
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>{category}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1E1B4B', background: '#E8E5F7', padding: '2px 8px', borderRadius: 99 }}>
                      {count}
                    </span>
                  </div>
                </Grid>
              ))}
          </Grid>
        </div>
      )}

      {/* ── Sales Stats ── */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <CalendarToday sx={{ color: '#1E1B4B', fontSize: 20 }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B' }}>Today&apos;s Sales</span>
            </div>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Total Sales</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B' }}>{loading ? '...' : formatCurrency(stats.todaySales)}</div>
              </Grid>
              <Grid item xs={6}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Orders</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B' }}>{loading ? '...' : stats.todayOrders || 0}</div>
              </Grid>
            </Grid>
          </div>
        </Grid>
        <Grid item xs={12} md={6}>
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <CalendarMonth sx={{ color: '#1E1B4B', fontSize: 20 }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B' }}>This Month&apos;s Sales</span>
            </div>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Total Sales</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B' }}>{loading ? '...' : formatCurrency(stats.monthlySales)}</div>
              </Grid>
              <Grid item xs={6}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Orders</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B' }}>{loading ? '...' : stats.monthlyOrders || 0}</div>
              </Grid>
            </Grid>
          </div>
        </Grid>
      </Grid>

      {/* ── Current Metal Rates ── */}
      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CurrencyRupee sx={{ color: '#1E1B4B', fontSize: 20 }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B' }}>Current Metal & Diamond Rates</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', background: '#FAFAF8', padding: '4px 10px', borderRadius: 99, border: '1px solid #E5E5E5', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Read Only
          </span>
        </div>

        {loading || !metalRates ? (
          <div style={{ color: '#888', fontSize: 14 }}>Loading rates...</div>
        ) : (
          <Grid container spacing={4}>
            {/* Gold Rates */}
            <Grid item xs={12} md={4}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Gold (per gram)</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {['24K', '22K', '18K', '14K'].map((k) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F3F1' }}>
                    <span style={{ fontSize: 14, color: '#444' }}>{k} Gold</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{formatCurrency(metalRates.gold?.[k])}</span>
                  </div>
                ))}
              </div>
            </Grid>

            {/* Silver & Platinum Rates */}
            <Grid item xs={12} md={4}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Silver & Platinum (per gram)</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F3F1' }}>
                  <span style={{ fontSize: 14, color: '#444' }}>925 Sterling Silver</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{formatCurrency(metalRates.silver?.['925_sterling'])}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F3F1' }}>
                  <span style={{ fontSize: 14, color: '#444' }}>999 Pure Silver</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{formatCurrency(metalRates.silver?.['999_pure'])}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F3F1' }}>
                  <span style={{ fontSize: 14, color: '#444' }}>950 Platinum</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{formatCurrency(metalRates.platinum?.['950'] || metalRates.platinum?.perGram)}</span>
                </div>
              </div>
            </Grid>

            {/* Diamond Rates */}
            <Grid item xs={12} md={4}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Diamond (per carat)</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { label: 'SI I-J', key: 'SI_IJ' },
                  { label: 'SI G-H', key: 'SI_GH' },
                  { label: 'VS G-H', key: 'VS_GH' },
                  { label: 'VVS E-F', key: 'VVS_EF' },
                  { label: 'IF D-F', key: 'IF_DEF' },
                ].map((item) => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F3F1' }}>
                    <span style={{ fontSize: 14, color: '#444' }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{formatCurrency(metalRates.diamond?.[item.key])}</span>
                  </div>
                ))}
              </div>
            </Grid>
          </Grid>
        )}
      </div>
    </div>
  );
}
