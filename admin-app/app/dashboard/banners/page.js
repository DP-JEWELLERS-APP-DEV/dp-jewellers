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
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Edit, Delete, Add, Close, Image as ImageIcon } from '@mui/icons-material';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
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

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const imageUrl = await uploadImage();

      const saveBanner = httpsCallable(functions, 'saveBanner');
      await saveBanner({
        bannerId: editingBanner || undefined,
        title: formData.title,
        imageUrl,
        linkType: formData.linkType,
        linkTarget: formData.linkTarget,
        displayOrder: Number(formData.displayOrder),
        isActive: formData.isActive,
      });

      setSuccess(editingBanner ? 'Banner updated successfully!' : 'Banner created successfully!');
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
      await deleteBanner({ bannerId });
      setSuccess('Banner deleted successfully!');
      fetchBanners();
    } catch (err) {
      console.error('Error deleting banner:', err);
      setError('Failed to delete banner: ' + (err.message || ''));
    }
  };

  const columns = [
    {
      field: 'imageUrl',
      headerName: 'Image',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ py: 0.5 }}>
          {params.row.imageUrl ? (
            <img
              src={params.row.imageUrl}
              alt={params.row.title}
              style={{ width: 100, height: 50, objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <ImageIcon sx={{ color: '#ccc', fontSize: 40 }} />
          )}
        </Box>
      ),
    },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 150, sortable: true },
    {
      field: 'linkType',
      headerName: 'Link',
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.linkType === 'category' ? params.row.linkTarget : 'Search Page'}
        </Typography>
      ),
    },
    { field: 'displayOrder', headerName: 'Order', width: 80, sortable: true },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      sortable: true,
      renderCell: (params) => (
        <Chip
          label={params.row.isActive !== false ? 'Active' : 'Inactive'}
          color={params.row.isActive !== false ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Edit banner" arrow>
            <IconButton size="small" onClick={() => handleOpenDialog(params.row)} sx={{ color: '#1E1B4B', mr: 0.5 }}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete banner" arrow>
            <IconButton size="small" onClick={() => handleDelete(params.row.id)} sx={{ color: '#d32f2f' }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" className="font-bold" sx={{ color: '#1E1B4B' }}>
          Banners
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={buttonSx}
          disabled={banners.length >= MAX_BANNERS}
        >
          {banners.length >= MAX_BANNERS ? `Max ${MAX_BANNERS} Banners` : 'Add Banner'}
        </Button>
      </Box>

      {success && <Alert severity="success" className="!mb-4" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" className="!mb-4" onClose={() => setError('')}>{error}</Alert>}

      <Paper elevation={2} sx={{ backgroundColor: 'white', borderRadius: 2 }}>
        <DataGrid
          rows={banners}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          rowHeight={70}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: 'displayOrder', sort: 'asc' }] },
          }}
          pageSizeOptions={[5, 10]}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f5f5f5', fontWeight: 'bold' },
            '& .MuiDataGrid-row:hover': { backgroundColor: '#f9f9f9' },
            '& .MuiDataGrid-toolbarContainer': { p: 2, gap: 2 },
          }}
          localeText={{ noRowsLabel: 'No banners yet. Add your first banner!' }}
        />
      </Paper>

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
