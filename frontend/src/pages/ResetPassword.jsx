// pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword, clearError, clearResetState } from '@/redux/slices/authSlice';
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Card from '@/components/Card';
import PageTransition from '@/components/PageTransition';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get state from Redux
  const { loading, error: reduxError, resetEmail, resetStep, resetToken } = useSelector((state) => state.auth);
  
  console.log('ResetPassword - Redux State:', { resetEmail, resetStep, loading, resetToken });

  // Redirect if user shouldn't be here
  useEffect(() => {
    console.log('ResetPassword useEffect - Checking:', { 
      hasEmail: !!resetEmail, 
      hasToken: !!resetToken,
      step: resetStep 
    });
    
    if (!resetEmail || resetStep !== 'reset' || !resetToken) {
      console.log('Invalid state, navigating to forgot-password');
      navigate('/forgot-password');
    }
  }, [resetEmail, resetToken, resetStep, navigate]);

  // Clear errors on component mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setLocalError('Please fill in both password fields');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    console.log('Dispatching resetPassword with:', {
      email: resetEmail,
      hasToken: !!resetToken,
      token: resetToken
    });

    // Dispatch reset password action WITH THE ACTUAL TOKEN
    const result = await dispatch(resetPassword({ 
      email: resetEmail, 
      newPassword,
      resetToken: resetToken // Use the actual token from state
    }));
    
    // Handle success
    if (resetPassword.fulfilled.match(result)) {
        console.log('Password reset successful');
        setSuccess(true);
        setTimeout(() => {
          dispatch(clearResetState());
          navigate('/login');
        }, 3000);
    } else {
        console.log('Password reset failed:', result);
    }
  };

  // Success screen
  if (success) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center p-4 md:px-6 py-24 overflow-x-hidden">
          <div className="floating-shape w-64 h-64 bg-green-500 top-20 -left-20 fixed pointer-events-none" />
          <div className="floating-shape w-56 h-56 bg-emerald-400 bottom-20 -right-20 fixed pointer-events-none" style={{ animationDelay: '-8s' }} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md relative z-10"
          >
            <Card variant="glass" className="p-6 md:p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </motion.div>
              
              <h1 className="font-display text-2xl font-bold mb-2">Password Reset Successfully!</h1>
              <p className="text-muted-foreground mb-6">
                Your password has been updated successfully. You will be redirected to the login page shortly.
              </p>
              
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'linear' }}
                className="h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
              />
              
              <div className="mt-6">
                <Button 
                  onClick={() => {
                    dispatch(clearResetState());
                    navigate('/login');
                  }}
                  className="w-full"
                >
                  Go to Login Now
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  // Combine local and redux errors
  const errorMessage = localError || reduxError;

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center p-4 md:px-6 py-24 mt-10 overflow-x-hidden">
        <div className="floating-shape w-64 h-64 bg-asaan-sky top-20 -right-20 fixed pointer-events-none" />
        <div className="floating-shape w-56 h-56 bg-asaan-steel bottom-20 -left-20 fixed pointer-events-none" style={{ animationDelay: '-8s' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md relative z-10"
        >
          <Card variant="glass" className="p-6 md:p-8">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center mx-auto mb-4"
              >
                <Lock className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="font-display text-2xl font-bold mb-2">New Password</h1>
              <p className="text-muted-foreground">
                Create a new password for: <span className="font-medium">{resetEmail}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  icon={<Lock className="w-5 h-5" />}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[42px] text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Input
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                disabled={loading}
                required
              />

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-xl"
                >
                  {errorMessage}
                </motion.div>
              )}

              <div className="bg-asaan-sky/10 p-4 rounded-xl">
                <p className="text-sm text-asaan-royal font-medium mb-2">Password Requirements:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    At least 6 characters long
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${newPassword === confirmPassword && newPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Passwords must match
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={loading}
                disabled={loading}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                Back to Login
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default ResetPassword;