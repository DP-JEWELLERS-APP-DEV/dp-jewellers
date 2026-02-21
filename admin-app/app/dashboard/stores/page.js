'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Box,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import { Edit, Delete, Add, Store, Close, Search } from '@mui/icons-material';
import StoreListView from '@/components/stores/StoreListView';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

const buttonSx = {
  backgroundColor: '#1E1B4B',
  '&:hover': { backgroundColor: '#2D2963' },
  textTransform: 'none',
};

const emptyForm = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  openingHours: '',
  isActive: true,
  isPrimary: false,
};

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const listStores = httpsCallable(functions, 'listStores');
      const result = await listStores();
      setStores(result.data.stores || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError('Failed to load stores: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (store = null) => {
    if (store) {
      setEditingStore(store.id);
      setFormData({
        name: store.name || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        pincode: store.pincode || '',
        phone: store.phone || '',
        email: store.email || '',
        openingHours: store.openingHours || '',
        isActive: store.isActive !== false,
        isPrimary: store.isPrimary || false,
      });
    } else {
      setEditingStore(null);
      setFormData({ ...emptyForm });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStore(null);
    setFormData({ ...emptyForm });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.address || !formData.city) {
      setError('Please fill in required fields (Name, Address, City)');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingStore) {
        const updateStore = httpsCallable(functions, 'updateStore');
        await updateStore({ storeId: editingStore, ...formData });
        setSuccess('Store updated successfully!');
      } else {
        const createStore = httpsCallable(functions, 'createStore');
        await createStore(formData);
        setSuccess('Store created successfully!');
      }
      handleCloseDialog();
      fetchStores();
    } catch (err) {
      console.error('Error saving store:', err);
      setError('Failed to save store: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (storeId) => {
    if (!confirm('Are you sure you want to delete this store?')) return;

    try {
      const deleteStore = httpsCallable(functions, 'deleteStore');
      await deleteStore({ storeId });
      setSuccess('Store deleted successfully!');
      fetchStores();
    } catch (err) {
      console.error('Error deleting store:', err);
      setError('Failed to delete store: ' + (err.message || ''));
    }
  };

  const filteredStores = stores.filter((s) => {
    if (!searchQuery) return true;
    const sq = searchQuery.toLowerCase();
    const nameMatch = (s.name || '').toLowerCase().includes(sq);
    const addressMatch = (s.address || '').toLowerCase().includes(sq);
    const cityMatch = (s.city || '').toLowerCase().includes(sq);
    const phoneMatch = (s.phone || '').toLowerCase().includes(sq);
    return nameMatch || addressMatch || cityMatch || phoneMatch;
  });

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100%', paddingBottom: 40 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Typography variant="h4" sx={{ color: '#1E1B4B', fontWeight: 700, letterSpacing: -0.5, mb: 0.5 }}>
            Store Locations
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Manage physical stores and pickup locations.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: '#1E1B4B', color: '#fff', borderRadius: 2, padding: '8px 20px',
            textTransform: 'none', fontWeight: 600, boxShadow: 'none',
            '&:hover': { background: '#2D2963', boxShadow: 'none' }
          }}
        >
          Add Store
        </Button>
      </div>

      {success && <Alert severity="success" className="!mb-4" onClose={() => setSuccess('')} sx={{ borderRadius: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" className="!mb-4" onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}

      {/* ── Toolbar ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', padding: '16px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search stores by Name, City, or Phone..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#999' }} /></InputAdornment>,
            sx: { borderRadius: 2, background: '#FAFAF8', '& fieldset': { borderColor: '#EBEBEB' }, fontSize: 14, width: 340 }
          }}
        />
      </div>

      {/* ── Listing ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <CircularProgress sx={{ color: '#1E1B4B' }} />
        </div>
      ) : (
        <StoreListView 
          stores={filteredStores} 
          onEdit={handleOpenDialog} 
          onDelete={handleDelete} 
        />
      )}

      {/* Add/Edit Store Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Store />
            {editingStore ? 'Edit Store' : 'Add New Store'}
          </Box>
          <IconButton onClick={handleCloseDialog} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Store Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Address"
                required
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="City"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Opening Hours"
                placeholder="e.g., Mon-Sat: 10AM-8PM, Sun: 11AM-6PM"
                value={formData.openingHours}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#1E1B4B' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1E1B4B' } }}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#1E1B4B' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1E1B4B' } }}
                  />
                }
                label="Primary Store"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', color: '#666' }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={buttonSx}>
            {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : editingStore ? 'Update Store' : 'Add Store'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
