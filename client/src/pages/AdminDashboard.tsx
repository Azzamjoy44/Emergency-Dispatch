// client/src/pages/AdminDashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Button,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent,
  AppBar, Toolbar, CssBaseline, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import { auth, db } from '../firebase';
import { getIdToken } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import UserGreeting from '../components/UserGreeting';
import { signOut } from 'firebase/auth';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AccountManagement from './admin/AccountManagement';
import StatisticalReports from './admin/StatisticalReports';
import {
  People as PeopleIcon,
  BarChart as BarChartIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

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

const drawerWidth = 240;

export default function AdminDashboard() {
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
  // Add ref to track the current field unit ID being viewed
  const currentFieldUnitIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setOpenForm(true);
  };

  const closeForm = () => {
    setOpenForm(false);
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

  // Create or Update user
  const submitForm = async () => {
    setLoading(true);
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
    if (!form.isEdit) payload.password = form.password;

    await fetch('/api/admin/accounts', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify({ op, user: payload }),
    });

    setLoading(false);
    closeForm();
    fetchUsers();
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

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Determine which menu item is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Sidebar content
  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          System Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={isActive('/admin') || isActive('/admin/accounts')}
            onClick={() => navigate('/admin/accounts')}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Manage Accounts" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={isActive('/admin/reports')}
            onClick={() => navigate('/admin/reports')}
          >
            <ListItemIcon>
              <BarChartIcon />
            </ListItemIcon>
            <ListItemText primary="Statistical Reports" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  // If user is at root path, redirect to accounts
  React.useEffect(() => {
    if (location.pathname === '/admin') {
      navigate('/admin/accounts');
    }
  }, [location, navigate]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Emergency Dispatch System
          </Typography>
          <UserGreeting />
        </Toolbar>
      </AppBar>
      
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px' // Below the app bar
        }}
      >
        <Routes>
          <Route path="/accounts" element={<AccountManagement />} />
          <Route path="/reports" element={<StatisticalReports />} />
          <Route path="*" element={<Navigate to="/admin/accounts" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
