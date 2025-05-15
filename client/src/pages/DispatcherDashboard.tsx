// client/src/pages/DispatcherDashboard.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TableContainer, Table, TableHead,
  TableRow, TableCell, TableBody, Paper,
  Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem,
  InputLabel, FormControl, Alert, Toolbar, AppBar
} from '@mui/material';
import { auth, db } from '../firebase';
import { getIdToken } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import UserGreeting from '../components/UserGreeting';

interface Call {
  id: string;
  callerNumber: string;
  callerName: string;
  location: string;
  description?: string;
  timestamp: { seconds: number };
  emergencyType?: string;
  urgencyLevel?: number;
  assessedBy?: string; // ID of the dispatcher who assessed the call
}

interface Unit {
  id: string;
  unitType: string;
  currentLocation: string;
  name: string;
}

export default function DispatcherDashboard() {
  const [newCalls, setNewCalls] = useState<Call[]>([]);
  const [assessedCalls, setAssessedCalls] = useState<Call[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Dialog state
  const [openAssess, setOpenAssess] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [emergencyType, setEmergencyType] = useState('POLICE');
  const [urgencyLevel, setUrgencyLevel] = useState<number>(1);
  const [urgencyLevelError, setUrgencyLevelError] = useState<string | null>(null);

  const [openDispatch, setOpenDispatch] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  // Set current user ID when auth state is available
  useEffect(() => {
    if (auth.currentUser) {
      setCurrentUserId(auth.currentUser.uid);
    }
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Fetch helper
  const fetchWithAuth = async (path: string, opts: RequestInit = {}) => {
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

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Query for NEW calls
    const newCallsQuery = query(
      collection(db, 'calls'),
      where('status', '==', 'NEW'),
      orderBy('timestamp', 'desc')
    );
    
    // Query for ASSESSED calls - filtered to only show calls assessed by the current dispatcher
    const assessedCallsQuery = query(
      collection(db, 'calls'),
      where('status', '==', 'ASSESSED'),
      where('assessedBy', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    
    // Set up real-time listeners
    const unsubscribeNewCalls = onSnapshot(
      newCallsQuery,
      snapshot => {
        setError(null);   // clear any prior permission/connection errors
        setNewCalls(
             snapshot.docs.map(d => ({
               ...(d.data() as Call),
               id: d.id
             }))
           );
      },
      err => {
        console.error('Error listening to new calls:', err);
        setError('Failed to listen to new calls. Falling back to manual refresh.');
        loadCalls();
      }
    );
    
    const unsubscribeAssessedCalls = onSnapshot(
      assessedCallsQuery,
      snapshot => {
        setError(null);  // clear any previous errors
        setAssessedCalls(
          snapshot.docs.map(d => ({
            ...(d.data() as Call),
            id: d.id
          }))
        );
      },
      err => {
        console.error('Error listening to assessed calls:', err);
        setError('Failed to listen to assessed calls. Falling back to manual refresh.');
        loadCalls();  // fallback to manual fetch
      }
    );
    
    // Clean up listeners on component unmount
    return () => {
      unsubscribeNewCalls();
      unsubscribeAssessedCalls();
    };
  }, [auth.currentUser]);

  // Subscribe to real-time updates for available field units when dispatch dialog is open
  useEffect(() => {
    if (!auth.currentUser || !openDispatch || !selectedCall?.emergencyType) return;
    
    // Create a query for available units matching the emergency type
    let unitsQuery = query(
      collection(db, 'field_units'),
      where('currentStatus', '==', 'AVAILABLE')
    );
    
    // Add filter for the specific unit type based on emergency type
    if (selectedCall.emergencyType === 'POLICE') {
      unitsQuery = query(unitsQuery, where('unitType', '==', 'POLICE'));
    } else if (selectedCall.emergencyType === 'FIRE') {
      unitsQuery = query(unitsQuery, where('unitType', '==', 'FIRE'));
    } else if (selectedCall.emergencyType === 'EMS') {
      unitsQuery = query(unitsQuery, where('unitType', '==', 'EMS'));
    } else if (selectedCall.emergencyType === 'OTHER') {
      unitsQuery = query(unitsQuery, where('unitType', '==', 'OTHER'));
    }
    
    // Set up the real-time listener
    const unsubscribe = onSnapshot(
      unitsQuery,
      snapshot => {
        const availableUnits = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Unit[];
        
        setUnits(availableUnits);
        
        // If the currently selected unit is no longer available, reset the selection
        if (selectedUnitId && !availableUnits.some(unit => unit.id === selectedUnitId)) {
          setSelectedUnitId('');
          setError('Previously selected unit is no longer available');
        }
      },
      err => {
        console.error('Error listening to available units:', err);
        setError('Failed to listen to available units. Please try again.');
        // Fall back to manual loading
        loadUnits();
      }
    );
    
    // Clean up listener when dialog closes or component unmounts
    return () => unsubscribe();
  }, [openDispatch, selectedCall, auth.currentUser]);

  // Legacy fetch method as fallback
  const loadCalls = async () => {
    try {
      const resNew = await fetchWithAuth(`/api/dispatcher/calls?status=NEW`);
      const { calls: nc } = await resNew.json();
      setNewCalls(nc);

      // For assessed calls, only fetch those assessed by the current dispatcher
      const resAss = await fetchWithAuth(`/api/dispatcher/calls?status=ASSESSED&assessedBy=${currentUserId}`);
      const { calls: ac } = await resAss.json();
      setAssessedCalls(ac);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Load available units
  const loadUnits = async () => {
    if (!selectedCall) return;
    
    const res = await fetchWithAuth(
      `/api/dispatcher/units?emergencyType=${selectedCall.emergencyType}`
    );
    const { units } = await res.json();
    setUnits(units);
  };

  // Assess dialog
  const openAssessDialog = (c: Call) => {
    setSelectedCall(c);
    setEmergencyType('POLICE');
    setUrgencyLevel(1);
    setUrgencyLevelError(null);
    setOpenAssess(true);
    setError(null);
    setSuccess(null);
  };
  const closeAssessDialog = () => setOpenAssess(false);

  const submitAssess = async () => {
    if (!selectedCall || !currentUserId) return;
    
    // Validate urgency level is an integer between 1 and 5
    if (!Number.isInteger(urgencyLevel) || urgencyLevel < 1 || urgencyLevel > 5) {
      setError('Urgency level must be an integer between 1 and 5');
      setUrgencyLevelError('Please enter an integer between 1 and 5');
      return;
    }
    
    try {
      const res = await fetchWithAuth(
        `/api/dispatcher/calls/${selectedCall.id}/assess`,
        {
          method: 'PATCH',
          body: JSON.stringify({ 
            emergencyType, 
            urgencyLevel,
            assessedBy: currentUserId // Include the current dispatcher's ID
          }),
        }
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Bad assess');
      setSuccess('Call assessed');
      closeAssessDialog();
      // No need to manually refresh as Firestore listener will update the UI
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Dispatch dialog
  const openDispatchDialog = (c: Call) => {
    setSelectedCall(c);
    setSelectedUnitId('');
    setError(null);
    setSuccess(null);
    setOpenDispatch(true);
  };
  const closeDispatchDialog = () => setOpenDispatch(false);

  const submitDispatch = async () => {
    if (!selectedCall || !selectedUnitId) {
      setError('Select a unit first');
      return;
    }
    try {
      const res = await fetchWithAuth(`/api/dispatcher/dispatches`, {
        method: 'POST',
        body: JSON.stringify({
          callId: selectedCall.id,
          unitId: selectedUnitId,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Bad dispatch');
      setSuccess(`Dispatched (ID: ${payload.dispatchId})`);
      closeDispatchDialog();
      // No need to manually refresh as Firestore listener will update the UI
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6">Dispatcher Dashboard</Typography>
          <UserGreeting />
        </Toolbar>
      </AppBar>

      <Box p={4}>
        {error   && <Alert severity="error"   sx={{ mt:2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt:2 }}>{success}</Alert>}

        {/* NEW CALLS */}
        <Typography sx={{ mt:4, mb:2 }} variant="h6">
          New Calls
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Caller Number</TableCell>
                <TableCell>Caller Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Assess</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {newCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">No new calls</TableCell>
                </TableRow>
              ) : (
                newCalls.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.callerNumber}</TableCell>
                    <TableCell>{c.callerName}</TableCell>
                    <TableCell>{c.location}</TableCell>
                    <TableCell>{c.description || '-'}</TableCell>
                    <TableCell>
                      {new Date(c.timestamp.seconds * 1000).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => openAssessDialog(c)}
                      >
                        Assess
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ASSESSED CALLS - Only shows calls assessed by current dispatcher */}
        <Typography sx={{ mt:4, mb:2 }} variant="h6">
          Your Assessed Calls
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Caller Number</TableCell>
                <TableCell>Caller Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Urgency</TableCell>
                <TableCell>Dispatch</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assessedCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No assessed calls</TableCell>
                </TableRow>
              ) : (
                assessedCalls.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.callerNumber}</TableCell>
                    <TableCell>{c.callerName}</TableCell>
                    <TableCell>{c.emergencyType}</TableCell>
                    <TableCell>{c.urgencyLevel}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => openDispatchDialog(c)}
                      >
                        Dispatch
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Assess Dialog */}
        <Dialog open={openAssess} onClose={closeAssessDialog}>
          <DialogTitle>Assess Emergency</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt:2 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={emergencyType}
                label="Type"
                onChange={e => setEmergencyType(e.target.value)}
              >
                <MenuItem value="POLICE">Police</MenuItem>
                <MenuItem value="FIRE">Fire</MenuItem>
                <MenuItem value="EMS">EMS</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Urgency (1-5)"
              type="number"
              fullWidth
              sx={{ mt:2 }}
              InputProps={{ 
                inputProps: { 
                  min: 1, 
                  max: 5,
                  step: 1 // Ensures only integers can be input
                } 
              }}
              value={urgencyLevel}
              onChange={e => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  setUrgencyLevel(value);
                  
                  // Validate as user types
                  if (value < 1 || value > 5 || !Number.isInteger(value)) {
                    setUrgencyLevelError('Please enter an integer between 1 and 5');
                  } else {
                    setUrgencyLevelError(null);
                  }
                }
              }}
              error={!!urgencyLevelError}
              helperText={urgencyLevelError || ''}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeAssessDialog}>Cancel</Button>
            <Button onClick={submitAssess}>Submit</Button>
          </DialogActions>
        </Dialog>

        {/* Dispatch Dialog */}
        <Dialog open={openDispatch} onClose={closeDispatchDialog}>
          <DialogTitle>
            Dispatch Unit for {selectedCall?.emergencyType} Emergency
          </DialogTitle>
          <DialogContent>
            {units.length === 0 ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No available {selectedCall?.emergencyType} units found
              </Alert>
            ) : (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Unit</InputLabel>
                <Select
                  value={selectedUnitId}
                  label="Select Unit"
                  onChange={e => setSelectedUnitId(e.target.value)}
                >
                  {units.map(u => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.unitType} – {u.name} (ID: {u.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDispatchDialog}>Cancel</Button>
            <Button 
              onClick={submitDispatch}
              disabled={!selectedUnitId || units.length === 0}
            >
              Dispatch
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
