import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function UserGreeting() {
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Get user role from token claims
        const idTokenRes = await auth.currentUser.getIdTokenResult();
        const role = idTokenRes.claims.role as string;
        
        // Determine collection name based on user role
        let collectionName = '';
        if (role === 'ADMIN') collectionName = 'system_administrators';
        else if (role === 'OPERATOR') collectionName = 'operators';
        else if (role === 'DISPATCHER') collectionName = 'dispatchers';
        else if (role === 'FIELD_UNIT') collectionName = 'field_units';
        
        if (collectionName) {
          const roleSpecificRef = doc(db, collectionName, auth.currentUser.uid);
          const roleSnap = await getDoc(roleSpecificRef);
          
          if (roleSnap.exists()) {
            const userData = roleSnap.data();
            // Check for name or displayName
            const name = userData.name || userData.displayName || '';
            setUserName(name);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, []);

  if (loading) return null;
  
  return (
    <Box sx={{ ml: 'auto', mr: 2 }}>
      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium' }}>
        Hello, {userName || 'User'}
      </Typography>
    </Box>
  );
} 