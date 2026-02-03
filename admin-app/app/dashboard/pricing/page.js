'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  Divider,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  OutlinedInput,
  InputLabel,
  FormControl,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Edit, Delete, Add, AccessTime } from '@mui/icons-material';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

const jewelryTypes = ['Ring', 'Necklace', 'Earring', 'Bangle', 'Bracelet', 'Pendant', 'Chain', 'Anklet', 'Mangalsutra', 'Kada', 'Nosering'];

const inputSx = {
  height: '40px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#000' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1E1B4B' },
};

const buttonSx = {
  backgroundColor: '#1E1B4B',
  '&:hover': { backgroundColor: '#2D2963' },
  textTransform: 'none',
  height: '40px',
  px: 3,
};

export default function PricingPage() {
  // Metal Rates State
  const [metalRates, setMetalRates] = useState({
    gold24K: '', gold22K: '', gold18K: '', gold14K: '',
    silver925: '', silver999: '',
    diamondSI_IJ: '', diamondSI_GH: '', diamondVS_GH: '', diamondVVS_EF: '', diamondIF_DEF: '',
  });
  const [lastRateUpdate, setLastRateUpdate] = useState(null);

  // Tax State
  const [taxJewelry, setTaxJewelry] = useState('');
  const [taxMaking, setTaxMaking] = useState('');

  // Making Charges State
  const [globalMaking, setGlobalMaking] = useState({ chargeType: 'percentage', value: '' });
  const [globalWastage, setGlobalWastage] = useState({ chargeType: 'percentage', value: '' });
  const [makingCharge, setMakingCharge] = useState({
    jewelryType: '',
    chargeType: 'percentage',
    value: '',
  });
  const [makingCharges, setMakingCharges] = useState([]);
  const [editingCharge, setEditingCharge] = useState(null);

  // UI State
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
      // Fetch metal rates from metalRates/current
      const ratesDoc = await getDoc(doc(db, 'metalRates', 'current'));
      if (ratesDoc.exists()) {
        const data = ratesDoc.data();
        setMetalRates({
          gold24K: data.gold?.['24K'] || '',
          gold22K: data.gold?.['22K'] || '',
          gold18K: data.gold?.['18K'] || '',
          gold14K: data.gold?.['14K'] || '',
          silver925: data.silver?.['925_sterling'] || '',
          silver999: data.silver?.['999_pure'] || '',
          diamondSI_IJ: data.diamond?.SI_IJ || '',
          diamondSI_GH: data.diamond?.SI_GH || '',
          diamondVS_GH: data.diamond?.VS_GH || '',
          diamondVVS_EF: data.diamond?.VVS_EF || '',
          diamondIF_DEF: data.diamond?.IF_DEF || '',
        });
        if (data.updatedAt) {
          setLastRateUpdate(data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt));
        }
      }

      // Fetch tax settings from taxSettings/current
      const taxDoc = await getDoc(doc(db, 'taxSettings', 'current'));
      if (taxDoc.exists()) {
        const data = taxDoc.data();
        setTaxJewelry(data.gst?.jewelry || '');
        setTaxMaking(data.gst?.makingCharges || '');
      }

      // Fetch making charges from makingCharges/current
      const makingDoc = await getDoc(doc(db, 'makingCharges', 'current'));
      if (makingDoc.exists()) {
        const data = makingDoc.data();
        setMakingCharges(data.charges || []);
        if (data.globalDefault) {
          setGlobalMaking({
            chargeType: data.globalDefault.chargeType || 'percentage',
            value: data.globalDefault.value ?? '',
          });
        }
        if (data.globalWastage) {
          setGlobalWastage({
            chargeType: data.globalWastage.chargeType || 'percentage',
            value: data.globalWastage.value ?? '',
          });
        }
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
      const ratesData = {
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
        diamond: {
          SI_IJ: Number(metalRates.diamondSI_IJ) || 0,
          SI_GH: Number(metalRates.diamondSI_GH) || 0,
          VS_GH: Number(metalRates.diamondVS_GH) || 0,
          VVS_EF: Number(metalRates.diamondVVS_EF) || 0,
          IF_DEF: Number(metalRates.diamondIF_DEF) || 0,
        },
        updatedBy: auth.currentUser?.uid || '',
        updatedAt: serverTimestamp(),
        effectiveFrom: serverTimestamp(),
      };

      await setDoc(doc(db, 'metalRates', 'current'), ratesData, { merge: true });
      setLastRateUpdate(new Date());
      setSuccess('Metal rates updated! All product prices will be recalculated automatically.');
    } catch (err) {
      setError('Failed to update metal rates: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTaxUpdate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await setDoc(doc(db, 'taxSettings', 'current'), {
        gst: {
          jewelry: Number(taxJewelry) || 3,
          makingCharges: Number(taxMaking) || 5,
          applicationType: 'exclusive',
        },
        updatedAt: serverTimestamp(),
      });
      setSuccess('Tax settings updated successfully!');
    } catch (err) {
      setError('Failed to update tax settings: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMakingCharge = async () => {
    if (!makingCharge.jewelryType || !makingCharge.value) {
      setError('Please fill in all making charge fields');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let updatedCharges;

      if (editingCharge !== null) {
        updatedCharges = makingCharges.map((c, i) =>
          i === editingCharge ? { ...makingCharge, value: Number(makingCharge.value) } : c
        );
      } else {
        const exists = makingCharges.find(
          (c) => c.jewelryType.toLowerCase() === makingCharge.jewelryType.toLowerCase()
        );
        if (exists) {
          setError(`Making charge for ${makingCharge.jewelryType} already exists. Edit it instead.`);
          setSaving(false);
          return;
        }
        updatedCharges = [...makingCharges, { ...makingCharge, value: Number(makingCharge.value) }];
      }

      await setDoc(doc(db, 'makingCharges', 'current'), {
        globalDefault: {
          chargeType: globalMaking.chargeType,
          value: Number(globalMaking.value) || 0,
        },
        globalWastage: {
          chargeType: globalWastage.chargeType,
          value: Number(globalWastage.value) || 0,
        },
        charges: updatedCharges,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || '',
      });

      setMakingCharges(updatedCharges);
      setSuccess(editingCharge !== null ? 'Making charge updated!' : 'Making charge added!');
      setMakingCharge({ jewelryType: '', chargeType: 'percentage', value: '' });
      setEditingCharge(null);
    } catch (err) {
      setError('Failed to save making charge: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCharge = (index) => {
    const charge = makingCharges[index];
    setMakingCharge({
      jewelryType: charge.jewelryType,
      chargeType: charge.chargeType,
      value: String(charge.value),
    });
    setEditingCharge(index);
  };

  const handleDeleteCharge = async (index) => {
    if (!confirm('Are you sure you want to delete this making charge?')) return;

    setSaving(true);
    try {
      const updatedCharges = makingCharges.filter((_, i) => i !== index);

      await setDoc(doc(db, 'makingCharges', 'current'), {
        globalDefault: {
          chargeType: globalMaking.chargeType,
          value: Number(globalMaking.value) || 0,
        },
        globalWastage: {
          chargeType: globalWastage.chargeType,
          value: Number(globalWastage.value) || 0,
        },
        charges: updatedCharges,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || '',
      });

      setMakingCharges(updatedCharges);
      setSuccess('Making charge deleted!');
    } catch (err) {
      setError('Failed to delete making charge: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setMakingCharge({ jewelryType: '', chargeType: 'percentage', value: '' });
    setEditingCharge(null);
  };

  const handleGlobalDefaultsUpdate = async () => {
    if (!globalMaking.value) {
      setError('Please set a global making charge value');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await setDoc(doc(db, 'makingCharges', 'current'), {
        globalDefault: {
          chargeType: globalMaking.chargeType,
          value: Number(globalMaking.value) || 0,
        },
        globalWastage: {
          chargeType: globalWastage.chargeType,
          value: Number(globalWastage.value) || 0,
        },
        charges: makingCharges,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || '',
      });
      setSuccess('Global defaults updated! These apply to all categories without a specific override.');
    } catch (err) {
      setError('Failed to save global defaults: ' + err.message);
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
    <div>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" className="font-bold" sx={{ color: '#1E1B4B' }}>
          Pricing Management
        </Typography>
        {lastRateUpdate && (
          <Chip
            icon={<AccessTime />}
            label={`Last updated: ${lastRateUpdate.toLocaleString('en-IN')}`}
            variant="outlined"
            size="small"
          />
        )}
      </Box>

      {success && <Alert severity="success" className="!mb-4" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" className="!mb-4" onClose={() => setError('')}>{error}</Alert>}

      {/* Metal Rates Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: 'white', borderRadius: 2 }}>
        <Typography variant="h6" className="!mb-2" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Gold Rates (per gram)
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
          Update daily gold rates. All product prices will recalculate automatically.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>24K Gold (₹/gram)</InputLabel>
              <OutlinedInput type="number" label="24K Gold (₹/gram)"
                value={metalRates.gold24K}
                onChange={(e) => setMetalRates({ ...metalRates, gold24K: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>22K Gold (₹/gram)</InputLabel>
              <OutlinedInput type="number" label="22K Gold (₹/gram)"
                value={metalRates.gold22K}
                onChange={(e) => setMetalRates({ ...metalRates, gold22K: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>18K Gold (₹/gram)</InputLabel>
              <OutlinedInput type="number" label="18K Gold (₹/gram)"
                value={metalRates.gold18K}
                onChange={(e) => setMetalRates({ ...metalRates, gold18K: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>14K Gold (₹/gram)</InputLabel>
              <OutlinedInput type="number" label="14K Gold (₹/gram)"
                value={metalRates.gold14K}
                onChange={(e) => setMetalRates({ ...metalRates, gold14K: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
        </Grid>

        <Typography variant="h6" className="!mt-6 !mb-2" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Silver Rates (per gram)
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>925 Sterling (₹/gram)</InputLabel>
              <OutlinedInput type="number" label="925 Sterling (₹/gram)"
                value={metalRates.silver925}
                onChange={(e) => setMetalRates({ ...metalRates, silver925: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>999 Pure (₹/gram)</InputLabel>
              <OutlinedInput type="number" label="999 Pure (₹/gram)"
                value={metalRates.silver999}
                onChange={(e) => setMetalRates({ ...metalRates, silver999: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
        </Grid>

        <Typography variant="h6" className="!mt-6 !mb-2" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Diamond Rates (per carat)
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          Rates by clarity-color grade combination.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>SI I-J (₹/ct)</InputLabel>
              <OutlinedInput type="number" label="SI I-J (₹/ct)"
                value={metalRates.diamondSI_IJ}
                onChange={(e) => setMetalRates({ ...metalRates, diamondSI_IJ: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>SI G-H (₹/ct)</InputLabel>
              <OutlinedInput type="number" label="SI G-H (₹/ct)"
                value={metalRates.diamondSI_GH}
                onChange={(e) => setMetalRates({ ...metalRates, diamondSI_GH: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>VS G-H (₹/ct)</InputLabel>
              <OutlinedInput type="number" label="VS G-H (₹/ct)"
                value={metalRates.diamondVS_GH}
                onChange={(e) => setMetalRates({ ...metalRates, diamondVS_GH: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>VVS E-F (₹/ct)</InputLabel>
              <OutlinedInput type="number" label="VVS E-F (₹/ct)"
                value={metalRates.diamondVVS_EF}
                onChange={(e) => setMetalRates({ ...metalRates, diamondVVS_EF: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>IF D-F (₹/ct)</InputLabel>
              <OutlinedInput type="number" label="IF D-F (₹/ct)"
                value={metalRates.diamondIF_DEF}
                onChange={(e) => setMetalRates({ ...metalRates, diamondIF_DEF: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleMetalRatesUpdate}
            disabled={saving}
            size="small"
            sx={buttonSx}
          >
            {saving ? 'Saving...' : 'Update All Rates'}
          </Button>
        </Box>
      </Paper>

      {/* Tax Rate Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: 'white', borderRadius: 2 }}>
        <Typography variant="h6" className="font-bold !mb-2" sx={{ color: '#1E1B4B' }}>
          Tax Configuration
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
          GST rates applied to jewelry and making charges.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>GST on Jewelry (%)</InputLabel>
              <OutlinedInput type="number" label="GST on Jewelry (%)"
                value={taxJewelry}
                onChange={(e) => setTaxJewelry(e.target.value)}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>GST on Making Charges (%)</InputLabel>
              <OutlinedInput type="number" label="GST on Making Charges (%)"
                value={taxMaking}
                onChange={(e) => setTaxMaking(e.target.value)}
                sx={inputSx}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleTaxUpdate}
              disabled={saving}
              size="small"
              sx={buttonSx}
            >
              {saving ? 'Saving...' : 'Update Tax Settings'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Global Defaults Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: 'white', borderRadius: 2 }}>
        <Typography variant="h6" className="font-bold !mb-2" sx={{ color: '#1E1B4B' }}>
          Global Making & Wastage Charges
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
          Default charges applied to all jewelry categories. Category-specific overrides (below) take priority over these values.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ color: '#1E1B4B', mb: 1 }}>Making Charges (Default)</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" select label="Charge Type"
              value={globalMaking.chargeType}
              onChange={(e) => setGlobalMaking({ ...globalMaking, chargeType: e.target.value })}
              variant="outlined"
            >
              <MenuItem value="percentage">Percentage (%)</MenuItem>
              <MenuItem value="flat_per_gram">Flat per gram (₹)</MenuItem>
              <MenuItem value="fixed_amount">Fixed amount (₹)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>{globalMaking.chargeType === 'percentage' ? 'Value (%)' : 'Value (₹)'}</InputLabel>
              <OutlinedInput type="number"
                label={globalMaking.chargeType === 'percentage' ? 'Value (%)' : 'Value (₹)'}
                value={globalMaking.value}
                onChange={(e) => setGlobalMaking({ ...globalMaking, value: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ color: '#1E1B4B', mb: 1 }}>Wastage Charges (Default)</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" select label="Charge Type"
              value={globalWastage.chargeType}
              onChange={(e) => setGlobalWastage({ ...globalWastage, chargeType: e.target.value })}
              variant="outlined"
            >
              <MenuItem value="percentage">Percentage (%)</MenuItem>
              <MenuItem value="fixed">Fixed (₹)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>{globalWastage.chargeType === 'percentage' ? 'Value (%)' : 'Value (₹)'}</InputLabel>
              <OutlinedInput type="number"
                label={globalWastage.chargeType === 'percentage' ? 'Value (%)' : 'Value (₹)'}
                value={globalWastage.value}
                onChange={(e) => setGlobalWastage({ ...globalWastage, value: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" onClick={handleGlobalDefaultsUpdate} disabled={saving}
              size="small" sx={buttonSx}>
              {saving ? 'Saving...' : 'Save Global Defaults'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Category-Specific Making Charges Section */}
      <Paper elevation={2} sx={{ p: 4, backgroundColor: 'white', borderRadius: 2 }}>
        <Typography variant="h6" className="font-bold !mb-2" sx={{ color: '#1E1B4B' }}>
          Category Overrides
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
          Override making charges for specific jewelry categories. If a category is not listed here, the global default above is used.
        </Typography>

        <Grid container spacing={3} className="!mb-6">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth size="small" select
              label="Jewelry Type"
              value={makingCharge.jewelryType}
              onChange={(e) => setMakingCharge({ ...makingCharge, jewelryType: e.target.value })}
              variant="outlined"
              sx={{ minWidth: '200px' }}
            >
              {jewelryTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth size="small" select
              label="Charge Type"
              value={makingCharge.chargeType}
              onChange={(e) => setMakingCharge({ ...makingCharge, chargeType: e.target.value })}
              variant="outlined"
            >
              <MenuItem value="percentage">Percentage (%)</MenuItem>
              <MenuItem value="flat_per_gram">Flat per gram (₹)</MenuItem>
              <MenuItem value="fixed_amount">Fixed amount (₹)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>
                {makingCharge.chargeType === 'percentage' ? 'Value (%)' : 'Value (₹)'}
              </InputLabel>
              <OutlinedInput
                type="number"
                label={makingCharge.chargeType === 'percentage' ? 'Value (%)' : 'Value (₹)'}
                value={makingCharge.value}
                onChange={(e) => setMakingCharge({ ...makingCharge, value: e.target.value })}
                sx={inputSx}
              />
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth variant="contained"
                onClick={handleAddMakingCharge}
                disabled={saving}
                size="small"
                sx={buttonSx}
                startIcon={editingCharge !== null ? <Edit /> : <Add />}
              >
                {editingCharge !== null ? 'Update' : 'Add'}
              </Button>
              {editingCharge !== null && (
                <Button
                  variant="outlined" size="small"
                  onClick={handleCancelEdit}
                  sx={{ textTransform: 'none', height: '40px', borderColor: '#1E1B4B', color: '#1E1B4B' }}
                >
                  Cancel
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>

        <Divider className="!mb-4" />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Jewelry Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Charge Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {makingCharges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: '#999' }}>
                    No making charges added yet
                  </TableCell>
                </TableRow>
              ) : (
                makingCharges.map((charge, index) => (
                  <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                    <TableCell>{charge.jewelryType}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          charge.chargeType === 'percentage' ? 'Percentage' :
                          charge.chargeType === 'flat_per_gram' ? 'Per Gram' : 'Fixed'
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {charge.chargeType === 'percentage'
                        ? `${charge.value}%`
                        : `₹${Number(charge.value).toLocaleString('en-IN')}`}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEditCharge(index)}
                        sx={{ color: '#1E1B4B', mr: 1 }}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteCharge(index)}
                        sx={{ color: '#d32f2f' }}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}
