// pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useSelector } from 'react-redux';
import { ArrowRight, Upload, FileCheck, Sparkles, Download, Shield, Zap, Clock, Brain } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import PageTransition from '@/components/PageTransition';

const Home = () => {
  // Get auth state from Redux store
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const steps = [
    {
      icon: Upload,
      title: 'Upload Form',
      description: 'Upload any form document - we support PDF, images, and more.',
    },
    {
      icon: Brain,
      title: 'AI Analysis',
      description: 'Our AI analyzes the form structure and identifies all fields.',
    },
    {
      icon: FileCheck,
      title: 'Smart Fill',
      description: 'Upload your documents and let AI auto-fill the form.',
    },
    {
      icon: Download,
      title: 'Download',
      description: 'Review, edit if needed, and download your completed form.',
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Complete forms in minutes instead of hours.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your documents are encrypted and never stored permanently.',
    },
    {
      icon: Clock,
      title: 'Save Time',
      description: 'Reduce form-filling time by up to 90%.',
    },
    {
      icon: Sparkles,
      title: 'AI Powered',
      description: 'Advanced AI ensures accurate data extraction.',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-12">
          {/* Floating Shapes */}
          <div className="floating-shape w-96 h-96 bg-asaan-sky top-20 -left-48" />
          <div className="floating-shape w-64 h-64 bg-asaan-steel bottom-20 -right-32" style={{ animationDelay: '-5s' }} />
          <div className="floating-shape w-48 h-48 bg-asaan-royal top-1/2 left-1/4" style={{ animationDelay: '-10s' }} />

          {/* Gradient Overlay */}
          <motion.div 
            style={{ opacity }}
            className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none"
          />

          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-asaan-sky/20 border border-asaan-sky/30 text-asaan-royal text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI-Powered Form Assistant
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6"
            >
              <span className="gradient-text">ASAAN</span>{' '}
              <span className="text-foreground">FORM</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Your intelligent form assistant that makes filling out forms
              <span className="text-asaan-royal font-medium"> effortless and accurate</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to={isAuthenticated ? '/upload-form' : '/signup'}>
                <Button size="lg" icon={<ArrowRight className="w-5 h-5" />} iconPosition="right">
                  Get Started
                </Button>
              </Link>
              <Link to={isAuthenticated ? '/upload-form' : '/login'}>
                <Button size="lg" variant="outline" icon={<Upload className="w-5 h-5" />}>
                  Upload Form
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {[{ value: '10K+', label: 'Forms Processed' }, { value: '95%', label: 'Accuracy Rate' }, { value: '5min', label: 'Avg. Time Saved' }, { value: '24/7', label: 'AI Available' }].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="text-asaan-steel font-medium mb-4 block">How It Works</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Simple <span className="gradient-text">Four Steps</span> Process
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From upload to download, complete your forms in just a few clicks.
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div key={step.title} variants={itemVariants}>
                    <Card variant="glass" className="h-full relative">
                      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-asaan-sky/20 to-asaan-steel/20 flex items-center justify-center mb-4">
                        <Icon className="w-7 h-7 text-asaan-royal" />
                      </div>
                      <h3 className="font-display text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="features" className="py-24 relative bg-gradient-to-b from-asaan-sky/10 to-transparent">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="text-asaan-steel font-medium mb-4 block">Why Choose Us</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Benefits of <span className="gradient-text">ASAAN FORM</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Experience the future of form-filling with cutting-edge AI technology.
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <motion.div key={benefit.title} variants={itemVariants}>
                    <Card variant="gradient" className="h-full flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-semibold mb-2">{benefit.title}</h3>
                        <p className="text-muted-foreground">{benefit.description}</p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card variant="glass" glow className="text-center p-12">
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                  Join thousands of users who are already saving time with ASAAN FORM.
                </p>
                <Link to={isAuthenticated ? '/upload-form' : '/signup'}>
                  <Button size="lg" icon={<ArrowRight className="w-5 h-5" />} iconPosition="right">
                    Start for Free
                  </Button>
                </Link>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default Home;