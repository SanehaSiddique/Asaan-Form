import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useFormWebSocket } from '../hooks/useFormWebSocket';
import {
    FileText,
    CheckCircle,
    AlertCircle,
    ChevronLeft,
    ZoomIn,
    ZoomOut,
    RefreshCw,
    Download,
    Search,
    Info,
    Layout,
    Edit3
} from 'lucide-react';
import API from '../../axiosInstance';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageTransition from '@/components/PageTransition';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DocumentClashModal from '../components/DocumentClashModal';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const fieldTypeToInputType = (fieldType) => {
    if (!fieldType) return 'text';
    const t = String(fieldType).toLowerCase();
    if (t === 'date') return 'date';
    if (t === 'email') return 'email';
    if (t === 'tel' || t === 'phone') return 'tel';
    if (t === 'checkbox' || t === 'radio') return 'checkbox';
    return 'text';
};

const FormWorkspace = () => {
    const { formId, documentId } = useParams();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);

    const [loading, setLoading] = useState(true);
    const [document, setDocument] = useState(null);
    const [form, setForm] = useState(null);
    const [mapping, setMapping] = useState([]);
    const [formValues, setFormValues] = useState({});
    const [activeField, setActiveField] = useState(null);
    const [zoom, setZoom] = useState(0.85);
    const [downloading, setDownloading] = useState(false);
    const [formImageSize, setFormImageSize] = useState({ width: 0, height: 0 });
    const [numPages, setNumPages] = useState(null);
    const [clashReport, setClashReport] = useState(null);
    const [isClashModalOpen, setIsClashModalOpen] = useState(false);

    const containerRef = useRef(null);

    // Convert coordinates: backend may send Docling (y-up / bottom-left) or top-left (y-down)
    const toCssBox = (box, imgHeight) => {
        if (!box || box.length < 4 || !imgHeight) return { left: 0, top: 0, width: 0, height: 0 };
        const left = box[0];
        const right = box[2];
        const width = right - left;
        const y1 = box[1];
        const y2 = box[3];
        if (y1 > y2) {
            // Docling: y increases upward, so y1 is "top" and y2 is "bottom"
            const topCss = imgHeight - y1;
            const height = y1 - y2;
            return { left, top: topCss, width, height };
        }
        return { left, top: y1, width, height: y2 - y1 };
    };

    // Bidirectional Scrolling
    useEffect(() => {
        if (activeField !== null) {
            // 1. Scroll React form to field
            const fieldElement = window.document.getElementById(`field-container-${activeField}`);
            if (fieldElement) {
                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // 2. Scroll PDF/Image container to the label highlight
            const overlayElement = window.document.getElementById(`overlay-label-${activeField}`);
            const scrollContainer = containerRef.current;
            if (overlayElement && scrollContainer) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const overlayRect = overlayElement.getBoundingClientRect();
                
                // Only scroll if outside visible area (with 50px padding)
                const isVisible = (
                    overlayRect.top >= containerRect.top + 50 &&
                    overlayRect.bottom <= containerRect.bottom - 50 &&
                    overlayRect.left >= containerRect.left + 50 &&
                    overlayRect.right <= containerRect.right - 50
                );

                if (!isVisible) {
                    overlayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [activeField]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const docResponse = await API.get(`upload/document/${documentId}`);
                const doc = docResponse.data.document;
                setDocument(doc);

                let formData = null;
                if (doc.formId && typeof doc.formId === 'object') {
                    formData = doc.formId;
                } else if (formId) {
                    const formRes = await API.get(`upload/form/${formId}`);
                    formData = formRes.data.form;
                }
                setForm(formData);

                // Prefer fill-data from AI (same as overlay PDF) so React form and overlays match the filled PDF
                let fillDataFields = [];
                try {
                    const fillRes = await API.get(`upload/form/${formId}/document/${documentId}/fill-data`);
                    fillDataFields = fillRes.data?.fields || fillRes.data?.final_json?.fields || [];
                } catch (fillErr) {
                    console.warn("Fill-data not available, using stored mapping:", fillErr?.message);
                }
                if (fillDataFields.length === 0) {
                    fillDataFields = doc.final_json?.fields || doc.semanticMapping || [];
                }

                // Value map from fill-data / stored mapping by field_key and field_name (normalized) for merging
                const valueByKey = {};
                const normalize = (s) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');
                fillDataFields.forEach((f) => {
                    const key = normalize(f.field_key ?? f.field_name);
                    const nameKey = normalize((f.field_name ?? f.field_key ?? '').toString().replace(/_/g, ' '));

                    if (key && !['__proto__', 'constructor', 'prototype'].includes(key)) {
                        valueByKey[key] = f;
                    }
                    if (nameKey && !['__proto__', 'constructor', 'prototype'].includes(nameKey) && !valueByKey[nameKey]) {
                        valueByKey[nameKey] = f;
                    }
                });

                // Canonical list: form schema order when available, so React form rows and labels are stable
                let map = [];
                if (formData?.formSchema?.length) {
                    map = formData.formSchema.map((f) => {
                        const schemaKey = normalize(f.field_key ?? f.key ?? f.label ?? f.name ?? '');
                        const nameKey = normalize((f.field_name ?? f.label ?? f.name ?? '').toString().replace(/_/g, ' '));
                        const fromFill = valueByKey[schemaKey] ?? valueByKey[nameKey];
                        return {
                            field_key: f.field_key ?? f.key,
                            field_name: f.field_name ?? f.label ?? f.name,
                            field_type: f.field_type ?? fromFill?.field_type ?? 'text_input',
                            value: fromFill?.value ?? '',
                            coordinates: fromFill?.coordinates ?? f.coordinates ?? null,
                            target_box: fromFill?.target_box ?? fromFill?.coordinates ?? f.coordinates ?? null,
                            page_number: fromFill?.page_number ?? f.page_number ?? 1,
                            source_boxes: fromFill?.source_boxes ?? [],
                        };
                    });
                }
                if (map.length === 0) {
                    map = fillDataFields.length ? fillDataFields : formData?.formSchema?.map((f) => ({
                        field_key: f.field_key ?? f.key,
                        field_name: f.field_name ?? f.label ?? f.name,
                        field_type: f.field_type ?? 'text_input',
                        value: '',
                        coordinates: f.coordinates ?? null,
                        target_box: f.coordinates ?? null,
                        page_number: f.page_number ?? 1,
                        source_boxes: [],
                    })) ?? [];
                }
                setMapping(map);

                // Populate React form with overlay answers (same values as overlay fill PDF)
                const initial = {};
                map.forEach((m, i) => {
                    const raw = m.value;
                    if (raw === null || raw === undefined) {
                        initial[i] = '';
                    } else if (typeof raw === 'boolean') {
                        initial[i] = raw;
                    } else {
                        initial[i] = typeof raw === 'string' ? raw : String(raw);
                    }
                });
                setFormValues(initial);
            } catch (error) {
                if (error.response?.status === 409) {
                    // Identity clash detected
                    setClashReport(error.response.data.clash_report);
                    setIsClashModalOpen(true);
                    return;
                }
                console.error("Error fetching workspace data:", error);
                toast.error("Failed to load form workspace");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [documentId, formId]);

    const handleClashResolved = async (excludedFilenames) => {
        try {
            setLoading(true);
            setIsClashModalOpen(false);
            
            // Find the documents to exclude by filename in the clash report
            const identities = clashReport.identities || [];
            const allClashDocs = identities.flatMap(id => id.documents);
            
            // Call the exclude API for each document the user wanted to remove
            const exclusionPromises = allClashDocs.map(doc => {
                const shouldExclude = excludedFilenames.includes(doc.filename);
                return API.put(`upload/document/exclude/${doc.id}`, { isExcluded: shouldExclude });
            });
            
            await Promise.all(exclusionPromises);
            
            toast.success("Document exclusions updated. Re-mapping...");
            
            // Re-trigger the fetchData logic by reloading the page or manually calling the fetch
            window.location.reload(); 
        } catch (error) {
            console.error("Error resolving clash:", error);
            toast.error("Failed to update document exclusions");
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (index, value) => {
        if (typeof index !== 'number' && typeof index !== 'string') return;
        if (String(index).includes('__proto__') || String(index).includes('constructor')) return;

        // Update individual input value state
        setFormValues(prev => ({ ...prev, [index]: value }));

        // Update the master mapping too so it's ready for saving
        setMapping(prevMapping => {
            const newMapping = [...prevMapping];
            if (newMapping[index]) {
                newMapping[index] = { ...newMapping[index], value: value };
            }
            return newMapping;
        });
    };

    const effectiveUserId = user?.id ?? user?._id ?? null;

    // BUG 4 FIX: wrap in useCallback with empty deps array.
    // The functional setState forms (setMapping, setFormValues) inside never need
    // stale closure values — they always receive the latest state as their argument.
    // Without useCallback, every render creates a new function reference, causing
    // the useEffect and useFormWebSocket listeners to re-register on every render,
    // and in some timing windows they fire against a stale mapping snapshot.
    const applyFieldUpdate = useCallback((field_key, newValue) => {
        console.log(`[FormWorkspace] 📥 applyFieldUpdate: "${field_key}" into "${newValue}"`);

        setMapping(prevMapping => {
            const newMapping = [...prevMapping];
            // ROBUST NORMALIZATION: handles dots, slashes, underscores, and lowercase
            const normalize = (s) => (s ?? "").toString().toLowerCase().replace(/[\s\.\/_\-]/g, "");
            const target = normalize(field_key);

            const index = newMapping.findIndex(f => {
                const fk = normalize(f.field_key);
                const fn = normalize(f.field_name);
                return fk === target || fn === target;
            });

            if (index !== -1) {
                console.log(`[FormWorkspace] ✅ MATCH FOUND at index ${index} (${newMapping[index].field_name}). Updating state...`);
                newMapping[index] = { ...newMapping[index], value: newValue };
                // setFormValues is stable (from useState) so safe to call inside setMapping callback
                setFormValues(prev => ({ ...prev, [index]: newValue }));
                toast.success(`Updated ${newMapping[index].field_name} via AI Chat 😊`);
            } else {
                console.warn(`[FormWorkspace] ❌ NO MATCH for key "${field_key}" (normalized: "${target}") in schema.`);
            }

            return newMapping;
        });
    }, []); // empty deps: only uses functional setState, never reads external state directly

    // Listen for real-time field updates from the Chatbot via WebSocket
    // BUG 4 FIX: pass applyFieldUpdate as a stable reference — useFormWebSocket
    // should also memoize its internal listener if it uses useEffect internally
    useFormWebSocket(effectiveUserId, (field_key, newValue) => {
        console.log(`[FormWorkspace] 🌐 WS received field_update: ${field_key} = ${newValue}`);
        applyFieldUpdate(field_key, newValue);
    });

    // Listen to local CustomEvent from Chatbot component as a bulletproof fallback
    // BUG 4 FIX: add applyFieldUpdate to the dependency array so the listener is
    // re-registered whenever the callback identity changes (it won't with useCallback + [],
    // but this is the correct pattern regardless)
    useEffect(() => {
        const handleLocalUpdate = (e) => {
            console.log(`[FormWorkspace] Received local update event:`, e.detail);
            if (e.detail && e.detail.field_key) {
                applyFieldUpdate(e.detail.field_key, e.detail.value);
            }
        };
        window.addEventListener("fieldUpdated", handleLocalUpdate);
        return () => window.removeEventListener("fieldUpdated", handleLocalUpdate);
    }, [applyFieldUpdate]); // BUG 4 FIX: was [] before, applyFieldUpdate is now a dep

    const [saving, setSaving] = useState(false);
    const saveChanges = async () => {
        try {
            setSaving(true);
            const response = await API.put(`upload/document/mapping/${documentId}`, {
                mapping: mapping
            });
            console.log("[FormWorkspace] Map saved. Server Response:", response.data);

            // Re-sync local state from server response (best practice)
            if (response.data?.mapping) {
                setMapping(response.data.mapping);
            }

            toast.success("All changes saved correctly! ✨");
        } catch (error) {
            console.error("Error saving manual edits:", error);
            toast.error("Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = async () => {
        try {
            setDownloading(true);
            toast.info("Generating filled PDF...");
            const response = await API.get(
                `upload/form/${formId}/document/${documentId}/filled-pdf`,
                { responseType: 'blob' }
            );
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `filled_${(form?.formName || 'form').replace(/\s+/g, '_').replace(/[^\w\-_. ]/g, '_')}.pdf`;
            window.document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => window.URL.revokeObjectURL(url), 500);
            toast.success("Download started");
        } catch (err) {
            let msg = "Download failed";
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const j = JSON.parse(text);
                    if (j?.message) msg = j.message;
                } catch (_) { }
            } else if (err.response?.data?.message) {
                msg = err.response.data.message;
            } else if (err.message) {
                msg = err.message;
            }
            toast.error(msg);
        } finally {
            setDownloading(false);
        }
    };

    const formSchema = form?.formSchema || [];
    const formImageUrl = form?._id ? `${API.defaults.baseURL}upload/file/${form._id}` : null;
    const isPdf = form?.contentType === 'application/pdf' || form?.fileName?.toLowerCase().endsWith('.pdf');

    const handleDragEnd = (index, info, imgHeight) => {
        const dx = info.offset.x / zoom;
        const dy = info.offset.y / zoom;

        setMapping(prevMapping => {
            const newMapping = [...prevMapping];
            const item = newMapping[index];
            const currentBox = item.target_box || item.coordinates;
            if (!currentBox || currentBox.length < 4) return prevMapping;

            // currentBox is in Docling coords: [left, top, right, bottom] where y-axis goes UP
            // screen offset: x is right, y is down
            // so dx increases left/right
            // dy increases screen-y. In Docling, y=0 is bottom, so screen-down means Docling-y decreases.
            newMapping[index] = {
                ...item,
                target_box: [
                    currentBox[0] + dx,
                    currentBox[1] - dy,
                    currentBox[2] + dx,
                    currentBox[3] - dy
                ]
            };
            return newMapping;
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-asaan-warm/10">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-asaan-royal/10 flex items-center justify-center mx-auto mb-6">
                        <RefreshCw className="w-8 h-8 text-asaan-royal animate-spin" />
                    </div>
                    <p className="text-muted-foreground animate-pulse font-medium">Preparing your workspace...</p>
                </div>
            </div>
        );
    }

    const renderOverlays = (pageNumber = null) => {
        return mapping.map((m, i) => {
            // Filter by page if rendering inside a PDF Document
            if (pageNumber !== null && (m.page_number || 1) !== pageNumber) return null;

            const targetBox = m.target_box || m.coordinates; // The value box (possibly dragged)
            
            // Try to get the actual label bounding box (source_boxes)
            let sourceBox = m.coordinates;
            let usingRealSourceBox = false;
            if (m.source_boxes && m.source_boxes.length > 0) {
                if (Array.isArray(m.source_boxes[0])) {
                    sourceBox = m.source_boxes[0];
                    usingRealSourceBox = true;
                } else if (m.source_boxes.length === 4 && typeof m.source_boxes[0] === 'number') {
                    sourceBox = m.source_boxes;
                    usingRealSourceBox = true;
                }
            }
            
            if (!sourceBox || !Array.isArray(sourceBox) || sourceBox.length < 4) return null;
            
            const cssSource = toCssBox(sourceBox, formImageSize.height);
            const cssTarget = toCssBox(targetBox, formImageSize.height);
            
            const displayValue = formValues[i] ?? m.value ?? '';
            const isCheckbox = (m.field_type || '').toLowerCase() === 'checkbox' || (m.field_type || '').toLowerCase() === 'radio';
            const showValue = displayValue != null && displayValue !== '' && !isCheckbox;
            const isActive = activeField === i;
            
            // Determine if the value has been manually moved away from its default label position
            // We use value comparison instead of identity comparison because objects lose identity after API save/reload
            const isMoved = targetBox && sourceBox && (
                Math.abs(targetBox[0] - sourceBox[0]) > 0.5 || 
                Math.abs(targetBox[1] - sourceBox[1]) > 0.5
            );
            
            return (
                <React.Fragment key={`map-${i}-${targetBox.join(',')}`}>
                    {/* Filled value overlay (Draggable) */}
                    {showValue && (
                        <motion.div
                            drag
                            dragMomentum={false}
                            onDragEnd={(e, info) => handleDragEnd(i, info, formImageSize.height)}
                            className={`absolute z-40 px-2 py-1 text-[11px] font-medium transition-all shadow-sm rounded cursor-grab active:cursor-grabbing ${
                                isActive 
                                    ? 'text-white bg-asaan-royal border-2 border-asaan-royal shadow-glow' 
                                    : 'text-asaan-royal bg-white border-2 border-asaan-sky hover:border-asaan-royal/50'
                            }`}
                            style={{
                                // If not moved, position it to the right of the label (cssSource)
                                // If moved, use the target coordinates directly
                                left: isMoved ? cssTarget.left : cssSource.left + cssSource.width + 10,
                                top: isMoved ? cssTarget.top : cssSource.top,
                                maxWidth: 200,
                                lineHeight: 1.3,
                                minHeight: Math.max(cssTarget.height, 20),
                                opacity: 1,
                                boxSizing: 'border-box'
                            }}
                            onClick={() => setActiveField(i)}
                            title={`Drag to reposition value for '${m.field_name}'`}
                        >
                            {String(displayValue).length > 30 ? String(displayValue).slice(0, 29) + '…' : displayValue}
                        </motion.div>
                    )}
                    
                    {/* Field Key (Label) Highlight - This is what the user wants to "tightly wrap" */}
                    <div
                        id={`overlay-label-${i}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveField(i)}
                        onKeyDown={(e) => e.key === 'Enter' && setActiveField(i)}
                        className={`absolute cursor-pointer z-20 flex items-center transition-all duration-300 rounded-[2px] box-border ${
                            isActive 
                                ? 'border-2 border-asaan-royal bg-asaan-royal/10 shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
                                : 'border border-asaan-sky/30 bg-asaan-sky/5 hover:border-asaan-sky/60 hover:bg-asaan-sky/10'
                        }`}
                        style={{
                            left: cssSource.left - 2, // Slight padding for "tight wrap" feel
                            top: cssSource.top - 1,
                            width: (usingRealSourceBox ? cssSource.width : Math.min(cssSource.width, Math.max(30, (m.field_name || '').length * (cssSource.height * 0.55) + 10))) + 4,
                            height: cssSource.height + 2
                        }}
                    >
                        {/* Tooltip on active */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute -top-10 left-0 bg-asaan-royal text-white text-[10px] px-3 py-1.5 rounded-xl font-bold shadow-large whitespace-nowrap z-50 flex items-center gap-2"
                                >
                                    <FileText className="w-3 h-3" />
                                    {m.field_name}
                                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-asaan-royal rotate-45" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </React.Fragment>
            );
        });
    };

    return (
        <PageTransition>
            <div className="h-screen pt-24 pb-4 px-4 flex flex-col overflow-hidden bg-asaan-warm/5">

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
                                <Layout className="w-5 h-5 text-asaan-royal" />
                                <h1 className="font-display font-extrabold text-xl text-asaan-royal leading-tight">Form Workspace</h1>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.1em] mt-0.5">
                                {form?.formName || 'Form'} — Click a field on the form or in the list to highlight
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center bg-asaan-sky/5 p-1 rounded-2xl border border-asaan-sky/20">
                            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-2 hover:bg-white rounded-xl transition-all"><ZoomOut className="w-4 h-4 text-asaan-steel" /></button>
                            <span className="text-xs font-bold w-14 text-center text-asaan-royal">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-2 hover:bg-white rounded-xl transition-all"><ZoomIn className="w-4 h-4 text-asaan-steel" /></button>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-asaan-royal/30 text-asaan-royal hover:bg-asaan-royal/5 font-bold px-6 rounded-xl"
                                onClick={saveChanges}
                                disabled={saving}
                                isLoading={saving}
                            >
                                Save Changes
                            </Button>
                            <Button
                                size="sm"
                                className="bg-gradient-to-r from-asaan-sky to-asaan-royal hover:shadow-glow transition-all font-bold px-6 rounded-xl"
                                onClick={handleDownload}
                                disabled={downloading}
                                isLoading={downloading}
                                icon={<Download className="w-4 h-4 mr-2" />}
                            >
                                Download filled PDF
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Left: Original form image with clickable field overlays */}
                    <div className="flex-1 relative overflow-auto bg-white rounded-[2.5rem] p-16 flex justify-center items-start border border-border/50 shadow-soft custom-scrollbar" ref={containerRef}>
                        <motion.div
                            className="relative shadow-2xl origin-top flex flex-col gap-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, scale: zoom }}
                            transition={{ duration: 0.2 }}
                        >
                            {formImageUrl && isPdf ? (
                                <Document
                                    file={formImageUrl}
                                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                    className="flex flex-col gap-4"
                                >
                                    {Array.from(new Array(numPages || 0), (el, index) => (
                                        <div key={`page_${index + 1}`} className="relative border border-border/10 rounded">
                                            <Page 
                                                pageNumber={index + 1} 
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                                onLoadSuccess={(page) => {
                                                    if (index === 0) {
                                                        // Fallback height for coordinates scaling if needed
                                                        setFormImageSize({ width: page.originalWidth, height: page.originalHeight });
                                                    }
                                                }}
                                            />
                                            {/* Render overlays for this specific PDF page */}
                                            {renderOverlays(index + 1)}
                                        </div>
                                    ))}
                                </Document>
                            ) : (
                                formImageUrl && (
                                    <>
                                        <img
                                            src={formImageUrl}
                                            alt="Form"
                                            className="max-w-none h-auto select-none rounded border border-border/10"
                                            onLoad={(e) => {
                                                const { naturalWidth, naturalHeight } = e.target;
                                                setFormImageSize({ width: naturalWidth, height: naturalHeight });
                                            }}
                                        />
                                        {/* Render all overlays for the image */}
                                        {renderOverlays(null)}
                                    </>
                                )
                            )}
                        </motion.div>
                    </div>

                    {/* Right: React form (editable) + summary */}
                    <div className="w-[480px] flex flex-col bg-transparent overflow-hidden">
                        <div className="glass-card rounded-[2.5rem] flex-1 flex flex-col overflow-hidden shadow-soft border-asaan-sky/10">
                            <div className="p-7 border-b border-border/30 flex items-center justify-between bg-white/40">
                                <div>
                                    <h3 className="font-display font-bold text-asaan-royal flex items-center gap-2">
                                        <Edit3 className="w-4 h-4" />
                                        Form fields
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase tracking-wider">Edit values — click to highlight on form</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white/20">
                                {mapping.map((field, index) => {
                                    const fieldType = field.field_type || formSchema[index]?.field_type;
                                    const inputType = fieldTypeToInputType(fieldType);
                                    const isCheckbox = inputType === 'checkbox';
                                    const label = field.field_name || field.field || `Field ${index + 1}`;
                                    // Same as overlay: use form state first, then field value from mapping
                                    const rawValue = formValues[index] ?? field.value ?? '';
                                    const value = isCheckbox
                                        ? (rawValue === true || rawValue === 'true' || rawValue === 'yes' || rawValue === '1')
                                        : (rawValue != null && rawValue !== '' ? String(rawValue) : '');

                                    return (
                                        <motion.div
                                            key={index}
                                            id={`field-container-${index}`}
                                            onClick={() => setActiveField(index)}
                                            className={`p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer ${activeField === index
                                                ? 'border-asaan-royal bg-white shadow-medium ring-1 ring-asaan-royal/10 translate-x-1'
                                                : 'border-border bg-white/40 hover:bg-white/80'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[11px] font-black text-asaan-steel/80 uppercase tracking-widest">
                                                    {label}
                                                </span>
                                                {value != null && value !== '' && !isCheckbox && <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                                            </div>

                                            {isCheckbox ? (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(value)}
                                                        onChange={(e) => handleFieldChange(index, e.target.checked)}
                                                        onFocus={() => setActiveField(index)}
                                                        className="w-4 h-4 rounded border-asaan-royal text-asaan-royal focus:ring-asaan-royal"
                                                    />
                                                    <span className="font-medium text-sm">{value ? 'Yes' : 'No'}</span>
                                                </label>
                                            ) : (
                                                <Input
                                                    label=""
                                                    type={inputType}
                                                    value={value}
                                                    onChange={(e) => handleFieldChange(index, e.target.value)}
                                                    onFocus={() => setActiveField(index)}
                                                    className="mt-0"
                                                />
                                            )}

                                            <AnimatePresence>
                                                {activeField === index && field.source_boxes?.[0] && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                        animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="p-3 bg-asaan-sky/5 rounded-2xl border border-asaan-sky/10">
                                                            <div className="flex items-center gap-2 mb-1.5 opacity-50">
                                                                <Search className="w-3 h-3 text-asaan-royal" />
                                                                <span className="text-[9px] font-bold text-asaan-royal uppercase tracking-tighter">Source</span>
                                                            </div>
                                                            <p className="text-[10px] text-asaan-steel italic leading-normal">
                                                                "{field.source_boxes[0].text}"
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}

                                {mapping.length === 0 && (
                                    <div className="text-center py-24 opacity-90">
                                        <AlertCircle className="w-16 h-16 mx-auto mb-6 text-asaan-steel/60" />
                                        <p className="font-display font-bold text-asaan-steel">No form fields found.</p>
                                        <p className="text-xs text-muted-foreground mt-3 max-w-[280px] mx-auto">
                                            Upload this form via Upload Form first (so fields are extracted), then upload a document with this form selected to see auto-mapped fields here.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-border/30 bg-white/60">
                                <div className="bg-asaan-sky/5 p-4 rounded-3xl border border-asaan-sky/10 flex items-start gap-4 shadow-inner">
                                    <div className="w-10 h-10 rounded-2xl bg-asaan-sky/20 flex items-center justify-center shrink-0">
                                        <Info className="w-5 h-5 text-asaan-royal" />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Click a field on the form image to highlight it here, or click a row here to highlight it on the form. Use &quot;Download filled PDF&quot; to get the overlay PDF.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(0,0,0,0.06);
                        border-radius: 20px;
                        border: 3px solid transparent;
                        background-clip: content-box;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(0,0,0,0.12);
                        background-clip: content-box;
                    }
                ` }} />

                <DocumentClashModal 
                    isOpen={isClashModalOpen}
                    onClose={() => setIsClashModalOpen(false)}
                    clashReport={clashReport}
                    onResolved={handleClashResolved}
                />
            </div>
        </PageTransition>
    );
};

export default FormWorkspace;