import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FileUp, ArrowRight, FileText, Image, File, Loader2 } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import UploadBox from '@/components/UploadBox';
import PageTransition from '@/components/PageTransition';
import API from '../../axiosInstance';
import { toast } from 'sonner';

const UploadForm = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleFilesChange = (newFiles) => {
    setFiles(newFiles || []);
    if (newFiles?.length > 0) {
      toast.success("File selected — click 'Continue to Documents' to upload");
    }
  };

  const handleContinue = async () => {
    const uploadedFile = files.find(f => (f.status === 'success' || f.status === 'uploading') && f.rawFile);
    if (!uploadedFile?.rawFile) {
      toast.error("Please select a file first (click the box above or drag a PDF/image)");
      return;
    }

    if (!user) {
      toast.error("Please login to upload forms");
      navigate('/login');
      return;
    }
    const userId = user?.id ?? user?._id;
    if (!userId) {
      toast.error("Invalid user session. Please log in again.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadedFile.rawFile);
      formData.append('userID', userId);
      formData.append('formName', uploadedFile.name);

      const response = await API.post('upload/form', formData, {
        headers: { 'Content-Type': undefined },
      });

      if (response.data?.form) {
        toast.success("Form uploaded and structured successfully!");
        navigate(`/upload-documents?formId=${response.data.form._id}`);
      } else {
        toast.error("Unexpected response. Please try again.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      const msg = error.response?.data?.message || error.message;
      if (error.code === "ERR_NETWORK" || error.message?.includes("Network Error")) {
        toast.error("Cannot reach server. Start the Node backend (port 3000) and AI backend (port 8000).");
      } else {
        toast.error(msg || "Failed to upload form");
      }
    } finally {
      setUploading(false);
    }
  };

  const supportedFormats = [
    { icon: FileText, label: 'PDF Documents', ext: '.pdf' },
    { icon: Image, label: 'Images', ext: '.jpg, .png' },
    { icon: File, label: 'Word Documents', ext: '.docx' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pt-24 pb-12 px-6">
        {/* Background shapes */}
        <div className="floating-shape w-72 h-72 bg-asaan-sky top-32 -left-36" />
        <div className="floating-shape w-56 h-56 bg-asaan-steel bottom-32 -right-28" style={{ animationDelay: '-6s' }} />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center mx-auto mb-6">
              <FileUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Upload Your <span className="gradient-text">Form</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Upload the form you want to fill. Our AI will analyze its structure and prepare it for auto-filling.
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
                <div className={`flex items-center gap-2 ${index === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${index === 0
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="glass" className="p-8">
              <UploadBox
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                multiple={false}
                onFilesChange={handleFilesChange}
                label="Upload Form Document"
                description="Drag and drop your form here, or click to browse"
              />

              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-sm font-medium mb-4">Supported Formats</h3>
                <div className="grid grid-cols-3 gap-4">
                  {supportedFormats.map((format) => {
                    const Icon = format.icon;
                    return (
                      <motion.div
                        key={format.label}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                      >
                        <Icon className="w-5 h-5 text-asaan-steel" />
                        <div>
                          <p className="text-sm font-medium">{format.label}</p>
                          <p className="text-xs text-muted-foreground">{format.ext}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: files.length > 0 ? 1 : 0.5 }}
                className="mt-8 flex justify-end"
              >
                <Button
                  type="button"
                  onClick={handleContinue}
                  disabled={uploading}
                  icon={uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                >
                  {uploading ? 'Uploading...' : 'Continue to Documents'}
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default UploadForm;
