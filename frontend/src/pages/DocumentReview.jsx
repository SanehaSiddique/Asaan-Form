import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    CheckCircle,
    AlertCircle,
    ChevronLeft,
    ZoomIn,
    ZoomOut,
    RefreshCw,
    Save,
    Edit3,
    Search,
    Info,
    Layout,
    ArrowRight
} from 'lucide-react';
import API from '../../axiosInstance';
import Button from '@/components/Button';
import PageTransition from '@/components/PageTransition';
import { toast } from 'sonner';

const DocumentReview = () => {
    const { formId, documentId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [document, setDocument] = useState(null);
    const [form, setForm] = useState(null);
    const [mapping, setMapping] = useState([]);
    const [activeField, setActiveField] = useState(null);
    const [zoom, setZoom] = useState(0.85);
    const [saving, setSaving] = useState(false);

    const containerRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch document (with populated formId)
                const docResponse = await API.get(`upload/document/${documentId}`);
                const doc = docResponse.data.document;
                setDocument(doc);
                setMapping(doc.semanticMapping || []);

                // 2. Map form details
                if (doc.formId && typeof doc.formId === 'object') {
                    setForm(doc.formId);
                } else {
                    const formRes = await API.get(`upload/form/${formId}`);
                    setForm(formRes.data.form);
                }
            } catch (error) {
                console.error("Error fetching review data:", error);
                toast.error("Failed to load review workspace");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [documentId, formId]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await API.put(`/upload/document/mapping/${documentId}`, {
                mapping: mapping
            });
            toast.success("Changes saved successfully");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleFieldChange = (index, newValue) => {
        const newMapping = [...mapping];
        newMapping[index].value = newValue;
        setMapping(newMapping);
    };

    const handleContinue = () => {
        navigate(`/form-workspace/${formId}/${documentId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-asaan-warm/10">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-asaan-sky/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <RefreshCw className="w-8 h-8 text-asaan-royal animate-spin" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-asaan-royal mb-2">Setting up Workspace</h2>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                        Our AI is finalizing the semantic mapping for your document...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <PageTransition>
            {/* Main container with padding to clear the fixed global Navbar */}
            <div className="h-screen pt-24 pb-4 px-4 flex flex-col overflow-hidden bg-asaan-warm/5">

                {/* Internal Workspace Header: Using Glassmorphism */}
                <header className="glass-card rounded-[2rem] px-8 py-4 mb-4 flex items-center justify-between shadow-soft border-asaan-sky/20">
                    <div className="flex items-center gap-5">
                        <motion.button
                            whileHover={{ x: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center bg-asaan-sky/10 text-asaan-royal rounded-xl hover:bg-asaan-sky/20 transition-all border border-asaan-sky/20"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </motion.button>

                        <div className="h-10 w-px bg-border/60 mx-1 hidden sm:block" />

                        <div>
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-asaan-royal" />
                                <h1 className="font-display font-extrabold text-xl text-asaan-royal leading-tight">Review Mapping</h1>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.1em] mt-0.5">
                                Form: <span className="text-asaan-steel">{form?.formName}</span> • Extraction Verification
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Zoom Controls Overlay */}
                        <div className="hidden lg:flex items-center bg-asaan-sky/5 p-1 rounded-2xl border border-asaan-sky/20">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
                                className="p-2 hover:bg-white rounded-xl transition-all text-asaan-steel hover:text-asaan-royal"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </motion.button>
                            <span className="text-xs font-bold w-14 text-center text-asaan-royal selection:bg-transparent">
                                {Math.round(zoom * 100)}%
                            </span>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}
                                className="p-2 hover:bg-white rounded-xl transition-all text-asaan-steel hover:text-asaan-royal"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </motion.button>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSave}
                                disabled={saving}
                                className="border-asaan-sky/30 hover:bg-asaan-sky/5 text-asaan-royal font-bold rounded-xl"
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Changes
                            </Button>

                            <Button
                                size="sm"
                                className="bg-gradient-to-r from-asaan-sky to-asaan-royal hover:shadow-glow transition-all font-bold px-6 rounded-xl"
                                onClick={handleContinue}
                            >
                                Continue To Form
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Split Workspace View */}
                <div className="flex-1 flex gap-4 overflow-hidden">

                    {/* LEFT: Form Template Display Workspace */}
                    <div
                        className="flex-1 relative overflow-auto bg-white rounded-[2.5rem] p-16 flex justify-center items-start border border-border/50 shadow-soft custom-scrollbar group"
                        ref={containerRef}
                    >
                        <motion.div
                            className="relative shadow-2xl origin-top"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, scale: zoom }}
                            transition={{ duration: 0.2 }}
                        >
                            <img
                                src={form?._id ? `/api/upload/file/${form._id}` : undefined}
                                alt="Form Template"
                                className="max-w-none h-auto select-none rounded shadow-sm border border-border/20"
                            />

                            {/* SVG Overlay for bounding boxes */}
                            {mapping.map((m, i) => (
                                m.target_box && (
                                    <motion.div
                                        key={`target-${i}`}
                                        className={`absolute border-2 rounded-md transition-all cursor-pointer ${activeField === i
                                                ? 'border-asaan-royal bg-asaan-royal/10 ring-8 ring-asaan-royal/5 z-30 shadow-glow'
                                                : 'border-transparent z-20 hover:border-asaan-sky/40 hover:bg-asaan-sky/5'
                                            }`}
                                        initial={false}
                                        style={{
                                            left: m.target_box[0],
                                            top: m.target_box[1],
                                            width: m.target_box[2] - m.target_box[0],
                                            height: m.target_box[3] - m.target_box[1]
                                        }}
                                        onMouseEnter={() => setActiveField(i)}
                                        onMouseLeave={() => setActiveField(null)}
                                    >
                                        <AnimatePresence>
                                            {activeField === i && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-asaan-royal text-white text-[11px] px-3 py-1 rounded-full font-bold shadow-large whitespace-nowrap z-50 flex items-center gap-2"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                    {m.field_name}
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-asaan-royal rotate-45" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )
                            ))}
                        </motion.div>
                    </div>

                    {/* RIGHT: Sidebar with Extraction Controls */}
                    <div className="w-[480px] flex flex-col bg-transparent overflow-hidden">
                        <div className="glass-card rounded-[2.5rem] flex-1 flex flex-col overflow-hidden shadow-soft border-asaan-sky/10">

                            {/* Panel Header */}
                            <div className="p-7 border-b border-border/30 flex items-center justify-between bg-white/40">
                                <div>
                                    <h3 className="font-display font-bold text-asaan-royal flex items-center gap-2">
                                        <Layout className="w-4 h-4" />
                                        Extracted Attributes
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">VERIFY AND CORRECT MAPPED DATA</p>
                                </div>
                                <div className="flex items-center gap-2 bg-asaan-sky/10 px-3 py-1.5 rounded-full border border-asaan-sky/20">
                                    <div className="w-2 h-2 rounded-full bg-asaan-royal animate-pulse" />
                                    <span className="text-[11px] font-black text-asaan-royal tracking-wide">
                                        {mapping.length} FIELDS
                                    </span>
                                </div>
                            </div>

                            {/* Scrollable Fields List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white/20">
                                {mapping.map((field, index) => (
                                    <motion.div
                                        key={index}
                                        layout
                                        onMouseEnter={() => setActiveField(index)}
                                        onMouseLeave={() => setActiveField(null)}
                                        className={`group relative p-5 rounded-[2rem] border transition-all duration-300 ${activeField === index
                                                ? 'border-asaan-royal bg-white shadow-medium ring-1 ring-asaan-royal/10 translate-x-1'
                                                : 'border-border bg-white/40 hover:bg-white/80 hover:border-asaan-sky/30'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${activeField === index ? 'bg-asaan-royal text-white' : 'bg-asaan-sky/20 text-asaan-royal'
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                                <label className="text-[11px] font-black text-asaan-steel/80 uppercase tracking-widest">
                                                    {field.field_name || field.field}
                                                </label>
                                            </div>
                                            {field.value && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                </motion.div>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={field.value || ''}
                                                onChange={(e) => handleFieldChange(index, e.target.value)}
                                                className="w-full bg-asaan-warm/10 border border-border/50 rounded-2xl px-5 py-3.5 text-sm focus:ring-4 focus:ring-asaan-royal/10 focus:border-asaan-royal outline-none transition-all font-semibold pr-12 text-asaan-royal hover:bg-white focus:bg-white"
                                                placeholder="Data not found..."
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
                                                <Edit3 className="w-4 h-4 text-asaan-steel" />
                                            </div>
                                        </div>

                                        {/* Source Context Mini-Panel */}
                                        <AnimatePresence>
                                            {activeField === index && field.source_boxes?.[0] && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                    animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                                                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-3 bg-gradient-to-br from-asaan-warm/20 to-asaan-sky/5 rounded-2xl border border-asaan-sky/10 flex items-start gap-3">
                                                        <Search className="w-4 h-4 text-asaan-royal/60 mt-0.5" />
                                                        <div>
                                                            <p className="text-[9px] font-black text-asaan-royal/40 uppercase tracking-widest mb-1">
                                                                AI Sourced Text
                                                            </p>
                                                            <p className="text-[10.5px] text-asaan-steel font-medium italic leading-relaxed">
                                                                "{field.source_boxes[0].text}"
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}

                                {mapping.length === 0 && (
                                    <div className="text-center py-24 px-8 opacity-40">
                                        <AlertCircle className="w-16 h-16 mx-auto mb-6 text-asaan-steel/40" />
                                        <h3 className="text-lg font-display font-bold">No Attributes Identified</h3>
                                        <p className="text-sm mt-2">The semantic mapper didn't find any direct matches in the document.</p>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar Footer Info */}
                            <div className="p-8 border-t border-border/30 bg-white/60">
                                <div className="bg-asaan-sky/5 p-4 rounded-3xl flex items-start gap-4 border border-asaan-sky/10 shadow-inner">
                                    <div className="w-10 h-10 rounded-2xl bg-asaan-sky/20 flex items-center justify-center shrink-0">
                                        <Info className="w-5 h-5 text-asaan-royal" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-asaan-royal uppercase tracking-wide mb-1">How it works</p>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            We've highlighted where the AI thinks each piece of information belongs. Hover to sync, and click to edit any inaccurate values.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 12px;
                        height: 12px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(0,0,0,0.02);
                        border-radius: 20px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(0,0,0,0.08);
                        border-radius: 20px;
                        border: 4px solid transparent;
                        background-clip: content-box;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(0,0,0,0.15);
                        background-clip: content-box;
                    }
                    
                    /* Custom glass card for a premium look */
                    .glass-card {
                        background: rgba(255, 255, 255, 0.7);
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.4);
                    }
                ` }} />
            </div>
        </PageTransition>
    );
};

export default DocumentReview;
