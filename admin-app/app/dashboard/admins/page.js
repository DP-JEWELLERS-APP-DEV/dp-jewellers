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
  FormControlLabel,
  Checkbox,
  FormGroup,
  Tooltip,
  Divider,
  InputAdornment,
} from '@mui/material';
import { Edit, Block, CheckCircle, PersonAdd, Search } from '@mui/icons-material';
import AdminListView from '@/components/admins/AdminListView';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

const PERMISSION_OPTIONS = [
  { key: 'manageProducts', label: 'Manage Products' },
  { key: 'manageOrders', label: 'Manage Orders' },
  { key: 'manageRates', label: 'Manage Rates' },
  { key: 'managePromotions', label: 'Manage Promotions' },
  { key: 'manageUsers', label: 'Manage Users' },
];

const buttonSx = {
  backgroundColor: '#1E1B4B',
  '&:hover': { backgroundColor: '#2D2963' },
  textTransform: 'none',
};

const formatRoleLabel = (role) => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'editor':
      return 'Editor';
    default:
      return role;
  }
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create admin dialog
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', role: 'admin' });

  // Edit admin dialog
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editForm, setEditForm] = useState({
    role: 'admin',
    permissions: {
      manageProducts: false,
      manageOrders: false,
      manageRates: false,
      managePromotions: false,
      manageUsers: false,
    },
    skipApproval: false,
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const listAdmins = httpsCallable(functions, 'listAdmins');
      const result = await listAdmins();
      setAdmins(result.data.admins || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError('Failed to load admins: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!createForm.email) {
      setError('Email is required');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const createAdmin = httpsCallable(functions, 'createAdmin');
      const result = await createAdmin({ email: createForm.email, role: createForm.role });
      setSuccess(result.data.message || 'Admin created successfully!');
      setOpenCreateDialog(false);
      setCreateForm({ email: '', role: 'admin' });
      fetchAdmins();
    } catch (err) {
      console.error('Error creating admin:', err);
      setError('Failed to create admin: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      role: admin.role || 'admin',
      permissions: {
        manageProducts: admin.permissions?.manageProducts || false,
        manageOrders: admin.permissions?.manageOrders || false,
        manageRates: admin.permissions?.manageRates || false,
        managePromotions: admin.permissions?.managePromotions || false,
        manageUsers: admin.permissions?.manageUsers || false,
      },
      skipApproval: admin.skipApproval || false,
    });
    setOpenEditDialog(true);
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateAdmin = httpsCallable(functions, 'updateAdmin');
      await updateAdmin({
        uid: selectedAdmin.uid,
        role: editForm.role,
        permissions: editForm.permissions,
        skipApproval: editForm.skipApproval,
      });
      setSuccess('Admin updated successfully!');
      setOpenEditDialog(false);
      setSelectedAdmin(null);
      fetchAdmins();
    } catch (err) {
      console.error('Error updating admin:', err);
      setError('Failed to update admin: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateAdmin = async (admin) => {
    if (!confirm(`Are you sure you want to deactivate ${admin.email}?`)) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const deactivateAdmin = httpsCallable(functions, 'deactivateAdmin');
      await deactivateAdmin({ uid: admin.uid });
      setSuccess(`Admin ${admin.email} deactivated successfully!`);
      fetchAdmins();
    } catch (err) {
      console.error('Error deactivating admin:', err);
      setError('Failed to deactivate admin: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateAdmin = async (admin) => {
    if (!confirm(`Are you sure you want to reactivate ${admin.email}?`)) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const reactivateAdmin = httpsCallable(functions, 'reactivateAdmin');
      await reactivateAdmin({ uid: admin.uid });
      setSuccess(`Admin ${admin.email} reactivated successfully!`);
      fetchAdmins();
    } catch (err) {
      console.error('Error reactivating admin:', err);
      setError('Failed to reactivate admin: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermissionChange = (key) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };


  const filteredAdmins = admins.filter(admin => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (admin.email && admin.email.toLowerCase().includes(lowerQuery)) ||
      (admin.role && formatRoleLabel(admin.role).toLowerCase().includes(lowerQuery))
    );
  });

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
          Manage Admins
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setOpenCreateDialog(true)}
          sx={buttonSx}
        >
          Add Admin
        </Button>
      </Box>

      {success && (
        <Alert severity="success" className="!mb-4" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" className="!mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', padding: '16px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search by email or role..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#888' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: 320,
            '& .MuiOutlinedInput-root': {
              background: '#FAFAF8',
              borderRadius: '8px',
              '& fieldset': { borderColor: '#EBEBEB' },
              '&:hover fieldset': { borderColor: '#1E1B4B' },
              '&.Mui-focused fieldset': { borderColor: '#1E1B4B' },
            }
          }}
        />
        <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
          {filteredAdmins.length} admin{filteredAdmins.length !== 1 ? 's' : ''} found
        </Typography>
      </div>

      <AdminListView
        admins={filteredAdmins}
        onEditAdmin={handleOpenEditDialog}
        onDeactivateAdmin={handleDeactivateAdmin}
        onReactivateAdmin={handleReactivateAdmin}
        actionLoading={actionLoading}
      />

      {/* Create Admin Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => {
          if (!actionLoading) {
            setOpenCreateDialog(false);
            setCreateForm({ email: '', role: 'admin' });
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Create New Admin
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                variant="outlined"
                disabled={actionLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                select
                label="Role"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                variant="outlined"
                disabled={actionLoading}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 1 }}>
                  {createForm.role === 'admin' ? 'Admin Role Access:' : 'Editor Role Access:'}
                </Typography>
                {createForm.role === 'admin' ? (
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <li><Typography variant="body2">Manage Products (add, edit, delete, archive, restore)</Typography></li>
                    <li><Typography variant="body2">Manage Orders (view, update status)</Typography></li>
                    <li><Typography variant="body2">Manage Promotions (banners)</Typography></li>
                    <li><Typography variant="body2">Manage Metal Rates</Typography></li>
                    <li><Typography variant="body2">Manage Users</Typography></li>
                    <li><Typography variant="body2" sx={{ color: '#ed6c02' }}>Changes require super admin approval (by default)</Typography></li>
                    <li><Typography variant="body2" sx={{ color: '#d32f2f' }}>Cannot manage other admin users</Typography></li>
                  </Box>
                ) : (
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <li><Typography variant="body2">View and edit products (limited)</Typography></li>
                    <li><Typography variant="body2">View orders</Typography></li>
                    <li><Typography variant="body2" sx={{ color: '#d32f2f' }}>Cannot delete or archive products</Typography></li>
                    <li><Typography variant="body2" sx={{ color: '#d32f2f' }}>Cannot manage metal rates</Typography></li>
                    <li><Typography variant="body2" sx={{ color: '#d32f2f' }}>Cannot manage promotions or users</Typography></li>
                    <li><Typography variant="body2" sx={{ color: '#d32f2f' }}>Cannot manage other admin users</Typography></li>
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: '#666', mt: 1, display: 'block' }}>
                  Note: Admin changes to products, rates, and banners require super admin approval unless explicitly allowed.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              setOpenCreateDialog(false);
              setCreateForm({ email: '', role: 'admin' });
            }}
            sx={{ textTransform: 'none', color: '#666' }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateAdmin}
            variant="contained"
            disabled={actionLoading || !createForm.email}
            sx={buttonSx}
          >
            {actionLoading ? 'Creating...' : 'Create Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => {
          if (!actionLoading) {
            setOpenEditDialog(false);
            setSelectedAdmin(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Edit Admin {selectedAdmin ? `- ${selectedAdmin.email}` : ''}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                select
                label="Role"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                variant="outlined"
                disabled={actionLoading}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ color: '#1E1B4B', fontWeight: 'bold', mb: 1 }}>
                Permissions
              </Typography>
              <FormGroup>
                {PERMISSION_OPTIONS.map((permission) => (
                  <FormControlLabel
                    key={permission.key}
                    control={
                      <Checkbox
                        checked={editForm.permissions[permission.key] || false}
                        onChange={() => handlePermissionChange(permission.key)}
                        disabled={actionLoading}
                        sx={{
                          color: '#1E1B4B',
                          '&.Mui-checked': { color: '#1E1B4B' },
                        }}
                      />
                    }
                    label={permission.label}
                  />
                ))}
              </FormGroup>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ color: '#1E1B4B', fontWeight: 'bold', mb: 1 }}>
                Approval Settings
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editForm.skipApproval || false}
                    onChange={() => setEditForm((prev) => ({ ...prev, skipApproval: !prev.skipApproval }))}
                    disabled={actionLoading}
                    sx={{
                      color: '#1E1B4B',
                      '&.Mui-checked': { color: '#1E1B4B' },
                    }}
                  />
                }
                label="Allow changes without approval"
              />
              <Typography variant="caption" sx={{ color: '#666', display: 'block', ml: 4 }}>
                When enabled, this admin&apos;s product, pricing, and banner changes take effect immediately without super admin approval.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              setOpenEditDialog(false);
              setSelectedAdmin(null);
            }}
            sx={{ textTransform: 'none', color: '#666' }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateAdmin}
            variant="contained"
            disabled={actionLoading}
            sx={buttonSx}
          >
            {actionLoading ? 'Updating...' : 'Update Admin'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
