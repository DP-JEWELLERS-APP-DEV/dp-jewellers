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
  Divider,
  InputAdornment,
} from '@mui/material';
import { Visibility, Edit, Delete, Block, CheckCircle, Search } from '@mui/icons-material';
import UserListView from '@/components/users/UserListView';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [userOrders, setUserOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const listUsers = httpsCallable(functions, 'listUsers');
      const result = await listUsers({ limit: 100 });
      setUsers(result.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOrders = async (userId) => {
    try {
      const getUserDetails = httpsCallable(functions, 'getUserDetails');
      const result = await getUserDetails({ userId });
      setUserOrders(result.data.orders || []);
    } catch (err) {
      console.error('Error fetching user orders:', err);
    }
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    await fetchUserOrders(user.id);
    setOpenViewDialog(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      isActive: user.isActive !== false,
    });
    setOpenEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateUser = httpsCallable(functions, 'updateUser');
      await updateUser({
        userId: selectedUser.id,
        ...editFormData,
      });

      setSuccess('User updated successfully!');
      setOpenEditDialog(false);
      fetchUsers();
    } catch (err) {
      setError('Failed to update user: ' + (err.message || ''));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.isActive === false;
    const action = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    setLoading(true);

    try {
      const updateUser = httpsCallable(functions, 'updateUser');
      await updateUser({ userId: user.id, isActive: newStatus });

      setSuccess(`User ${action}d successfully!`);
      fetchUsers();
    } catch (err) {
      setError(`Failed to ${action} user: ` + (err.message || ''));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    setLoading(true);

    try {
      const deleteUser = httpsCallable(functions, 'deleteUser');
      await deleteUser({ userId });
      setSuccess('User deactivated successfully!');
      fetchUsers();
    } catch (err) {
      setError('Failed to deactivate user: ' + (err.message || ''));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp._seconds) return '';
  
    const date = new Date(
      timestamp._seconds * 1000 + timestamp._nanoseconds / 1e6
    );
  
    return date.toLocaleDateString();
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(lowerQuery)) ||
      (user.email && user.email.toLowerCase().includes(lowerQuery)) ||
      (user.phone && user.phone.includes(lowerQuery))
    );
  });

  return (
    <div>
      <Typography variant="h4" className="font-bold mb-6" sx={{ color: '#1E1B4B' }}>
        Users Management
      </Typography>

      {success && <Alert severity="success" className="!mb-4" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" className="!mb-4" onClose={() => setError('')}>{error}</Alert>}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', padding: '16px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search by name, email, or phone..."
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
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </Typography>
      </div>

      <UserListView
        users={filteredUsers}
        onViewUser={handleViewUser}
        onEditUser={handleEditUser}
        onToggleStatus={handleToggleUserStatus}
        onDeleteUser={handleDeleteUser}
      />

      {/* View User Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          User Details
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Name
                  </Typography>
                  <Typography variant="body1" className="font-semibold">
                    {selectedUser.name || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Email
                  </Typography>
                  <Typography variant="body1" className="font-semibold">
                    {selectedUser.email || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Phone
                  </Typography>
                  <Typography variant="body1" className="font-semibold">
                    {selectedUser.phone || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Status
                  </Typography>
                  <Chip
                    label={selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                    color={selectedUser.isActive !== false ? 'success' : 'default'}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Address
                  </Typography>
                  <Typography variant="body1" className="font-semibold">
                    {selectedUser.address || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Joined Date
                  </Typography>
                  <Typography variant="body1" className="font-semibold">
                    {formatDate(selectedUser.createdAt)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Last Updated
                  </Typography>
                  <Typography variant="body1" className="font-semibold">
                    {formatDate(selectedUser.updatedAt)}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" className="font-bold mb-3" sx={{ color: '#1E1B4B' }}>
                Order History
              </Typography>

              {userOrders.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666' }}>
                  No orders found for this user
                </Typography>
              ) : (
                <Box>
                  {userOrders.map((order) => (
                    <Box
                      key={order.id}
                      sx={{
                        p: 2,
                        mb: 2,
                        backgroundColor: '#F5F5F5',
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Typography variant="body1" className="font-semibold">
                            Order #{order.id.slice(-8).toUpperCase()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {formatDate(order.createdAt)}
                          </Typography>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Typography variant="body1" className="font-semibold">
                            ₹{order.totalAmount || 0}
                          </Typography>
                          <Chip
                            label={order.status?.toUpperCase() || 'PENDING'}
                            size="small"
                            color={order.status === 'completed' ? 'success' : 'default'}
                          />
                        </div>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setOpenViewDialog(false)}
            sx={{ textTransform: 'none', color: '#666' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Edit User
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Name"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Phone"
                value={editFormData.phone || ''}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Address"
                value={editFormData.address || ''}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                variant="outlined"
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                select
                label="Status"
                value={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.value })}
                variant="outlined"
                sx={{ minWidth: '200px' }}
              >
                <MenuItem value={true}>Active</MenuItem>
                <MenuItem value={false}>Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setOpenEditDialog(false)}
            sx={{ textTransform: 'none', color: '#666' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={loading}
            sx={{
              backgroundColor: '#1E1B4B',
              '&:hover': { backgroundColor: '#2D2963' },
              textTransform: 'none',
            }}
          >
            {loading ? 'Updating...' : 'Update User'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
