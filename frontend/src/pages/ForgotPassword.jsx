// pages/ForgotPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword, clearError, clearResetState } from '@/redux/slices/authSlice';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Card from '@/components/Card';
import PageTransition from '@/components/PageTransition';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get state from Redux
  const { loading, error: reduxError, resetStep, resetEmail } = useSelector((state) => state.auth);
  
  console.log('🔍 ForgotPassword - Redux State:', { resetStep, resetEmail, loading });

  // Clear errors on component mount
  useEffect(() => {
    dispatch(clearError());
    return () => {
      // Clear reset state when leaving page
      // dispatch(clearResetState());
    };
  }, [dispatch]);

  useEffect(() => {
    console.log('resetStep changed:', resetStep);
    if (resetStep === 'verify') {
      console.log('Navigate to verify-otp');
      navigate('/verify-otp');
    }
  }, [resetStep, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Basic validation
    if (!email) {
      setLocalError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }
    console.log('🚀 Dispatching forgotPassword with email:', email);

    // Dispatch forgot password action
    const result = await dispatch(forgotPassword({ email }));

    console.log('📨 Dispatch result:', result);
    console.log('Result type:', result.type);
    console.log('Result payload:', result.payload);
    
    // Check what happened
    if (forgotPassword.fulfilled.match(result)) {
      console.log('✅ forgotPassword.fulfilled - Success!');
      console.log('Payload:', result.payload);
    } else if (forgotPassword.rejected.match(result)) {
      console.log('❌ forgotPassword.rejected - Error!');
      console.log('Error payload:', result.payload);
    }
  };

  // If OTP sent successfully, show success message
  if (resetStep === 'verify') {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center p-4 mt-10 md:px-6 py-24 overflow-x-hidden">
          <div className="floating-shape w-64 h-64 bg-asaan-sky top-20 -left-20 fixed pointer-events-none" />
          <div className="floating-shape w-56 h-56 bg-asaan-steel bottom-20 -right-20 fixed pointer-events-none" style={{ animationDelay: '-8s' }} />

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
              
              <h1 className="font-display text-2xl font-bold mb-2">Check Your Email</h1>
              <p className="text-muted-foreground mb-6">
                We've sent a verification code to <span className="font-medium text-foreground">{email}</span>. 
                Please enter it below to reset your password.
              </p>
              
              <div className="space-y-4">
              <Button 
                onClick={() => {
                    // Save email to localStorage before navigating
                    localStorage.setItem('asaan_reset_email', email);
                    navigate('/verify-otp');
                }}
                className="w-full"
                size="lg"
                >
                Enter Verification Code
                </Button>
                
                <Button 
                  onClick={() => dispatch(clearResetState())}
                  variant="outline"
                  className="w-full"
                >
                  Use Different Email
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email?{' '}
                  <button
                    onClick={() => dispatch(forgotPassword({ email }))}
                    className="text-asaan-royal hover:underline font-medium"
                    disabled={loading}
                  >
                    {loading ? 'Resending...' : 'Resend Code'}
                  </button>
                </p>
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
      <div className="min-h-screen flex items-center justify-center p-4 md:px-6 py-24 overflow-x-hidden">
        {/* Background shapes */}
        <div className="floating-shape w-64 h-64 bg-asaan-sky top-20 -left-20 fixed pointer-events-none" />
        <div className="floating-shape w-56 h-56 bg-asaan-steel bottom-20 -right-20 fixed pointer-events-none" style={{ animationDelay: '-8s' }} />

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
                <Mail className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="font-display text-2xl font-bold mb-2">Reset Password</h1>
              <p className="text-muted-foreground">
                Enter your email and we'll send you a code to reset your password
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-5 h-5" />}
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

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={loading}
                disabled={loading}
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-asaan-royal hover:underline font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default ForgotPassword;