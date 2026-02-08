'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setShowForgotPassword(false);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Verify user is an admin
      const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));
      if (!adminDoc.exists() || !adminDoc.data().isActive) {
        await auth.signOut();
        setError('Access denied. You are not registered as an admin.');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'Failed to login. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <Paper
        elevation={3}
        className="p-8 max-w-md w-full"
        sx={{ backgroundColor: 'white', borderRadius: 2 }}
      >
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Image
              src="/dp-logo-02.png"
              alt="DP Jewellers"
              width={160}
              height={60}
              priority
            />
          </div>
          <Typography
            variant="body1"
            sx={{ color: '#666' }}
          >
            Admin Panel
          </Typography>
        </div>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        {resetSent && (
          <Alert severity="success" className="mb-4" onClose={() => setResetSent(false)}>
            Password reset email sent! Check your inbox and follow the link to set a new password.
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#1E1B4B',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#1E1B4B',
              },
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            variant="outlined"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#1E1B4B',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#1E1B4B',
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              backgroundColor: '#1E1B4B',
              '&:hover': {
                backgroundColor: '#2D2963',
              },
              padding: '12px',
              fontSize: '16px',
              textTransform: 'none',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <Button
          fullWidth
          onClick={handleForgotPassword}
          disabled={loading}
          sx={{
            mt: 2,
            color: '#1E1B4B',
            textTransform: 'none',
            fontSize: '14px',
            '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' },
          }}
        >
          Forgot Password?
        </Button>

      </Paper>
    </div>
  );
}
