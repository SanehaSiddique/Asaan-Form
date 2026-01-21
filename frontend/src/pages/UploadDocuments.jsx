import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileStack, ArrowRight, ArrowLeft, CreditCard, GraduationCap, FileText } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import UploadBox from '@/components/UploadBox';
import PageTransition from '@/components/PageTransition';

const UploadDocuments = () => {
  const [hasFiles, setHasFiles] = useState(false);
  const navigate = useNavigate();

  const handleFilesChange = (files) => {
    setHasFiles(files.some(f => f.status === 'success' || f.status === 'uploading'));
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index <= 1
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
                  onClick={() => navigate('/form-editor')}
                  disabled={!hasFiles}
                  icon={<ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                >
                  Continue to Editor
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
