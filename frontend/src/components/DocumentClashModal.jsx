import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, FileText, User, Check, X, ShieldAlert } from 'lucide-react';
import Button from './Button';
import API from '../../axiosInstance';
import { toast } from 'sonner';

const DocumentClashModal = ({ isOpen, onClose, clashReport, onResolved }) => {
    const [excluding, setExcluding] = useState({}); // filename -> boolean
    const [loading, setLoading] = useState(false);

    if (!clashReport) return null;

    const handleToggleExclusion = (filename) => {
        setExcluding(prev => ({
            ...prev,
            [filename]: !prev[filename]
        }));
    };

    const handleResolve = async () => {
        setLoading(true);
        try {
            // Find the documents in Node backend and mark them as excluded
            const identities = clashReport.identities || [];
            const allDocs = identities.flatMap(id => id.documents);
            
            // Sequential updates to avoid race conditions or use Promise.all
            await Promise.all(allDocs.map(doc => {
                const isExcluded = !!excluding[doc.filename];
                // We need the document ID from the database, but clashReport only has filenames
                // The frontend should have the documents list to map filename -> id
                // For now, let's assume we can resolve it on the backend by passing filenames
                // Actually, it's better to send the exclusion list to the caller
            }));

            onResolved(Object.keys(excluding).filter(k => excluding[k]));
            onClose();
        } catch (error) {
            console.error("Error resolving clash:", error);
            toast.error("Failed to resolve identity clash");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-red-50 p-6 flex items-center gap-4 border-b border-red-100">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-7 h-7 text-red-600" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-display font-bold text-red-900 leading-tight">
                            Identity Conflict Detected
                        </DialogTitle>
                        <DialogDescription className="text-red-700 text-xs font-medium mt-1">
                            We found documents belonging to different people. Please select which to use.
                        </DialogDescription>
                    </div>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
                    {clashReport.identities?.map((identity, idx) => (
                        <div key={idx} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <User className="w-4 h-4 text-asaan-royal" />
                                <span className="font-bold text-sm text-asaan-royal uppercase tracking-wide">
                                    Identity: {identity.name}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2">
                                {identity.documents.map((doc, dIdx) => {
                                    const isExcluded = excluding[doc.filename];
                                    return (
                                        <div 
                                            key={dIdx}
                                            onClick={() => handleToggleExclusion(doc.filename)}
                                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                                                isExcluded 
                                                    ? 'border-gray-100 bg-gray-50/50 grayscale opacity-60' 
                                                    : 'border-asaan-sky/20 bg-asaan-sky/5 hover:border-asaan-sky/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExcluded ? 'bg-gray-200' : 'bg-asaan-sky/20'}`}>
                                                    <FileText className={`w-5 h-5 ${isExcluded ? 'text-gray-400' : 'text-asaan-royal'}`} />
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${isExcluded ? 'text-gray-500' : 'text-asaan-royal'}`}>
                                                        {doc.document_type || 'Document'}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                                        {doc.filename}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                                isExcluded 
                                                    ? 'bg-gray-200 text-gray-500' 
                                                    : 'bg-asaan-royal text-white shadow-sm'
                                            }`}>
                                                {isExcluded ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
                    <div className="flex items-center justify-between w-full">
                        <p className="text-[10px] text-muted-foreground font-medium max-w-[300px]">
                            Selected documents will be excluded and we will not use them as part of semantic mapping.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
                            <Button 
                                className="bg-asaan-royal hover:shadow-glow px-8" 
                                onClick={handleResolve}
                                isLoading={loading}
                                size="sm"
                            >
                                Continue with selected
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DocumentClashModal;
