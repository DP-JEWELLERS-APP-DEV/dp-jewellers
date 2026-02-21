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
  Alert,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  InputAdornment,
} from '@mui/material';
import { CheckCircle, Cancel, Visibility, Search } from '@mui/icons-material';
import ApprovalListView from '@/components/approvals/ApprovalListView';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

const buttonSx = {
  backgroundColor: '#1E1B4B',
  '&:hover': { backgroundColor: '#2D2963' },
  textTransform: 'none',
};

const getEntityTypeChip = (entityType) => {
  switch (entityType) {
    case 'product':
      return { label: 'Product', color: 'primary' };
    case 'metalRates':
      return { label: 'Metal Rates', color: 'secondary' };
    case 'banner':
      return { label: 'Banner', color: 'info' };
    default:
      return { label: entityType, color: 'default' };
  }
};

const getActionTypeChip = (actionType) => {
  switch (actionType) {
    case 'create':
      return { label: 'Create', color: 'success' };
    case 'update':
      return { label: 'Update', color: 'info' };
    case 'archive':
      return { label: 'Archive', color: 'warning' };
    case 'restore':
      return { label: 'Restore', color: 'primary' };
    case 'delete':
      return { label: 'Delete', color: 'error' };
    default:
      return { label: actionType, color: 'default' };
  }
};

const getStatusChip = (status) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'warning' };
    case 'approved':
      return { label: 'Approved', color: 'success' };
    case 'rejected':
      return { label: 'Rejected', color: 'error' };
    default:
      return { label: status, color: 'default' };
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toLocaleString();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }
  return '';
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState(0);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  const statusMap = ['pending', 'approved', 'rejected'];

  useEffect(() => {
    fetchApprovals();
  }, [filterTab]);

  const fetchApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable(functions, 'listPendingApprovals');
      const result = await fn({ status: statusMap[filterTab] });
      setApprovals(result.data.approvals || []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError('Failed to load approvals: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (approval) => {
    setSelectedApproval(approval);
    setReviewNote('');
    setOpenDetailDialog(true);
  };

  const handleReview = async (decision) => {
    if (!selectedApproval) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const fn = httpsCallable(functions, 'reviewApproval');
      await fn({
        approvalId: selectedApproval.id,
        decision,
        reviewNote: reviewNote || undefined,
      });
      setSuccess(`Approval ${decision} successfully!`);
      setOpenDetailDialog(false);
      setSelectedApproval(null);
      setReviewNote('');
      fetchApprovals();
    } catch (err) {
      console.error('Error reviewing approval:', err);
      setError('Failed to review: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const renderChangeDetails = (approval) => {
    if (!approval) return null;

    const { entityType, actionType, proposedChanges, previousState } = approval;

    if (entityType === 'metalRates' && actionType === 'update') {
      return renderRateChanges(proposedChanges, previousState);
    }

    if (entityType === 'product') {
      if (actionType === 'create') {
        return (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              New product created (pending activation)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The product has been created but is not visible to customers. Approving will make it active.
            </Typography>
          </Box>
        );
      }
      if (actionType === 'update') {
        return renderProductChanges(proposedChanges, previousState);
      }
      if (actionType === 'archive' || actionType === 'restore') {
        return (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {actionType === 'archive' ? 'Archive Product' : 'Restore Product'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {actionType === 'archive'
                ? 'This will archive the product and hide it from customers.'
                : 'This will restore the product and make it visible to customers.'}
            </Typography>
          </Box>
        );
      }
    }

    if (entityType === 'banner') {
      return renderBannerChanges(actionType, proposedChanges, previousState);
    }

    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          {JSON.stringify(proposedChanges, null, 2)}
        </Typography>
      </Box>
    );
  };

  const renderRateChanges = (proposed, previous) => {
    const categories = ['gold', 'silver', 'diamond', 'platinum'];

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
          Proposed Rate Changes
        </Typography>
        {categories.map((cat) => {
          if (!proposed?.[cat]) return null;
          return (
            <Box key={cat} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', color: '#1E1B4B', mb: 0.5 }}>
                {cat}
              </Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(proposed[cat]).map(([key, newVal]) => {
                    const oldVal = previous?.[cat]?.[key];
                    return (
                      <TableRow key={key}>
                        <TableCell sx={{ fontWeight: 500, width: '40%' }}>{key}</TableCell>
                        <TableCell sx={{ color: '#d32f2f' }}>
                          {oldVal != null ? `₹${oldVal.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                          {typeof newVal === 'number' ? `₹${newVal.toLocaleString()}` : String(newVal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderProductChanges = (proposed, previous) => {
    if (!proposed || !previous) return null;

    const importantFields = ['name', 'category', 'status', 'pricing', 'metal', 'diamond', 'inventory'];
    const changedFields = Object.keys(proposed).filter(
      (key) => !['updatedAt', 'approvalStatus'].includes(key)
    );

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Changed Fields
        </Typography>
        <Table size="small">
          <TableBody>
            {changedFields.map((field) => (
              <TableRow key={field}>
                <TableCell sx={{ fontWeight: 500, width: '30%' }}>{field}</TableCell>
                <TableCell sx={{ color: '#d32f2f', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {typeof previous[field] === 'object'
                    ? JSON.stringify(previous[field])?.substring(0, 100) + '...'
                    : String(previous[field] ?? '-')}
                </TableCell>
                <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {typeof proposed[field] === 'object'
                    ? JSON.stringify(proposed[field])?.substring(0, 100) + '...'
                    : String(proposed[field] ?? '-')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const renderBannerChanges = (actionType, proposed, previous) => {
    if (actionType === 'delete') {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Delete Banner
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Banner &quot;{previous?.title || 'Unknown'}&quot; will be permanently deleted.
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          {actionType === 'create' ? 'New Banner' : 'Banner Update'}
        </Typography>
        <Table size="small">
          <TableBody>
            {['title', 'linkType', 'linkTarget', 'displayOrder', 'isActive'].map((field) => (
              <TableRow key={field}>
                <TableCell sx={{ fontWeight: 500 }}>{field}</TableCell>
                {previous && (
                  <TableCell sx={{ color: '#d32f2f' }}>
                    {String(previous[field] ?? '-')}
                  </TableCell>
                )}
                <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                  {String(proposed?.[field] ?? '-')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const filteredApprovals = approvals.filter(approval => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (approval.entityName && approval.entityName.toLowerCase().includes(lowerQuery)) ||
      (approval.submittedByEmail && approval.submittedByEmail.toLowerCase().includes(lowerQuery)) ||
      (approval.entityType && approval.entityType.toLowerCase().includes(lowerQuery))
    );
  });

  const handleReviewDirect = async (approvalId, decision) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const fn = httpsCallable(functions, 'reviewApproval');
      await fn({ approvalId, decision });
      setSuccess(`Approval ${decision} successfully!`);
      fetchApprovals();
    } catch (err) {
      console.error('Error reviewing approval:', err);
      setError('Failed to review: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
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
          Approvals
        </Typography>
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

      <Paper elevation={2} sx={{ backgroundColor: 'white', borderRadius: 2 }}>
        <Tabs
          value={filterTab}
          onChange={(e, newValue) => setFilterTab(newValue)}
          sx={{
            px: 2,
            pt: 1,
            '& .MuiTab-root': { textTransform: 'none' },
            '& .Mui-selected': { color: '#1E1B4B' },
            '& .MuiTabs-indicator': { backgroundColor: '#1E1B4B' },
          }}
        >
          <Tab label="Pending" />
          <Tab label="Approved" />
          <Tab label="Rejected" />
        </Tabs>

        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EBEBEB' }}>
          <TextField
            placeholder="Search by name, submitter, or type..."
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
            {filteredApprovals.length} approval{filteredApprovals.length !== 1 ? 's' : ''} found
          </Typography>
        </div>

        <ApprovalListView
          approvals={filteredApprovals}
          activeTab={filterTab}
          onViewDetail={handleOpenDetail}
          onApprove={(id) => handleReviewDirect(id, 'approved')}
          onReject={(approval) => handleOpenDetail(approval)}
          actionLoading={actionLoading}
        />
      </Paper>

      {/* Detail / Review Dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => {
          if (!actionLoading) {
            setOpenDetailDialog(false);
            setSelectedApproval(null);
            setReviewNote('');
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Approval Details
        </DialogTitle>
        <DialogContent>
          {selectedApproval && (
            <Box>
              {/* Header info */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={getEntityTypeChip(selectedApproval.entityType).label}
                  color={getEntityTypeChip(selectedApproval.entityType).color}
                  size="small"
                />
                <Chip
                  label={getActionTypeChip(selectedApproval.actionType).label}
                  color={getActionTypeChip(selectedApproval.actionType).color}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={getStatusChip(selectedApproval.status).label}
                  color={getStatusChip(selectedApproval.status).color}
                  size="small"
                />
              </Box>

              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500, width: '30%' }}>Name</TableCell>
                    <TableCell>{selectedApproval.entityName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>Submitted By</TableCell>
                    <TableCell>{selectedApproval.submittedByEmail}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>Date</TableCell>
                    <TableCell>{formatTimestamp(selectedApproval.submittedAt)}</TableCell>
                  </TableRow>
                  {selectedApproval.reviewedByEmail && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Reviewed By</TableCell>
                      <TableCell>{selectedApproval.reviewedByEmail}</TableCell>
                    </TableRow>
                  )}
                  {selectedApproval.reviewNote && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Review Note</TableCell>
                      <TableCell>{selectedApproval.reviewNote}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              {/* Change details */}
              {renderChangeDetails(selectedApproval)}

              {/* Review note input (only for pending) */}
              {selectedApproval.status === 'pending' && (
                <Box sx={{ mt: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Review Note (optional)"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    multiline
                    rows={2}
                    disabled={actionLoading}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              setOpenDetailDialog(false);
              setSelectedApproval(null);
              setReviewNote('');
            }}
            sx={{ textTransform: 'none', color: '#666' }}
            disabled={actionLoading}
          >
            Close
          </Button>
          {selectedApproval?.status === 'pending' && (
            <>
              <Button
                onClick={() => handleReview('rejected')}
                variant="outlined"
                color="error"
                disabled={actionLoading}
                sx={{ textTransform: 'none' }}
              >
                {actionLoading ? 'Processing...' : 'Reject'}
              </Button>
              <Button
                onClick={() => handleReview('approved')}
                variant="contained"
                disabled={actionLoading}
                sx={buttonSx}
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
}
