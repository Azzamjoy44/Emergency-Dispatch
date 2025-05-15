import React, { useEffect, useState } from 'react';
import {
  Typography, 
  TableContainer, 
  Table, 
  TableHead,
  TableRow, 
  TableCell, 
  TableBody, 
  Paper, 
  Button,
  Alert,
  CircularProgress,
  Box,
  Tooltip
} from '@mui/material';
import { auth, db } from '../../firebase';
import { getIdToken } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface Dispatch {
  id: string;
  callId: string;
  dispatchTime: { seconds: number };
  unitId: string;
  status: string;
}

export default function PendingDispatches() {
  const [pending, setPending] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

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

  // Fetch the current field unit's status
  const fetchFieldUnitStatus = async () => {
    if (!auth.currentUser) return;
    
    try {
      const fieldUnitRef = doc(db, 'field_units', auth.currentUser.uid);
      const fieldUnitSnap = await getDoc(fieldUnitRef);
      
      if (fieldUnitSnap.exists()) {
        const fieldUnitData = fieldUnitSnap.data();
        setCurrentStatus(fieldUnitData.currentStatus || null);
      }
    } catch (error) {
      console.error('Error fetching field unit status:', error);
    }
  };

  // Set up real-time listener for field unit's own status changes
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const fieldUnitRef = doc(db, 'field_units', auth.currentUser.uid);
    const unsubscribe = onSnapshot(
      fieldUnitRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const fieldUnitData = snapshot.data();
          setCurrentStatus(fieldUnitData.currentStatus || null);
        }
      },
      (error) => {
        console.error('Error listening to field unit status:', error);
      }
    );
    
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time updates for pending dispatches
  useEffect(() => {
    if (!auth.currentUser) return;

    setLoading(true);
    
    // Initial fetch of field unit status
    fetchFieldUnitStatus();
    
    // Query for SENT dispatches for this field unit
    const pendingDispatchesQuery = query(
      collection(db, 'dispatches'),
      where('unitId', '==', auth.currentUser.uid),
      where('status', '==', 'SENT'),
      orderBy('dispatchTime', 'desc')
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      pendingDispatchesQuery,
      (snapshot) => {
        setError(null); // Clear any previous errors
        const dispatches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Dispatch[];
        setPending(dispatches);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to pending dispatches:', err);
        setError('Failed to listen to pending dispatches. Falling back to manual refresh.');
        loadPending(); // Fallback to manual fetch
      }
    );
    
    // Clean up listener on component unmount
    return () => {
      unsubscribe();
    };
  }, [auth.currentUser]);

  // Legacy fetch method as fallback
  const loadPending = async () => {
    setError(null);
    try {
      const res = await fetchAuth('/api/field/dispatches');
      const { dispatches } = await res.json();
      setPending(dispatches);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleConfirm = async (d: Dispatch) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchAuth(
        `/api/field/dispatches/${d.id}/confirm`,
        { method: 'POST' }
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Confirm failed');
      setSuccess('Dispatch confirmed');
      
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

  return (
    <>
      <Typography variant="h5" gutterBottom>Pending Dispatches</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      {currentStatus === 'BUSY' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are currently busy with an emergency. You cannot confirm new dispatches until your current intervention is complete.
        </Alert>
      )}
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Dispatch ID</TableCell>
              <TableCell>Call ID</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pending.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">No pending dispatches</TableCell>
              </TableRow>
            ) : (
              pending.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell>{d.callId}</TableCell>
                  <TableCell>
                    {new Date(d.dispatchTime.seconds * 1000).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={currentStatus === 'BUSY' ? "Cannot confirm while busy with another emergency" : ""}>
                      <span>
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          onClick={() => handleConfirm(d)}
                          disabled={currentStatus === 'BUSY'}
                        >
                          Confirm
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
} 