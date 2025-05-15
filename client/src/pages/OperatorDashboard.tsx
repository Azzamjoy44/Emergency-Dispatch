// client/src/pages/OperatorDashboard.tsx
import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, AppBar, Toolbar } from '@mui/material';
import { auth } from '../firebase';
import { getIdToken } from 'firebase/auth';
import UserGreeting from '../components/UserGreeting';

export default function OperatorDashboard() {
  const [callerNumber, setCallerNumber] = useState('');
  const [callerName, setCallerName] = useState('');
  const [location, setLocation]         = useState('');
  const [description, setDescription]   = useState('');
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!callerNumber || !location || !callerName) {
      setError('Please fill out Caller Number, Caller Name, and Location.');
      return;
    }

    setLoading(true);
    try {
      const token = await getIdToken(auth.currentUser!);
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ callerNumber, callerName, location, description }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Unknown error');
      }

      // Use callID from back-end response
      setSuccess(`Logged with ID: ${payload.callID}`);
      // Clear form fields
      setCallerNumber('');
      setCallerName('');
      setLocation('');
      setDescription('');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6">Operator Dashboard</Typography>
          <UserGreeting />
        </Toolbar>
      </AppBar>

      <Box maxWidth={400} mx="auto" mt={4} p={3} boxShadow={3} borderRadius={2}>
        <Typography variant="h5" gutterBottom>
          Log Incoming Call
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Caller Number"
            fullWidth
            value={callerNumber}
            onChange={e => setCallerNumber(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Caller Name"
            fullWidth
            value={callerName}
            onChange={e => setCallerName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Location"
            fullWidth
            value={location}
            onChange={e => setLocation(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Logging…' : 'Log Call'}
          </Button>
        </form>
      </Box>
    </Box>
  );
}
