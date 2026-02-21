'use client';

import { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Grid,
  Alert,
  Box,
  OutlinedInput,
  InputLabel,
  FormControl,
  CircularProgress,
  Chip,
  InputAdornment,
} from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

const inputSx = {
  height: '44px',
  borderRadius: 2,
  background: '#FAFAF8',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#EBEBEB' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1E1B4B' },
};

const buttonSx = {
  background: '#1E1B4B',
  color: '#fff',
  borderRadius: 2,
  padding: '10px 24px',
  textTransform: 'none',
  fontWeight: 600,
  boxShadow: 'none',
  '&:hover': { background: '#2D2963', boxShadow: 'none' },
  '&.Mui-disabled': { background: '#ccc', color: '#fff' }
};

const CardWrapper = ({ title, subtitle, children }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', padding: '24px', marginBottom: '24px' }}>
    <Typography variant="h6" sx={{ color: '#1E1B4B', fontWeight: 700, mb: 0.5 }}>{title}</Typography>
    {subtitle && <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>{subtitle}</Typography>}
    {children}
  </div>
);

export default function PricingPage() {
  const [metalRates, setMetalRates] = useState({
    gold24K: '', gold22K: '', gold18K: '', gold14K: '',
    silver925: '', silver999: '',
    platinum950: '',
    diamondSI_IJ: '', diamondSI_GH: '', diamondVS_GH: '', diamondVVS_EF: '', diamondIF_DEF: '',
  });
  const [lastRateUpdate, setLastRateUpdate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      const getMetalRates = httpsCallable(functions, 'getMetalRates');
      const result = await getMetalRates();
      const data = result.data;
      setMetalRates({
        gold24K: data.gold?.['24K'] || '',
        gold22K: data.gold?.['22K'] || '',
        gold18K: data.gold?.['18K'] || '',
        gold14K: data.gold?.['14K'] || '',
        silver925: data.silver?.['925_sterling'] || '',
        silver999: data.silver?.['999_pure'] || '',
        platinum950: data.platinum?.['950'] || data.platinum?.perGram || '',
        diamondSI_IJ: data.diamond?.SI_IJ || '',
        diamondSI_GH: data.diamond?.SI_GH || '',
        diamondVS_GH: data.diamond?.VS_GH || '',
        diamondVVS_EF: data.diamond?.VVS_EF || '',
        diamondIF_DEF: data.diamond?.IF_DEF || '',
      });
      if (data.updatedAt) {
        setLastRateUpdate(data.updatedAt._seconds ? new Date(data.updatedAt._seconds * 1000) : new Date(data.updatedAt));
      }
    } catch (err) {
      console.error('Error fetching pricing data:', err);
      setError('Failed to load pricing data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleMetalRatesUpdate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateMetalRates = httpsCallable(functions, 'updateMetalRates');
      const result = await updateMetalRates({
        gold: {
          '24K': Number(metalRates.gold24K) || 0,
          '22K': Number(metalRates.gold22K) || 0,
          '18K': Number(metalRates.gold18K) || 0,
          '14K': Number(metalRates.gold14K) || 0,
        },
        silver: {
          '925_sterling': Number(metalRates.silver925) || 0,
          '999_pure': Number(metalRates.silver999) || 0,
        },
        platinum: {
          '950': Number(metalRates.platinum950) || 0,
          perGram: Number(metalRates.platinum950) || 0,
        },
        diamond: {
          SI_IJ: Number(metalRates.diamondSI_IJ) || 0,
          SI_GH: Number(metalRates.diamondSI_GH) || 0,
          VS_GH: Number(metalRates.diamondVS_GH) || 0,
          VVS_EF: Number(metalRates.diamondVVS_EF) || 0,
          IF_DEF: Number(metalRates.diamondIF_DEF) || 0,
        },
      });
      if (result.data.pendingApproval) {
        setSuccess('Rate changes submitted for super admin approval. Current rates remain unchanged until approved.');
      } else {
        setLastRateUpdate(new Date());
        setSuccess('Metal rates updated! All product prices will be recalculated automatically.');
      }
    } catch (err) {
      setError('Failed to update metal rates: ' + (err.message || ''));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#1E1B4B' }} />
      </Box>
    );
  }

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100%', paddingBottom: 40 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Typography variant="h4" sx={{ color: '#1E1B4B', fontWeight: 700, letterSpacing: -0.5, mb: 0.5 }}>
            Pricing Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', display: 'flex', alignItems: 'center', gap: 1 }}>
            Manage daily metal and diamond rates.
            {lastRateUpdate && (
              <Chip
                icon={<AccessTime sx={{ fontSize: 14 }} />}
                label={`Last updated: ${lastRateUpdate.toLocaleString('en-IN')}`}
                size="small"
                sx={{ ml: 1, background: '#fff', border: '1px solid #EBEBEB', color: '#666', fontWeight: 500, height: 24, '& .MuiChip-icon': { color: '#666' } }}
              />
            )}
          </Typography>
        </div>
        <Button
          variant="contained"
          onClick={handleMetalRatesUpdate}
          disabled={saving}
          sx={buttonSx}
        >
          {saving ? 'Saving...' : 'Update All Rates'}
        </Button>
      </div>

      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          {/* Gold Rates Card */}
          <CardWrapper 
            title="Gold Rates (per gram)" 
            subtitle="Update daily gold rates. Product prices will recalculate based on their purity."
          >
            <Grid container spacing={3}>
              {['24K', '22K', '18K', '14K'].map((k) => (
                <Grid item xs={12} sm={6} md={3} key={k}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#666', '&.Mui-focused': { color: '#1E1B4B' } }}>{k} Gold</InputLabel>
                    <OutlinedInput 
                      type="number" 
                      label={`${k} Gold`}
                      value={metalRates[`gold${k}`]}
                      onChange={(e) => setMetalRates({ ...metalRates, [`gold${k}`]: e.target.value })}
                      startAdornment={<InputAdornment position="start">₹</InputAdornment>}
                      sx={inputSx}
                    />
                  </FormControl>
                </Grid>
              ))}
            </Grid>
          </CardWrapper>

          {/* Silver & Platinum Rates Card */}
          <CardWrapper title="Silver & Platinum Rates (per gram)">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#666', '&.Mui-focused': { color: '#1E1B4B' } }}>925 Sterling Silver</InputLabel>
                  <OutlinedInput 
                    type="number" 
                    label="925 Sterling Silver"
                    value={metalRates.silver925}
                    onChange={(e) => setMetalRates({ ...metalRates, silver925: e.target.value })}
                    startAdornment={<InputAdornment position="start">₹</InputAdornment>}
                    sx={inputSx}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#666', '&.Mui-focused': { color: '#1E1B4B' } }}>999 Pure Silver</InputLabel>
                  <OutlinedInput 
                    type="number" 
                    label="999 Pure Silver"
                    value={metalRates.silver999}
                    onChange={(e) => setMetalRates({ ...metalRates, silver999: e.target.value })}
                    startAdornment={<InputAdornment position="start">₹</InputAdornment>}
                    sx={inputSx}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#666', '&.Mui-focused': { color: '#1E1B4B' } }}>950 Platinum</InputLabel>
                  <OutlinedInput 
                    type="number" 
                    label="950 Platinum"
                    value={metalRates.platinum950}
                    onChange={(e) => setMetalRates({ ...metalRates, platinum950: e.target.value })}
                    startAdornment={<InputAdornment position="start">₹</InputAdornment>}
                    sx={inputSx}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </CardWrapper>

          {/* Diamond Rates Card */}
          <CardWrapper 
            title="Diamond Rates (per carat)" 
            subtitle="Set baseline rates for various clarity-color grade combinations."
          >
            <Grid container spacing={3}>
              {[
                { label: 'SI I-J', key: 'diamondSI_IJ' },
                { label: 'SI G-H', key: 'diamondSI_GH' },
                { label: 'VS G-H', key: 'diamondVS_GH' },
                { label: 'VVS E-F', key: 'diamondVVS_EF' },
                { label: 'IF D-F', key: 'diamondIF_DEF' },
              ].map((d) => (
                <Grid item xs={12} sm={6} md={4} key={d.key}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#666', '&.Mui-focused': { color: '#1E1B4B' } }}>{d.label}</InputLabel>
                    <OutlinedInput 
                      type="number" 
                      label={d.label}
                      value={metalRates[d.key]}
                      onChange={(e) => setMetalRates({ ...metalRates, [d.key]: e.target.value })}
                      startAdornment={<InputAdornment position="start">₹</InputAdornment>}
                      sx={inputSx}
                    />
                  </FormControl>
                </Grid>
              ))}
            </Grid>
          </CardWrapper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', padding: '24px', position: 'sticky', top: 24 }}>
            <Typography variant="h6" sx={{ color: '#1E1B4B', fontWeight: 700, mb: 2 }}>Summary & Actions</Typography>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
              Updating metal and diamond rates will automatically trigger a recalculation of all dynamic product prices in the catalog.
              <br /><br />
              Please double-check your inputs before saving. Current rates will remain untouched until approved if a maker-checker workflow is enabled.
            </div>
            <Button
              variant="contained"
              onClick={handleMetalRatesUpdate}
              disabled={saving}
              fullWidth
              sx={{ ...buttonSx, py: 1.5 }}
            >
              {saving ? 'Applying Updates...' : 'Publish New Rates'}
            </Button>
          </div>
        </Grid>
      </Grid>
    </div>
  );
}
