import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '@/components/Button';
import PageTransition from '@/components/PageTransition';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-6 py-24">
        {/* Background shapes */}
        <div className="floating-shape w-80 h-80 bg-asaan-sky -top-20 -left-20" />
        <div className="floating-shape w-64 h-64 bg-asaan-steel bottom-20 -right-20" style={{ animationDelay: '-8s' }} />

        <div className="text-center relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mb-8"
          >
            <span className="text-[150px] md:text-[200px] font-display font-bold gradient-text leading-none">
              404
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-2xl md:text-3xl font-bold mb-4"
          >
            Page Not Found
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mb-8 max-w-md mx-auto"
          >
            Oops! The page you're looking for doesn't exist or has been moved.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/">
              <Button icon={<Home className="w-5 h-5" />}>
                Go Home
              </Button>
            </Link>
            <Button
              variant="outline"
              icon={<ArrowLeft className="w-5 h-5" />}
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default NotFound;
