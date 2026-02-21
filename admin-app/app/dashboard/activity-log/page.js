'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { FileDownload, FilterList, Clear } from '@mui/icons-material';
import ActivityLogListView from '@/components/activity-log/ActivityLogListView';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';
import * as XLSX from 'xlsx';

const functions = getFunctions(app, 'asia-south1');

const moduleOptions = [
  { value: '', label: 'All Modules' },
  { value: 'products', label: 'Products' },
  { value: 'orders', label: 'Orders' },
  { value: 'users', label: 'Users' },
  { value: 'adminUsers', label: 'Admin Users' },
  { value: 'metalRates', label: 'Metal Rates' },
  { value: 'banners', label: 'Banners' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'stores', label: 'Stores' },
  { value: 'support', label: 'Support' },
];

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'archive', label: 'Archive' },
  { value: 'restore', label: 'Restore' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'updateStatus', label: 'Update Status' },
  { value: 'deactivate', label: 'Deactivate' },
  { value: 'reactivate', label: 'Reactivate' },
];

const moduleLabels = {
  products: 'Products',
  orders: 'Orders',
  users: 'Users',
  adminUsers: 'Admin Users',
  metalRates: 'Metal Rates',
  banners: 'Banners',
  approvals: 'Approvals',
  stores: 'Stores',
  support: 'Support',
};

const moduleColors = {
  products: 'primary',
  orders: 'secondary',
  users: 'info',
  adminUsers: 'warning',
  metalRates: 'success',
  banners: 'default',
  approvals: 'error',
  stores: 'default',
  support: 'default',
};

const actionColors = {
  create: 'success',
  update: 'info',
  delete: 'error',
  archive: 'warning',
  restore: 'success',
  approve: 'success',
  reject: 'error',
  updateStatus: 'info',
  deactivate: 'warning',
  reactivate: 'success',
};

const buttonSx = {
  backgroundColor: '#1E1B4B',
  '&:hover': { backgroundColor: '#2D2963' },
  textTransform: 'none',
  height: '40px',
  px: 3,
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toLocaleString();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toLocaleString();
  }
  return '';
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [detailsDialog, setDetailsDialog] = useState({ open: false, details: null });
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable(functions, 'listActivityLogs');
      const params = { limit: 500 };
      if (filters.module) params.module = filters.module;
      if (filters.action) params.action = filters.action;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const result = await fn(params);
      setLogs(result.data.logs || []);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity logs: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ module: '', action: '', dateFrom: '', dateTo: '' });
  };

  const handleExportExcel = () => {
    if (logs.length === 0) {
      setError('No data to export.');
      return;
    }

    const exportData = logs.map((log) => ({
      Action: log.action || '',
      Module: moduleLabels[log.module] || log.module || '',
      'Entity Name': log.entityName || '',
      'Entity ID': log.entityId || '',
      Status: log.status || '',
      'Performed By': log.performedByEmail || '',
      Role: log.performedByRole?.replace('_', ' ') || '',
      'Date/Time': formatTimestamp(log.timestamp),
      Details: log.details ? JSON.stringify(log.details) : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const maxWidth = exportData.reduce((acc, row) => {
      Object.keys(row).forEach((key, i) => {
        const len = String(row[key] || '').length;
        acc[i] = Math.max(acc[i] || key.length, len);
      });
      return acc;
    }, {});
    worksheet['!cols'] = Object.values(maxWidth).map((w) => ({ wch: Math.min(w + 2, 50) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Logs');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `activity-logs-${dateStr}.xlsx`);
    setSuccess('Exported successfully!');
  };


  if (loading && logs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#1E1B4B' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Activity Log
        </Typography>
        <Button
          variant="contained"
          startIcon={<FileDownload />}
          onClick={handleExportExcel}
          sx={buttonSx}
          disabled={logs.length === 0}
        >
          Export to Excel
        </Button>
      </Box>

      {/* Alerts */}
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

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FilterList sx={{ color: '#1E1B4B' }} />
          <TextField
            select
            size="small"
            label="Module"
            value={filters.module}
            onChange={(e) => handleFilterChange('module', e.target.value)}
            sx={{ minWidth: 150 }}
          >
            {moduleOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Action"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            sx={{ minWidth: 150 }}
          >
            {actionOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            label="From"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            type="date"
            size="small"
            label="To"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 160 }}
          />
          {(filters.module || filters.action || filters.dateFrom || filters.dateTo) && (
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={handleClearFilters}
              sx={{ color: '#1E1B4B', textTransform: 'none' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/* Data List */}
      <ActivityLogListView
        logs={logs}
        onViewDetails={(details) => setDetailsDialog({ open: true, details })}
      />

      {/* Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onClose={() => setDetailsDialog({ open: false, details: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>
          Activity Details
        </DialogTitle>
        <DialogContent dividers>
          {detailsDialog.details && (
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {Object.entries(detailsDialog.details).map(([key, value]) => (
                <Box key={key} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsDialog({ open: false, details: null })} sx={{ color: '#1E1B4B' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
