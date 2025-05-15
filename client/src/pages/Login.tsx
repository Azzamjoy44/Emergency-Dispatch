import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
// fetch the user's role from Firestore
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  // Function to get a user-friendly error message
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'The email address is not valid.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password for this account.';
      case 'auth/invalid-credential':
        return 'Invalid login credentials. Please check your email and password.';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful login attempts. Please try again later.';
      default:
        return 'Invalid login credentials. Please check your email and password.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      
      const user = auth.currentUser!;
      const idTokenRes = await user.getIdTokenResult();
      const role       = idTokenRes.claims.role as string;

      // navigate based on role
      if (role === 'ADMIN') {
        nav('/admin');
      } else if (role === 'OPERATOR') {
        nav('/operator');
      } else if (role === 'DISPATCHER') {
        nav('/dispatcher');
      } else if (role === 'FIELD_UNIT') {
        nav('/field-unit');
      } else {
        // fallback
        nav('/login');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      // Get a user-friendly error message
      const errorCode = (err as AuthError).code || '';
      setError(getErrorMessage(errorCode));
    }
  };

  return (
    <Box maxWidth={360} mx="auto" mt={8}>
      <Typography variant="h5" gutterBottom>Login</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth label="Email" margin="normal"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <TextField
          fullWidth label="Password" type="password" margin="normal"
          value={pw} onChange={e => setPw(e.target.value)}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
            {error}
          </Alert>
        )}
        <Button fullWidth variant="contained" color="primary" type="submit" sx={{ mt:2 }}>
          Sign In
        </Button>
      </form>
    </Box>
  );
}
