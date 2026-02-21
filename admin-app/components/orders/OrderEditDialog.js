'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Alert, CircularProgress,
} from '@mui/material';

const orderStatuses = [
  'pending', 'confirmed', 'processing',
  'ready_for_pickup', 'out_for_delivery',
  'delivered', 'completed', 'cancelled',
];

/**
 * OrderEditDialog
 * Props:
 *   open                  - boolean
 *   onClose               - () => void
 *   newStatus             - string
 *   onStatusChange        - (status: string) => void
 *   estimatedDeliveryDate - string (YYYY-MM-DD)
 *   onDeliveryDateChange  - (date: string) => void
 *   originalDeliveryDate  - string
 *   delayReason           - string
 *   onDelayReasonChange   - (reason: string) => void
 *   onSubmit              - () => void
 *   loading               - boolean
 */
export default function OrderEditDialog({
  open,
  onClose,
  newStatus,
  onStatusChange,
  estimatedDeliveryDate,
  onDeliveryDateChange,
  originalDeliveryDate,
  delayReason,
  onDelayReasonChange,
  onSubmit,
  loading,
}) {
  const dateChanged = originalDeliveryDate && estimatedDeliveryDate && estimatedDeliveryDate !== originalDeliveryDate;
  const submitDisabled = loading || (dateChanged && !delayReason);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold' }}>Update Order</DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" select label="Order Status"
              value={newStatus || ''}
              onChange={(e) => onStatusChange(e.target.value)}
              variant="outlined"
            >
              {orderStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace(/_/g, ' ').toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth size="small" type="date" label="Estimated Delivery Date"
              value={estimatedDeliveryDate}
              onChange={(e) => onDeliveryDateChange(e.target.value)}
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {dateChanged && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                You are changing the delivery date. Please provide a reason.
              </Alert>
              <TextField
                fullWidth size="small" label="Reason for Delay"
                value={delayReason}
                onChange={(e) => onDelayReasonChange(e.target.value)}
                variant="outlined" multiline rows={2} required
                placeholder="e.g., Supplier delay, Custom design processing, etc."
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#666' }}>Cancel</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={submitDisabled}
          sx={{ backgroundColor: '#1E1B4B', '&:hover': { backgroundColor: '#2D2963' }, textTransform: 'none' }}
        >
          {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Update Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
