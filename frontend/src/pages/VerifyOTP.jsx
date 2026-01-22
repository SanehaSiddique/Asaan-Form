// pages/VerifyOTP.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOTP, clearError, forgotPassword } from '@/redux/slices/authSlice';
import { Lock, RefreshCw, ArrowLeft } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import PageTransition from '@/components/PageTransition';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState('');
  const inputRefs = useRef([]);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get state from Redux
  const { loading, error: reduxError, resetEmail, resetStep } = useSelector((state) => state.auth);

  console.log('🔍 VerifyOTP - Redux State:', { resetEmail, resetStep, loading });

  // Get email from localStorage as fallback
  const savedEmail = localStorage.getItem('asaan_reset_email');

   // Redirect if no email in state
   useEffect(() => {
    console.log('VerifyOTP useEffect - Checking email:', resetEmail);
    if (!resetEmail) {
      console.log('No resetEmail, navigating to forgot-password');
      navigate('/forgot-password');
    }
  }, [resetEmail, navigate]);

  // Monitor resetStep changes
  useEffect(() => {
    console.log('resetStep changed:', resetStep);
    if (resetStep === 'reset') {
      console.log('Navigate to reset-password');
      navigate('/reset-password');
    }
  }, [resetStep, navigate]);

  // Clear errors on component mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Use email from Redux or localStorage
  const emailToUse = resetEmail || savedEmail;

  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Move to next input on right arrow
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Move to previous input on left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    
    if (/^\d{6}$/.test(pasteData)) {
      const pasteArray = pasteData.split('');
      const newOtp = [...otp];
      
      pasteArray.forEach((digit, index) => {
        if (index < 6) {
          newOtp[index] = digit;
        }
      });
      
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const otpString = otp.join('');
    
    // Validation
    if (otpString.length !== 6) {
      setLocalError('Please enter the complete 6-digit code');
      return;
    }

    if (!/^\d{6}$/.test(otpString)) {
      setLocalError('OTP must contain only numbers');
      return;
    }

    console.log('Dispatching verifyOTP for:', resetEmail);

    // Use email from Redux or localStorage
    const email = resetEmail || savedEmail;

    if (!email) {
        setLocalError('Email not found. Please restart the process.');
        navigate('/forgot-password');
        return;
      }
  
      // Dispatch verify OTP action
      const result = await dispatch(verifyOTP({ 
        email, 
        otp: otpString 
    }));

    console.log('verifyOTP result:', result);
    
    // On success, resetStep will be set to 'reset' by Redux
    if (verifyOTP.fulfilled.match(result)) {
      // Success handled by Redux state change
    }
  };

  const handleResend = async () => {
    if (resetEmail) {
      console.log('Resending OTP to:', resetEmail);
      await dispatch(forgotPassword({ email: resetEmail }));
    }
  };

  // If OTP verified successfully, redirect to reset password
  useEffect(() => {
    if (resetStep === 'reset') {
      navigate('/reset-password');
    }
  }, [resetStep, navigate]);

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
              <h1 className="font-display text-2xl font-bold mb-2">Verification Code</h1>
              <p className="text-muted-foreground">
                Enter the 6-digit code sent to{' '}
                <span className="font-medium text-foreground">{emailToUse}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-medium">Verification Code</label>
                <div className="flex justify-center gap-2 md:gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <motion.input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength="1"
                      value={otp[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={loading}
                      className="w-12 h-12 md:w-14 md:h-14 text-center text-xl font-bold bg-background border-2 border-border rounded-xl focus:border-asaan-royal focus:outline-none focus:ring-2 focus:ring-asaan-royal/20 transition-all"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 6-digit code from your email
                </p>
              </div>

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
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>

            <div className="mt-6 space-y-4 text-center">
              <button
                onClick={handleResend}
                disabled={loading}
                className="inline-flex items-center gap-2 text-asaan-royal hover:underline font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Resend Code
              </button>
              
              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => navigate('/forgot-password')}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Use different email
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default VerifyOTP;