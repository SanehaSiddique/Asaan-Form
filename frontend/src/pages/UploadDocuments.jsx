import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FileStack, ArrowRight, ArrowLeft, CreditCard, GraduationCap, FileText, Loader2 } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import UploadBox from '@/components/UploadBox';
import PageTransition from '@/components/PageTransition';
import API from '../../axiosInstance';
import { toast } from 'sonner';
import DocumentClashModal from '@/components/DocumentClashModal';

const UploadDocuments = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const formId = searchParams.get('formId');
  const [showClashModal, setShowClashModal] = useState(false);
  const [clashReport, setClashReport] = useState(null);
  const [uploadedDocIDs, setUploadedDocIDs] = useState([]);

  const handleFilesChange = (newFiles) => {
    setFiles(newFiles);
  };

  const handleContinue = async () => {
    const validFiles = files.filter(
      (f) => f.rawFile && f.status !== 'error'
    );
    if (!validFiles.length) {
      toast.error("Please select at least one document");
      return;
    }

    if (!user) {
      toast.error("Please login to upload documents");
      navigate('/login');
      return;
    }
    const userId = user?.id ?? user?._id;
    if (!userId) {
      toast.error("Invalid user session. Please log in again.");
      return;
    }

    if (!formId) {
      toast.error("Form ID missing. Please go back and upload a form first.");
      return;
    }

    try {
      setUploading(true);
      const endpoint = 'upload/document';
      // Upload all selected documents sequentially
      let lastDocumentId = null;
      const docIDs = [];
      for (const fileItem of validFiles) {
        const formData = new FormData();
        formData.append('file', fileItem.rawFile);
        formData.append('userID', userId);
        formData.append('documentType', 'id_card'); 
        if (formId) {
          formData.append('formID', formId);
        }

        const response = await API.post(endpoint, formData, {
          headers: { 'Content-Type': undefined },
        });

        if (response.data?.document?._id) {
          lastDocumentId = response.data.document._id;
          docIDs.push(response.data.document._id);
        }
      }

      setUploadedDocIDs(docIDs);

      // --- NEW: Identity Conflict Check ---
      if (docIDs.length >= 2) {
        try {
          const clashResponse = await API.post('upload/validate-identities', {
            userID: userId,
            documentIDs: docIDs
          });

          if (clashResponse.data?.has_clash) {
            setClashReport(clashResponse.data.clash_report);
            setShowClashModal(true);
            return; // Pause here, modal will handle navigation
          }
        } catch (clashError) {
          if (clashError.response?.status === 409) {
            setClashReport(clashError.response.data.clash_report);
            setShowClashModal(true);
            return; // Pause here, modal will handle navigation
          }
          console.error("Clash detection error:", clashError);
        }
      }

      if (lastDocumentId) {
        toast.success(
          formId
            ? `Uploaded ${validFiles.length} document(s) and mapped to form`
            : `Uploaded ${validFiles.length} document(s)`
        );
        navigate(`/form-workspace/${formId}/${lastDocumentId}`);
      } else {
        toast.error("Upload finished but no document ID was returned. Please try again.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (error.code === "ERR_NETWORK" || error.message?.includes("Network Error")) {
        toast.error("Cannot reach server. Start the Node backend (port 3000) and AI backend (port 8000).");
      } else {
        toast.error(error.response?.data?.message || error.message || "Failed to upload document");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClashResolved = async (excludedFilenames) => {
    // 1. Mark excluded docs in backend
    for (const filename of excludedFilenames) {
      const doc = clashReport.identities.flatMap(id => id.documents).find(d => d.filename === filename);
      if (doc?.id) {
        await API.put(`upload/document/exclude/${doc.id}`, { isExcluded: true });
      }
    }

    // 2. Proceed to workspace with the remaining documents
    const remainingIDs = uploadedDocIDs.filter(id => {
      const doc = clashReport.identities.flatMap(id => id.documents).find(d => d.id === id);
      return !excludedFilenames.includes(doc?.filename);
    });

    const nextDocId = remainingIDs[0] || uploadedDocIDs[0];
    toast.success("Identity conflict resolved. Proceeding with selected documents.");
    navigate(`/form-workspace/${formId}/${nextDocId}?ignoreClash=true`);
  };

  const documentTypes = [
    { icon: CreditCard, label: 'CNIC / ID Card', description: 'For personal information extraction' },
    { icon: GraduationCap, label: 'Academic Transcripts', description: 'Educational details and grades' },
    { icon: FileText, label: 'Other Documents', description: 'Supporting documents as needed' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pt-24 pb-12 px-6">
        {/* Background shapes */}
        <div className="floating-shape w-72 h-72 bg-asaan-sky top-32 -right-36" />
        <div className="floating-shape w-56 h-56 bg-asaan-steel bottom-32 -left-28" style={{ animationDelay: '-6s' }} />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center mx-auto mb-6">
              <FileStack className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Upload Your <span className="gradient-text">Documents</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Upload documents like CNIC, transcripts, and other files. Our AI will extract relevant information to fill your form.
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            {['Upload Form', 'Upload Documents', 'Fill & Edit', 'Download'].map((step, index) => (
              <div key={step} className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${index <= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${index <= 1
                    ? 'bg-gradient-to-br from-asaan-sky to-asaan-royal text-white'
                    : 'bg-secondary'
                    }`}>
                    {index + 1}
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{step}</span>
                </div>
                {index < 3 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </motion.div>

          {/* Document Types Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {documentTypes.map((doc, index) => {
              const Icon = doc.icon;
              return (
                <motion.div
                  key={doc.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Card variant="glass" className="h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-asaan-sky/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-asaan-royal" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{doc.label}</h3>
                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="glass" className="p-8">
              <UploadBox
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                multiple={true}
                onFilesChange={handleFilesChange}
                label="Upload Supporting Documents"
                description="Drag and drop your documents here, or click to browse"
              />

              <DocumentClashModal
                isOpen={showClashModal}
                onClose={() => setShowClashModal(false)}
                clashReport={clashReport}
                onResolved={handleClashResolved}
              />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 flex justify-between"
              >
                <Button
                  variant="outline"
                  onClick={() => navigate('/upload-form')}
                  icon={<ArrowLeft className="w-5 h-5" />}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleContinue}
                  disabled={files.length === 0 || uploading}
                  icon={uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                >
                  {uploading ? 'Processing...' : 'Continue to Workspace'}
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default UploadDocuments;
