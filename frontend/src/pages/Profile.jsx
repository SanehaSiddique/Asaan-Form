// pages/Profile.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { User, Mail, Calendar, FileText, Download, Eye, Edit, Upload, Clock, CheckCircle, Trash2 } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import PageTransition from '@/components/PageTransition';
import { toast } from 'sonner';
import API from '../../axiosInstance';

const Profile = () => {
  // Get user from Redux instead of Context
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [filledFormsHistory, setFilledFormsHistory] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const fetchData = async () => {
    if (!user) return;
    const userId = user.id ?? user._id;
    if (!userId) return;
    try {
      setLoading(true);
      const docsRes = await API.get(`upload/documents/user/${userId}`);
      const documents = docsRes.data?.documents || [];

      // 1. My Filled Forms (Documents associated with a form template)
      const filledForms = documents.filter(d => d.formId != null);
      
      setFilledFormsHistory(
        filledForms.map((d) => {
          // Use the populated formName from the form template if available
          const formName = d.formId?.formName || d.formId?.fileName || d.documentType || 'Filled Form';
          return {
            id: d._id,
            formId: d.formId?._id || d.formId,
            name: formName,
            uploadedAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
            status: d.semanticMapping?.length ? 'filled' : 'processing',
            format: (d.contentType || '').toUpperCase().includes('PDF') ? 'PDF' : 'IMAGE',
          };
        })
      );

      // 2. Uploaded Documents (Deduplicate by name to keep list clean)
      const uniqueDocs = [];
      const seenNames = new Set();
      documents.forEach((d) => {
        const name = d.fileName || d.documentType || 'Document';
        if (!seenNames.has(name)) {
          seenNames.add(name);
          uniqueDocs.push({
            id: d._id,
            name: name,
            size: d.fileSize ? `${(d.fileSize / (1024 * 1024)).toFixed(1)} MB` : '0.5 MB',
            uploadedAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
          });
        }
      });

      setUploadedDocuments(uniqueDocs);
    } catch (error) {
      console.error('Profile data fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDeleteDocument = async (id, name, isForm = false) => {
    if (!window.confirm(`Are you sure you want to delete ${isForm ? 'this filled form' : 'this document'}?`)) return;
    
    try {
      await API.delete(`upload/document/${id}`);
      toast.success(`${name} deleted successfully`);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleDownloadFilled = async (formId, documentId, name) => {
    try {
      toast.info(`Preparing download for ${name}...`);
      const response = await API.get(
        `upload/form/${formId}/document/${documentId}/filled-pdf`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `filled_${name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to generate filled PDF");
    }
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
            {/* Filled Forms History */}
            <div className="lg:col-span-2">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }}
              >
                <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-asaan-royal" /> My Filled Forms
                </h2>

                <motion.div 
                  variants={containerVariants} 
                  initial="hidden" 
                  animate="visible" 
                  className="space-y-4"
                >
                  {loading && filledFormsHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground px-2 py-4">Loading your forms...</p>
                  )}
                  {!loading && filledFormsHistory.length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-asaan-sky/20 rounded-[2rem] bg-white/50 backdrop-blur-sm">
                      <FileText className="w-12 h-12 text-asaan-sky/30 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No filled forms yet.</p>
                      <Button 
                        variant="link" 
                        onClick={() => navigate('/upload-form')}
                        className="mt-2 text-asaan-royal"
                      >
                        Start your first form
                      </Button>
                    </div>
                  )}
                  {filledFormsHistory.map((form) => (
                    <motion.div key={form.id} variants={itemVariants}>
                      <Card variant="glass" className="p-4 hover:shadow-glow-sm transition-all border-asaan-sky/10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-asaan-sky/20 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-asaan-royal" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-asaan-royal truncate">{form.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1 whitespace-nowrap bg-white/50 px-2 py-0.5 rounded-lg border border-asaan-sky/10">
                                  <Clock className="w-3 h-3 flex-shrink-0" /> {form.uploadedAt}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    form.status === 'filled'
                                      ? 'bg-green-100 text-green-600'
                                      : 'bg-yellow-100 text-yellow-600'
                                  }`}
                                >
                                  {form.status}
                                </span>
                                <span className="text-[10px] font-bold bg-secondary/50 px-2 py-0.5 rounded uppercase">
                                  {form.format}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto bg-white/30 p-1 rounded-xl border border-asaan-sky/5">
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(52, 152, 219, 0.1)' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => navigate(`/form-workspace/${form.formId}/${form.id}`)}
                              className="p-2.5 rounded-xl text-asaan-royal transition-colors"
                              title="Edit / View Workspace"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(52, 152, 219, 0.1)' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDownloadFilled(form.formId, form.id, form.name)}
                              className="p-2.5 rounded-xl text-asaan-royal transition-colors"
                              title="Download Filled PDF"
                            >
                              <Download className="w-4 h-4" />
                            </motion.button>
                            <div className="w-px h-4 bg-asaan-sky/10 mx-1" />
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDeleteDocument(form.id, form.name, true)}
                              className="p-2.5 rounded-xl text-muted-foreground transition-colors"
                              title="Delete Form Instance"
                            >
                              <Trash2 className="w-4 h-4" />
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

                <Card variant="glass" className="p-4 border-asaan-sky/10">
                  <div className="space-y-3">
                    {loading && uploadedDocuments.length === 0 && (
                      <p className="text-sm text-muted-foreground">Loading your documents...</p>
                    )}
                    {!loading && uploadedDocuments.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
                    )}
                    {uploadedDocuments.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white/60 hover:bg-white/60 transition-all group shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-asaan-sky/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <FileText className="w-5 h-5 text-asaan-royal" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-asaan-royal truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{doc.size}</span>
                              <span className="text-[10px] text-muted-foreground/50">•</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(52, 152, 219, 0.1)' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setPreviewDoc(doc)}
                              className="p-2 rounded-lg text-asaan-royal transition-colors"
                              title="Preview Document"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteDocument(doc.id, doc.name, false)}
                            className="p-2 rounded-lg text-muted-foreground transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
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
                <Card className="p-6 bg-gradient-to-br from-asaan-royal to-asaan-sky text-white border-none shadow-glow-sm">
                  <h3 className="font-display font-semibold mb-4 text-white/90 uppercase tracking-widest text-xs">Quick Stats</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="text-white/70 text-sm">Forms Filled</span>
                      <span className="font-bold text-2xl">{filledFormsHistory.length}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-white/70 text-sm">Unique Documents</span>
                      <span className="font-bold text-2xl">{uploadedDocuments.length}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setPreviewDoc(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-4xl bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white">
              <div>
                <h3 className="font-display font-bold text-xl text-asaan-royal">{previewDoc.name}</h3>
                <p className="text-xs text-muted-foreground">{previewDoc.size} • Uploaded on {previewDoc.uploadedAt}</p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 bg-secondary/30 flex items-center justify-center min-h-[400px]">
              {previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={`${API.defaults.baseURL.replace(/\/$/, '')}/upload/file/${previewDoc.id}#toolbar=0`}
                  className="w-full h-full border-none rounded-xl bg-white shadow-sm"
                  title={previewDoc.name}
                  style={{ minHeight: '60vh' }}
                />
              ) : (
                <img 
                  src={`${API.defaults.baseURL.replace(/\/$/, '')}/upload/file/${previewDoc.id}`}
                  alt={previewDoc.name}
                  className="max-w-full h-auto rounded-xl shadow-lg border"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-white flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPreviewDoc(null)}>Close</Button>
              <Button 
                onClick={() => window.open(`${API.defaults.baseURL.replace(/\/$/, '')}/upload/file/${previewDoc.id}`, '_blank')}
                icon={<Download className="w-4 h-4" />}
              >
                Download Original
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </PageTransition>
  );
};

export default Profile;