// AppContent.jsx to handle the Redux logic
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadFromStorage } from '@/redux/slices/authSlice';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import UploadForm from "@/pages/UploadForm";
import UploadDocuments from "@/pages/UploadDocuments";
import FormEditor from "@/pages/FormEditor";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import ForgotPassword from "@/pages/ForgotPassword";
import VerifyOTP from "@/pages/VerifyOTP";
import ResetPassword from "@/pages/ResetPassword";

const AppContent = () => {
  const dispatch = useDispatch();

  // Load auth from localStorage when app starts
  useEffect(() => {
    dispatch(loadFromStorage());
  }, [dispatch]);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-otp" element={<VerifyOTP />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/upload-form"
                  element={
                    <ProtectedRoute>
                      <UploadForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload-documents"
                  element={
                    <ProtectedRoute>
                      <UploadDocuments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/form-editor"
                  element={
                    <ProtectedRoute>
                      <FormEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </main>
          <Footer />
          <Chatbot />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default AppContent;