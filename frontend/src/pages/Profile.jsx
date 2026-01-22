// pages/Profile.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { User, Mail, Calendar, FileText, Download, Eye, Edit, Upload, Clock } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import PageTransition from '@/components/PageTransition';
import { toast } from '@/hooks/use-toast';

const Profile = () => {
  // Get user from Redux instead of Context
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Dummy form history data
  const formHistory = [
    { id: '1', name: 'University Application Form', uploadedAt: '2024-01-15', status: 'completed', format: 'PDF' },
    { id: '2', name: 'Passport Application', uploadedAt: '2024-01-10', status: 'completed', format: 'DOCX' },
    { id: '3', name: 'Job Application Form', uploadedAt: '2024-01-05', status: 'draft', format: 'PDF' },
  ];

  // Dummy uploaded documents
  const uploadedDocuments = [
    { name: 'CNIC_Front.jpg', size: '1.2 MB', uploadedAt: '2024-01-15' },
    { name: 'CNIC_Back.jpg', size: '1.1 MB', uploadedAt: '2024-01-15' },
    { name: 'Transcript.pdf', size: '2.4 MB', uploadedAt: '2024-01-14' },
    { name: 'Photo.jpg', size: '0.8 MB', uploadedAt: '2024-01-14' },
  ];

  const handleAction = (action, formName) => {
    toast({
      title: `${action} Form`,
      description: `${action}ing "${formName}"...`,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Format join date
  const joinDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recently';

  return (
    <PageTransition>
      <div className="min-h-screen pt-24 pb-12 px-4 md:px-6 overflow-x-hidden">
        {/* Background shapes - Fixed positioning */}
        <div className="floating-shape w-72 h-72 bg-asaan-sky top-32 -right-36 fixed pointer-events-none" />
        <div className="floating-shape w-56 h-56 bg-asaan-steel bottom-32 -left-28 fixed pointer-events-none" style={{ animationDelay: '-6s' }} />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Profile Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }} 
            className="mb-8"
          >
            <Card variant="glass" className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center text-white text-2xl md:text-3xl font-bold"
                >
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </motion.div>

                <div className="flex-1 text-center md:text-left">
                  <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-2">
                    {user?.name || user?.email || 'User'}
                  </h1>
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4 text-muted-foreground text-sm md:text-base">
                    <span className="flex items-center justify-center md:justify-start gap-2">
                      <Mail className="w-4 h-4 flex-shrink-0" /> 
                      <span className="truncate">{user?.email || 'user@example.com'}</span>
                    </span>
                    <span className="flex items-center justify-center md:justify-start gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" /> 
                      Joined {joinDate}
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={() => navigate('/upload-form')} 
                  icon={<Upload className="w-4 h-4" />}
                  className="mt-4 md:mt-0"
                >
                  New Form
                </Button>
              </div>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form History */}
            <div className="lg:col-span-2">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }}
              >
                <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-asaan-royal" /> Form History
                </h2>

                <motion.div 
                  variants={containerVariants} 
                  initial="hidden" 
                  animate="visible" 
                  className="space-y-4"
                >
                  {formHistory.map((form) => (
                    <motion.div key={form.id} variants={itemVariants}>
                      <Card variant="glass" className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-asaan-sky/20 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 md:w-6 md:h-6 text-asaan-royal" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium truncate">{form.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <Clock className="w-3 h-3 flex-shrink-0" /> {form.uploadedAt}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                                    form.status === 'completed'
                                      ? 'bg-green-500/20 text-green-600'
                                      : 'bg-yellow-500/20 text-yellow-600'
                                  }`}
                                >
                                  {form.status}
                                </span>
                                <span className="text-xs bg-secondary px-2 py-0.5 rounded whitespace-nowrap">
                                  {form.format}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleAction('View', form.name)}
                              className="p-2 rounded-lg hover:bg-secondary transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleAction('Edit', form.name)}
                              className="p-2 rounded-lg hover:bg-secondary transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleAction('Download', form.name)}
                              className="p-2 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>

            {/* Uploaded Documents */}
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.4 }}
              >
                <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-asaan-royal" /> Uploaded Documents
                </h2>

                <Card variant="glass" className="p-4">
                  <div className="space-y-3">
                    {uploadedDocuments.map((doc, index) => (
                      <motion.div
                        key={doc.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-asaan-sky/20 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-asaan-royal" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.size}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {doc.uploadedAt}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.6 }} 
                className="mt-6"
              >
                <Card variant="gradient" glow className="p-6">
                  <h3 className="font-display font-semibold mb-4">Quick Stats</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Forms Completed</span>
                      <span className="font-bold text-lg gradient-text">2</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Documents Uploaded</span>
                      <span className="font-bold text-lg gradient-text">4</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Time Saved</span>
                      <span className="font-bold text-lg gradient-text">45 min</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;