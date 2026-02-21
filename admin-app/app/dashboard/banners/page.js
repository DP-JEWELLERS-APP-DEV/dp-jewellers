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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { ViewList, GridView, Edit, Delete, Add, Close, Image as ImageIcon } from '@mui/icons-material';
import BannerListView from '@/components/banners/BannerListView';
import BannerGridView from '@/components/banners/BannerGridView';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

const MAX_BANNERS = 5;

const buttonSx = {
  backgroundColor: '#1E1B4B',
  '&:hover': { backgroundColor: '#2D2963' },
  textTransform: 'none',
};

const emptyForm = {
  title: '',
  imageUrl: '',
  linkType: 'category',
  linkTarget: '',
  displayOrder: 1,
  isActive: true,
};

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customCollections, setCustomCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [viewMode, setViewMode] = useState('grid'); // Default to grid for images
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const listBanners = httpsCallable(functions, 'listBanners');
      const result = await listBanners();
      setBanners(result.data.banners || []);
      setCategories(result.data.categories || []);
      setCustomCollections(result.data.customCollections || []);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError('Failed to load banners: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (banner = null) => {
    if (banner) {
      setEditingBanner(banner.id);
      setFormData({
        title: banner.title || '',
        imageUrl: banner.imageUrl || '',
        linkType: banner.linkType || 'category',
        linkTarget: banner.linkTarget || '',
        displayOrder: banner.displayOrder || 1,
        isActive: banner.isActive !== false,
      });
      setImagePreview(banner.imageUrl || '');
    } else {
      setEditingBanner(null);
      setFormData({ ...emptyForm });
      setImagePreview('');
    }
    setImageFile(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBanner(null);
    setFormData({ ...emptyForm });
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(editingBanner ? formData.imageUrl : '');
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.imageUrl;
    const storageRef = ref(storage, `banners/${Date.now()}_${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      setError('Please enter a banner title.');
      return;
    }
    if (!imagePreview && !imageFile) {
      setError('Please upload a banner image.');
      return;
    }
    if (formData.linkType === 'category' && !formData.linkTarget) {
      setError('Please select a category.');
      return;
    }
    if (formData.linkType === 'custom_collection' && !formData.linkTarget) {
      setError('Please select a collection.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const imageUrl = await uploadImage();

      const saveBanner = httpsCallable(functions, 'saveBanner');
      const result = await saveBanner({
        bannerId: editingBanner || undefined,
        title: formData.title,
        imageUrl,
        linkType: formData.linkType,
        linkTarget: formData.linkTarget,
        displayOrder: Number(formData.displayOrder),
        isActive: formData.isActive,
      });

      if (result.data.pendingApproval) {
        setSuccess(editingBanner ? 'Banner update submitted for approval.' : 'New banner submitted for approval. It will appear once approved.');
      } else {
        setSuccess(editingBanner ? 'Banner updated successfully!' : 'Banner created successfully!');
      }
      handleCloseDialog();
      fetchBanners();
    } catch (err) {
      console.error('Error saving banner:', err);
      setError('Failed to save banner: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bannerId) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const deleteBanner = httpsCallable(functions, 'deleteBanner');
      const result = await deleteBanner({ bannerId });
      if (result.data.pendingApproval) {
        setSuccess('Banner deletion submitted for approval.');
      } else {
        setSuccess('Banner deleted successfully!');
      }
      fetchBanners();
    } catch (err) {
      console.error('Error deleting banner:', err);
      setError('Failed to delete banner: ' + (err.message || ''));
    }
  };

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100%', paddingBottom: 40 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Typography variant="h4" sx={{ color: '#1E1B4B', fontWeight: 700, letterSpacing: -0.5, mb: 0.5 }}>
            Banners
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Manage promotional banners for the storefront. Max {MAX_BANNERS} banners.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          disabled={banners.length >= MAX_BANNERS}
          sx={{
            background: '#1E1B4B', color: '#fff', borderRadius: 2, padding: '8px 20px',
            textTransform: 'none', fontWeight: 600, boxShadow: 'none',
            '&:hover': { background: '#2D2963', boxShadow: 'none' },
            '&.Mui-disabled': { background: '#ccc', color: '#fff' }
          }}
        >
          {banners.length >= MAX_BANNERS ? `Max ${MAX_BANNERS} Banners` : 'Add Banner'}
        </Button>
      </div>

      {success && <Alert severity="success" className="!mb-4" onClose={() => setSuccess('')} sx={{ borderRadius: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" className="!mb-4" onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}

      {/* ── Toolbar ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', padding: '16px', marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, val) => val && setViewMode(val)}
          size="small"
          sx={{
            background: '#FAFAF8',
            '& .MuiToggleButton-root': { border: '1px solid #EBEBEB', color: '#888', padding: '6px 16px' },
            '& .Mui-selected': { background: '#fff !important', color: '#1E1B4B !important', border: '1px solid #1E1B4B !important', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', zIndex: 1 },
          }}
        >
          <ToggleButton value="grid"><GridView fontSize="small" /></ToggleButton>
          <ToggleButton value="list"><ViewList fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* ── Listing ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <CircularProgress sx={{ color: '#1E1B4B' }} />
        </div>
      ) : viewMode === 'list' ? (
        <BannerListView 
          banners={banners} 
          customCollections={customCollections} 
          onEdit={handleOpenDialog} 
          onDelete={handleDelete} 
        />
      ) : (
        <BannerGridView 
          banners={banners} 
          customCollections={customCollections} 
          onEdit={handleOpenDialog} 
          onDelete={handleDelete} 
        />
      )}

      {/* Add/Edit Banner Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon />
            {editingBanner ? 'Edit Banner' : 'Add New Banner'}
          </Box>
          <IconButton onClick={handleCloseDialog} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Banner Title"
                required
                multiline
                rows={2}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                helperText="Press Enter for line breaks"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Banner Image *</Typography>
              {imagePreview ? (
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
                  <img
                    src={imagePreview}
                    alt="Banner preview"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                  />
                  <IconButton
                    size="small"
                    onClick={removeImage}
                    sx={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' } }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ) : null}
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                sx={{ textTransform: 'none', color: '#1E1B4B', borderColor: '#1E1B4B' }}
              >
                {imagePreview ? 'Change Image' : 'Upload Image'}
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="On Click Go To"
                value={formData.linkType}
                onChange={(e) => setFormData({ ...formData, linkType: e.target.value, linkTarget: '' })}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="category">Category Page</MenuItem>
                <MenuItem value="custom_collection">Custom Collection</MenuItem>
                <MenuItem value="search">Search Page</MenuItem>
              </TextField>
            </Grid>
            {formData.linkType === 'category' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Select Category"
                  required
                  sx={{ minWidth: 200 }}
                  value={formData.linkTarget}
                  onChange={(e) => setFormData({ ...formData, linkTarget: e.target.value })}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            {formData.linkType === 'custom_collection' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Select Collection"
                  required
                  sx={{ minWidth: 200 }}
                  value={formData.linkTarget}
                  onChange={(e) => setFormData({ ...formData, linkTarget: e.target.value })}
                >
                  {customCollections.length === 0 ? (
                    <MenuItem disabled value="">No active collections found</MenuItem>
                  ) : (
                    customCollections.map((col) => (
                      <MenuItem key={col.id} value={col.id}>{col.name}</MenuItem>
                    ))
                  )}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                select
                label="Display Order"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                sx={{ minWidth: 200 }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </TextField>
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
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', color: '#666' }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={buttonSx}>
            {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : editingBanner ? 'Update Banner' : 'Add Banner'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
