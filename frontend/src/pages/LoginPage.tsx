// frontend/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

// MUI Imports
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => { // Add type for event
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log("LoginPage handleSubmit: Attempting signup/login with:", { email, password, username });

    try {
      let user;
      if (isSignUp) {
        user = await signup(email, password, username);
      } else {
        user = await login(email, password);
      }
      if (user) {
        navigate('/dashboard');
      }
    } catch (err: any) { // Use 'any' for now, or define specific error types later
      if (err.code) { // Firebase errors
        if (err.code === 'auth/email-already-in-use') {
          setError('Email is already in use. Try logging in.');
        } else if (err.code === 'auth/invalid-email' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError('Invalid email or password.');
        } else if (err.code === 'auth/weak-password') {
            setError('Password is too weak. Must be at least 6 characters.');
        } else {
          setError(err.message || 'An unknown authentication error occurred.');
        }
      } else if (err.response && err.response.data && err.response.data.detail) {
        // Backend FastAPI errors (e.g., from /auth/signup)
        setError(err.response.data.detail);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
    sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        width: '100%', // Ensure it takes full width
        bgcolor: '#f0f2f5' 
      }}>
      <Paper elevation={6} sx={{ padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
          {isSignUp ? 'Sign Up' : 'Login'}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          {isSignUp && (
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
            />
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : (isSignUp ? 'Sign Up' : 'Login')}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <Link
            component="button" // Use button component for accessibility
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(''); // Clear error on switch
              setEmail(''); // Clear fields on switch
              setPassword('');
              setUsername('');
            }}
            variant="body2"
            sx={{ cursor: 'pointer' }}
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default LoginPage;