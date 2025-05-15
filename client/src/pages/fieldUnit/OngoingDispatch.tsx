import React, { useEffect, useState } from 'react';
import {
  Typography, 
  Paper, 
  Box, 
  Button, 
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Divider
} from '@mui/material';
import { auth, db } from '../../firebase';
import { getIdToken } from 'firebase/auth';
import { collection, query, where, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface Call {
  id: string;
  callerNumber: string;
  callerName: string;
  location: string;
  emergencyType: string;
  timestamp: { seconds: number };
  status: string;
}

interface Dispatch {
  id: string;
  callId: string;
  dispatchTime: { seconds: number };
  confirmedAt: { seconds: number };
  status: string;
  call?: Call;
}

export default function OngoingDispatch() {
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openReport, setOpenReport] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [completionTime, setCompletionTime] = useState('');

  // Helper to fetch with auth
  const fetchAuth = async (path: string, opts: RequestInit = {}) => {
    const token = await getIdToken(auth.currentUser!);
    return fetch(path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
  };

  // Subscribe to real-time updates for ongoing dispatch
  useEffect(() => {
    if (!auth.currentUser) return;

    setLoading(true);
    
    // Query for CONFIRMED dispatch for this field unit
    const ongoingDispatchQuery = query(
      collection(db, 'dispatches'),
      where('unitId', '==', auth.currentUser.uid),
      where('status', '==', 'CONFIRMED'),
      limit(1)
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      ongoingDispatchQuery,
      async (snapshot) => {
        setError(null); // Clear any previous errors
        
        if (snapshot.empty) {
          setDispatch(null);
          setLoading(false);
          return;
        }
        
        // Get the dispatch document
        const dispatchDoc = snapshot.docs[0];
        const dispatchData = dispatchDoc.data();
        
        try {
          // Get the related call information
          const callId = dispatchData.callId;
          const callRef = doc(db, 'calls', callId);
          const callSnap = await getDoc(callRef);
          
          const dispatchWithCall = {
            id: dispatchDoc.id,
            ...dispatchData,
            call: callSnap.exists() ? {
              id: callId,
              ...callSnap.data()
            } : undefined
          } as Dispatch;
          
          setDispatch(dispatchWithCall);
        } catch (err) {
          console.error('Error fetching call data:', err);
          // Still set dispatch even if call data fetch fails
          setDispatch({
            id: dispatchDoc.id,
            ...dispatchData
          } as Dispatch);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to ongoing dispatch:', err);
        setError('Failed to listen to ongoing dispatch. Falling back to manual refresh.');
        loadOngoingDispatch(); // Fallback to manual fetch
      }
    );
    
    // Clean up listener on component unmount
    return () => {
      unsubscribe();
    };
  }, [auth.currentUser]);

  // Legacy fetch method as fallback
  const loadOngoingDispatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuth('/api/field/ongoing-dispatch');
      const data = await res.json();
      setDispatch(data.dispatch);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openReportDialog = () => {
    setOpenReport(true);
    setReportDetails('');
    setCompletionTime('');
    setError(null);
  };

  const closeReportDialog = () => {
    setOpenReport(false);
  };

  const handleSubmitReport = async () => {
    if (!dispatch) return;
    
    if (!reportDetails.trim()) {
      setError('Please enter report details');
      return;
    }

    if (!completionTime.trim()) {
      setError('Please enter completion time');
      return;
    }

    setError(null);
    try {
      // Send reportDetails and completionTime separately
      const res = await fetchAuth('/api/field/reports', {
        method: 'POST',
        body: JSON.stringify({
          dispatchId: dispatch.id,
          reportDetails: reportDetails,
          completionTime: completionTime
        })
      });
      
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to submit report');
      
      setSuccess('Report submitted successfully');
      closeReportDialog();
      // No need to manually refresh as Firestore listener will update the UI
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!dispatch) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Ongoing Dispatch</Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            You currently don't have any ongoing dispatch.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Ongoing Dispatch</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Dispatch Information</Typography>
              <Typography><strong>Dispatch ID:</strong> {dispatch.id}</Typography>
              <Typography><strong>Status:</strong> {dispatch.status}</Typography>
              <Typography><strong>Dispatch Time:</strong> {new Date(dispatch.dispatchTime.seconds * 1000).toLocaleString()}</Typography>
              <Typography><strong>Confirmation Time:</strong> {new Date(dispatch.confirmedAt.seconds * 1000).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Emergency Call Details</Typography>
              {dispatch.call ? (
                <>
                  <Typography><strong>Call ID:</strong> {dispatch.call.id}</Typography>
                  <Typography><strong>Caller:</strong> {dispatch.call.callerName}</Typography>
                  <Typography><strong>Phone:</strong> {dispatch.call.callerNumber}</Typography>
                  <Typography><strong>Location:</strong> {dispatch.call.location}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography><strong>Nature of Emergency:</strong></Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{dispatch.call.emergencyType}</Typography>
                </>
              ) : (
                <Typography>Call details not available</Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={openReportDialog}
        >
          Submit Intervention Report
        </Button>
      </Box>
      
      {/* Report Dialog */}
      <Dialog 
        open={openReport} 
        onClose={closeReportDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Submit Intervention Report</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <TextField
              label="Completion Time"
              fullWidth
              value={completionTime}
              onChange={e => setCompletionTime(e.target.value)}
              placeholder="e.g., 2023-05-06 14:30"
              helperText="When was the emergency situation resolved?"
              margin="normal"
            />
            
            <TextField
              label="Report Details"
              multiline
              rows={8}
              fullWidth
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              placeholder="Describe how the emergency was handled and resolved..."
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReportDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitReport} 
            variant="contained" 
            color="primary"
          >
            Submit Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 