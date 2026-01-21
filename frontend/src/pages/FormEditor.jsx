import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit3, Download, Save, ArrowLeft, FileText, FileDown } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Input from '@/components/Input';
import PageTransition from '@/components/PageTransition';
import { toast } from '@/hooks/use-toast';

const FormEditor = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const [compressionLevel, setCompressionLevel] = useState('medium');

  const [formData, setFormData] = useState({
    fullName: 'Ahmad Khan',
    fatherName: 'Muhammad Khan',
    dateOfBirth: '1999-05-15',
    cnic: '12345-1234567-1',
    email: 'ahmad.khan@example.com',
    phone: '+92 300 1234567',
    address: 'House 123, Street 45, F-7/2, Islamabad',
    city: 'Islamabad',
    province: 'Federal Capital Territory',
    postalCode: '44000',
    education: 'Bachelor of Science in Computer Science',
    institution: 'National University of Sciences and Technology',
    graduationYear: '2023',
    gpa: '3.75',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Form Saved",
      description: "Your form has been saved successfully.",
    });
  };

  const handleDownload = () => {
    toast({
      title: "Download Started",
      description: `Downloading form as ${downloadFormat.toUpperCase()}...`,
    });
    setTimeout(() => {
      toast({
        title: "Download Complete",
        description: "Your form has been downloaded.",
      });
    }, 1500);
  };

  const formSections = [
    {
      title: 'Personal Information',
      fields: [
        { key: 'fullName', label: 'Full Name', type: 'text' },
        { key: 'fatherName', label: "Father's Name", type: 'text' },
        { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
        { key: 'cnic', label: 'CNIC Number', type: 'text' },
      ],
    },
    {
      title: 'Contact Information',
      fields: [
        { key: 'email', label: 'Email Address', type: 'email' },
        { key: 'phone', label: 'Phone Number', type: 'tel' },
        { key: 'address', label: 'Full Address', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'province', label: 'Province/State', type: 'text' },
        { key: 'postalCode', label: 'Postal Code', type: 'text' },
      ],
    },
    {
      title: 'Educational Background',
      fields: [
        { key: 'education', label: 'Highest Qualification', type: 'text' },
        { key: 'institution', label: 'Institution Name', type: 'text' },
        { key: 'graduationYear', label: 'Graduation Year', type: 'text' },
        { key: 'gpa', label: 'GPA/Percentage', type: 'text' },
      ],
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pt-24 pb-12 px-6">
        <div className="floating-shape w-72 h-72 bg-asaan-sky top-32 -left-36" />
        <div className="floating-shape w-56 h-56 bg-asaan-steel bottom-32 -right-28" style={{ animationDelay: '-6s' }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-asaan-sky to-asaan-royal flex items-center justify-center mx-auto mb-6">
              <Edit3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Review & <span className="gradient-text">Edit Form</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Our AI has pre-filled your form. Review the information and make any necessary corrections.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            {['Upload Form', 'Upload Documents', 'Fill & Edit', 'Download'].map((step, index) => (
              <div key={step} className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${index <= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index <= 2
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {formSections.map((section, sectionIndex) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + sectionIndex * 0.1 }}
                >
                  <Card variant="glass" className="p-6">
                    <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-asaan-royal" />
                      {section.title}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.fields.map((field) => (
                        <Input
                          key={field.key}
                          label={field.label}
                          type={field.type}
                          value={formData[field.key]}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                        />
                      ))}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card variant="glass" className="p-6 sticky top-24">
                  <h3 className="font-display text-lg font-semibold mb-4">Download Options</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'pdf', label: 'PDF', icon: FileText },
                          { value: 'docx', label: 'DOCX', icon: FileDown },
                        ].map((format) => {
                          const Icon = format.icon;
                          return (
                            <motion.button
                              key={format.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setDownloadFormat(format.value)}
                              className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                                downloadFormat === format.value
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary hover:bg-secondary/80'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {format.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Compression</label>
                      <div className="flex gap-2">
                        {['low', 'medium', 'high'].map((level) => (
                          <motion.button
                            key={level}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setCompressionLevel(level)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm capitalize transition-colors ${
                              compressionLevel === level
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80'
                            }`}
                          >
                            {level}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <Button
                        className="w-full"
                        onClick={handleSave}
                        isLoading={isSaving}
                        icon={<Save className="w-4 h-4" />}
                        variant="secondary"
                      >
                        Save Progress
                      </Button>
                      <Button
                        className="w-full"
                        onClick={handleDownload}
                        icon={<Download className="w-4 h-4" />}
                      >
                        Download Form
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/upload-documents')}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back to Documents
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default FormEditor;
