// client/src/pages/FieldUnitDashboard.tsx
import React, { useEffect, useState } from 'react';
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton,
  ListItemIcon, 
  ListItemText, 
  Typography, 
  Toolbar, 
  AppBar, 
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Inbox as InboxIcon, 
  LocalShipping as ShippingIcon, 
  Logout as LogoutIcon 
} from '@mui/icons-material';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import PendingDispatches from './fieldUnit/PendingDispatches';
import OngoingDispatch from './fieldUnit/OngoingDispatch';
import UserGreeting from '../components/UserGreeting';

const drawerWidth = 240;

export default function FieldUnitDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isInitialLogin, setIsInitialLogin] = useState(true);

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
      // Set status to NOT_AVAILABLE before logging out
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        await fetch('/api/field-units/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'NOT_AVAILABLE' })
        });
      }
      
      // Now sign out
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
          Field Unit
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={isActive('/field-unit') || isActive('/field-unit/pending')}
            onClick={() => navigate('/field-unit/pending')}
          >
            <ListItemIcon>
              <InboxIcon />
            </ListItemIcon>
            <ListItemText primary="Pending Dispatches" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={isActive('/field-unit/ongoing')}
            onClick={() => navigate('/field-unit/ongoing')}
          >
            <ListItemIcon>
              <ShippingIcon />
            </ListItemIcon>
            <ListItemText primary="Ongoing Dispatch" />
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

  // Monitor authentication state and check for ongoing and pending dispatches on login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setInitializing(false);

      if (user) {
        try {
          // Check if the field unit has an ongoing (CONFIRMED) dispatch
          const ongoingDispatchesQuery = query(
            collection(db, 'dispatches'),
            where('unitId', '==', user.uid),
            where('status', '==', 'CONFIRMED'),
            limit(1)
          );
          
          const ongoingDispatchesSnapshot = await getDocs(ongoingDispatchesQuery);
          const hasOngoingDispatch = !ongoingDispatchesSnapshot.empty;
          
          // Check if the field unit has any pending (SENT) dispatches
          const pendingDispatchesQuery = query(
            collection(db, 'dispatches'),
            where('unitId', '==', user.uid),
            where('status', '==', 'SENT'),
            limit(1)
          );
          
          const pendingDispatchesSnapshot = await getDocs(pendingDispatchesQuery);
          const hasPendingDispatch = !pendingDispatchesSnapshot.empty;
          
          // Set status based on dispatches
          let status = 'AVAILABLE';
          if (hasOngoingDispatch) {
            status = 'BUSY';
          } else if (hasPendingDispatch) {
            status = 'DISPATCHED';
          }
          
          // Update the field unit's status
          const token = await user.getIdToken();
          await fetch('/api/field-units/status', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status })
          });
          
          // Only redirect to ongoing dispatch on initial login if there's an ongoing dispatch
          if (hasOngoingDispatch && isInitialLogin) {
            navigate('/field-unit/ongoing');
            setIsInitialLogin(false);
          }
        } catch (err: any) {
          setError(err.message);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate, isInitialLogin]);

  // If user is at root path, redirect to pending
  useEffect(() => {
    if (location.pathname === '/field-unit') {
      navigate('/field-unit/pending');
    }
  }, [location, navigate]);

  if (initializing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

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
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Routes>
          <Route path="/pending" element={<PendingDispatches />} />
          <Route path="/ongoing" element={<OngoingDispatch />} />
          <Route path="*" element={<Navigate to="/field-unit/pending" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
