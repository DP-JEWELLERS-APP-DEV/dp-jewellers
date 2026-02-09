'use client';

import { useState, useEffect } from 'react';
import { Paper, Typography, Grid, Box, Divider, Chip } from '@mui/material';
import {
  Inventory,
  ShoppingCart,
  People,
  TrendingUp,
  CurrencyRupee,
  Diamond,
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
    <div>
      <Typography
        variant="h4"
        className="font-bold mb-6"
        sx={{ color: '#1E1B4B' }}
      >
        Dashboard Overview
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                backgroundColor: 'white',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: card.color,
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                    {card.title}
                  </Typography>
                  <Typography
                    variant="h4"
                    className="font-bold"
                    sx={{ color: '#1E1B4B' }}
                  >
                    {loading ? '...' : card.value}
                  </Typography>
                  {card.subtitle && !loading && (
                    <Typography variant="caption" sx={{ color: '#888' }}>
                      {card.subtitle}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Category-wise Product Breakdown */}
      {!loading && stats.categoryWise && Object.keys(stats.categoryWise).length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Paper elevation={2} sx={{ p: 3, backgroundColor: 'white', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Category sx={{ color: '#1E1B4B' }} />
              <Typography variant="h6" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
                Products by Category
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {Object.entries(stats.categoryWise)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <Grid item xs={6} sm={4} md={3} key={category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.5, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: '#333' }}>{category}</Typography>
                      <Chip label={count} size="small" sx={{ backgroundColor: '#E8E5F7', color: '#1E1B4B', fontWeight: 'bold' }} />
                    </Box>
                  </Grid>
                ))}
            </Grid>
          </Paper>
        </Box>
      )}

      {/* Sales Stats */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, backgroundColor: 'white', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarToday sx={{ color: '#1E1B4B' }} />
              <Typography variant="h6" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
                Today&apos;s Sales
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#666' }}>Total Sales</Typography>
                <Typography variant="h5" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
                  {loading ? '...' : formatCurrency(stats.todaySales)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#666' }}>Orders</Typography>
                <Typography variant="h5" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
                  {loading ? '...' : stats.todayOrders || 0}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, backgroundColor: 'white', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarMonth sx={{ color: '#1E1B4B' }} />
              <Typography variant="h6" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
                This Month&apos;s Sales
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#666' }}>Total Sales</Typography>
                <Typography variant="h5" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
                  {loading ? '...' : formatCurrency(stats.monthlySales)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#666' }}>Orders</Typography>
                <Typography variant="h5" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
                  {loading ? '...' : stats.monthlyOrders || 0}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Current Metal Rates */}
      <Box sx={{ mt: 4 }}>
        <Paper elevation={2} sx={{ p: 4, backgroundColor: 'white', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CurrencyRupee sx={{ color: '#1E1B4B' }} />
              <Typography variant="h6" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
                Current Metal & Diamond Rates
              </Typography>
            </Box>
            <Chip label="Read Only" size="small" variant="outlined" />
          </Box>

          {loading || !metalRates ? (
            <Typography sx={{ color: '#666' }}>Loading rates...</Typography>
          ) : (
            <Grid container spacing={3}>
              {/* Gold Rates */}
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" sx={{ color: '#666', mb: 1.5, fontWeight: 'bold' }}>
                  Gold (per gram)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">24K Gold</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.gold?.['24K'])}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">22K Gold</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.gold?.['22K'])}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">18K Gold</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.gold?.['18K'])}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">14K Gold</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.gold?.['14K'])}</Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Silver & Platinum Rates */}
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" sx={{ color: '#666', mb: 1.5, fontWeight: 'bold' }}>
                  Silver & Platinum (per gram)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">925 Sterling Silver</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.silver?.['925_sterling'])}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">999 Pure Silver</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.silver?.['999_pure'])}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">950 Platinum</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.platinum?.['950'] || metalRates.platinum?.perGram)}</Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Diamond Rates */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                  <Diamond sx={{ fontSize: 18, color: '#666' }} />
                  <Typography variant="subtitle2" sx={{ color: '#666', fontWeight: 'bold' }}>
                    Diamond (per carat)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">SI I-J</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.diamond?.SI_IJ)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">SI G-H</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.diamond?.SI_GH)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">VS G-H</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.diamond?.VS_GH)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">VVS E-F</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.diamond?.VVS_EF)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">IF D-F</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatCurrency(metalRates.diamond?.IF_DEF)}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Box>
    </div>
  );
}
