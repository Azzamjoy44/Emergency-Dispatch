import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Button,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent,
  Alert, Grid
} from '@mui/material';
import { auth, db } from '../../firebase';
import { getIdToken } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

interface UserAccount {
  id:           string;
  email:        string;
  mobileNumber: string;
  role:         string;
  name:         string;
  birthdate:    string;
  address:      string;
  personalId:   string;
  unitType?:    string;  // Optional for field units
  currentStatus?: string; // Optional for field units
}

interface FormState {
  id:           string;
  email:        string;
  password:     string;
  mobileNumber: string;
  role:         string;
  name:         string;
  birthdate:    string;
  address:      string;
  personalId:   string;
  isEdit:       boolean;
  unitType:     'POLICE' | 'EMS' | 'FIRE' | 'OTHER';
}

export default function AccountManagement() {
  const [users, setUsers]           = useState<UserAccount[]>([]);
  const [openForm, setOpenForm]     = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [form, setForm]             = useState<FormState>({
    id: '', email: '', password: '', mobileNumber: '',
    role: 'OPERATOR', name: '', birthdate: '',
    address: '', personalId: '', isEdit: false,
    unitType: 'POLICE' as 'POLICE' | 'EMS' | 'FIRE' | 'OTHER',
  });
  const [loading, setLoading]       = useState(false);
  const [detailUser, setDetailUser] = useState<UserAccount | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  // Add ref to track the current field unit ID being viewed
  const currentFieldUnitIdRef = useRef<string | null>(null);

  // Fetch all users from backend
  const fetchUsers = async () => {
    const token = await getIdToken(auth.currentUser!);
    const res   = await fetch('/api/admin/accounts', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { users } = await res.json();
    setUsers(users);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handlers for opening/closing dialogs
  const openAdd = () => {
    setForm({
      id: '', email: '', password: '', mobileNumber: '',
      role: 'OPERATOR', name: '', birthdate: '',
      address: '', personalId: '', isEdit: false,
      unitType: 'POLICE' 
    });
    setFormError(null);
    setOpenForm(true);
  };

  const openEdit = (u: UserAccount) => {
    setForm({
      id:           u.id,
      email:        u.email,
      password:     '',
      mobileNumber: u.mobileNumber,
      role:         u.role,
      name:         u.name,
      birthdate:    u.birthdate,
      address:      u.address,
      personalId:   u.personalId,
      isEdit:       true,
      unitType:     // pull from the UserAccount if you've stored it, otherwise default:
        (u as any).unitType || 'POLICE'
    });
    setFormError(null);
    setOpenForm(true);
  };

  const closeForm = () => {
    setOpenForm(false);
    setFormError(null);
  };

  const openDel = (u: UserAccount) => {
    setForm(prev => ({ ...prev, id: u.id }));
    setOpenConfirm(true);
  };

  const closeDel = () => {
    setOpenConfirm(false);
  };

  const openView = (u: UserAccount) => {
    setDetailUser(u);
    setOpenDetails(true);
    // Set the current field unit ID in the ref if it's a field unit
    if (u.role === 'FIELD_UNIT') {
      currentFieldUnitIdRef.current = u.id;
    } else {
      currentFieldUnitIdRef.current = null;
    }
  };

  const closeView = () => {
    setOpenDetails(false);
    // Clear the ref when closing the dialog
    currentFieldUnitIdRef.current = null;
  };

  // Set up real-time listener for field unit status changes
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    // Function to set up the listener for a specific field unit
    const setupFieldUnitListener = (fieldUnitId: string) => {
      return onSnapshot(
        doc(db, 'field_units', fieldUnitId),
        (snapshot) => {
          if (snapshot.exists()) {
            const updatedData = snapshot.data();
            
            // Only update if the details dialog is still open and for the same user
            if (openDetails && currentFieldUnitIdRef.current === fieldUnitId) {
              setDetailUser(prevUser => {
                if (prevUser && prevUser.id === fieldUnitId) {
                  return {
                    ...prevUser,
                    unitType: updatedData.unitType || prevUser.unitType,
                    currentStatus: updatedData.currentStatus || prevUser.currentStatus
                  };
                }
                return prevUser;
              });
            }
          }
        },
        (error) => {
          console.error("Error listening to field unit updates:", error);
        }
      );
    };

    // If details dialog is open and we're viewing a field unit, set up the listener
    if (openDetails && currentFieldUnitIdRef.current) {
      unsubscribe = setupFieldUnitListener(currentFieldUnitIdRef.current);
    }

    // Clean up listener when component unmounts or dialog closes
    return () => unsubscribe();
  }, [openDetails]); // Only depend on openDetails, not on detailUser

  // Form field change handlers
  const onInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Validate form fields
  const validateForm = (): boolean => {
    // Check required fields
    const { email, name, mobileNumber, birthdate, address, personalId, role, unitType } = form;
    
    // For new users, password is required
    if (!form.isEdit && !form.password) {
      setFormError('Please fill out all fields. Password is required for new users.');
      return false;
    }
    
    // Check all other required fields
    if (!email || !name || !mobileNumber || !birthdate || !address || !personalId) {
      setFormError('Please fill out all fields.');
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    
    // If role is FIELD_UNIT, unitType is required
    if (role === 'FIELD_UNIT' && !unitType) {
      setFormError('Please select a unit type for the field unit.');
      return false;
    }
    
    setFormError(null);
    return true;
  };

  // Create or Update user
  const submitForm = async () => {
    // Validate the form before submitting
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const token = await getIdToken(auth.currentUser!);
      const op    = form.isEdit ? 'UPDATE' : 'CREATE';

      const payload: any = {
        id:           form.id,
        email:        form.email,
        mobileNumber: form.mobileNumber,
        role:         form.role,
        name:         form.name,
        birthdate:    form.birthdate,
        address:      form.address,
        personalId:   form.personalId,
        // Only for FIELD_UNIT, add unitType
        ...(form.role === 'FIELD_UNIT' && { unitType: form.unitType })
      };
      
      // Include password if it's a new user or if a new password was provided for an existing user
      if (!form.isEdit || (form.isEdit && form.password)) {
        payload.password = form.password;
      }

      const response = await fetch('/api/admin/accounts', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ op, user: payload }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user');
      }
      
      closeForm();
      fetchUsers();
    } catch (error: any) {
      setFormError(error.message || 'An error occurred while saving the user');
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async () => {
    setLoading(true);
    const token = await getIdToken(auth.currentUser!);

    await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ op: 'DELETE', user: { id: form.id } }),
    });

    setLoading(false);
    closeDel();
    fetchUsers();
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Manage User Accounts
      </Typography>

      <Button variant="contained" onClick={openAdd} sx={{ mb: 2 }}>
        ADD USER
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>
                  <Button onClick={() => openView(u)} size="small">View</Button>
                  <Button onClick={() => openEdit(u)} size="small">Edit</Button>
                  <Button onClick={() => openDel(u)} size="small" color="error">Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit User Form Dialog */}
      <Dialog open={openForm} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle>{form.isEdit ? 'Edit' : 'Add'} User</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {formError}
            </Alert>
          )}
          <Box my={2}>
            <TextField
              name="email"
              label="Email"
              type="email"
              fullWidth
              value={form.email}
              onChange={onInputChange}
              margin="normal"
              required
            />

            <TextField
              name="password"
              label={form.isEdit ? "New Password (leave blank to keep current)" : "Password"}
              type="password"
              fullWidth
              value={form.password}
              onChange={onInputChange}
              margin="normal"
              required={!form.isEdit}
            />

            <TextField
              name="name"
              label="Full Name"
              fullWidth
              value={form.name}
              onChange={onInputChange}
              margin="normal"
              required
            />

            <TextField
              name="mobileNumber"
              label="Mobile Number"
              fullWidth
              value={form.mobileNumber}
              onChange={onInputChange}
              margin="normal"
              required
            />

            <TextField
              name="birthdate"
              label="Birthdate"
              type="date"
              fullWidth
              value={form.birthdate}
              onChange={onInputChange}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              name="address"
              label="Address"
              fullWidth
              value={form.address}
              onChange={onInputChange}
              margin="normal"
              required
            />

            <TextField
              name="personalId"
              label="Personal ID Number"
              fullWidth
              value={form.personalId}
              onChange={onInputChange}
              margin="normal"
              required
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Role</InputLabel>
              <Select
                value={form.role}
                name="role"
                label="Role"
                onChange={onSelectChange}
              >
                <MenuItem value="OPERATOR">Operator</MenuItem>
                <MenuItem value="DISPATCHER">Dispatcher</MenuItem>
                <MenuItem value="FIELD_UNIT">Field Unit</MenuItem>
              </Select>
            </FormControl>

            {form.role === 'FIELD_UNIT' && (
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Unit Type</InputLabel>
                <Select
                  value={form.unitType}
                  name="unitType"
                  label="Unit Type"
                  onChange={onSelectChange}
                >
                  <MenuItem value="POLICE">Police</MenuItem>
                  <MenuItem value="FIRE">Fire</MenuItem>
                  <MenuItem value="EMS">EMS</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm}>Cancel</Button>
          <Button
            onClick={submitForm}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={openConfirm} onClose={closeDel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user account?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDel}>Cancel</Button>
          <Button
            onClick={deleteUser}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={openDetails} onClose={closeView} maxWidth="sm" fullWidth>
        <DialogTitle 
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            pb: 1
          }}
        >
          User Details
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {detailUser && (
            <Box>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2,
                  mb: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1 
                }}
              >
                <Typography variant="h6" gutterBottom>
                  {detailUser.name}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  {detailUser.role}
                </Typography>
              </Paper>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={6}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      height: '100%', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {detailUser.email}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={6}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      height: '100%', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Mobile
                    </Typography>
                    <Typography variant="body1">
                      {detailUser.mobileNumber}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  mb: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Personal Information
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Birthdate
                    </Typography>
                    <Typography variant="body1">
                      {detailUser.birthdate}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Personal ID
                    </Typography>
                    <Typography variant="body1">
                      {detailUser.personalId}
                    </Typography>
                  </Grid>
                  <Grid size={12} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Address
                    </Typography>
                    <Typography variant="body1">
                      {detailUser.address}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {detailUser.role === 'FIELD_UNIT' && (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'info.light',
                    color: 'info.contrastText'
                  }}
                >
                  <Typography variant="body2" color="info.contrastText" sx={{ opacity: 0.7 }} gutterBottom>
                    Field Unit Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <Typography variant="body2" color="info.contrastText" sx={{ opacity: 0.7 }} gutterBottom>
                        Unit Type
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {detailUser.unitType}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" color="info.contrastText" sx={{ opacity: 0.7 }} gutterBottom>
                        Current Status
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {detailUser.currentStatus || 'Not available'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeView} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 