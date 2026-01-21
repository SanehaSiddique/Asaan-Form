import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, X, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const UploadBox = ({
  accept = "*",
  multiple = true,
  onFilesChange,
  maxSize = 10,
  label = "Upload Files",
  description = "Drag and drop files here, or click to browse",
}) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(
    (fileList) => {
      const newFiles = Array.from(fileList).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: file.size > maxSize * 1024 * 1024 ? "error" : "uploading",
        progress: 0,
      }));

      setFiles((prev) => {
        const updated = multiple ? [...prev, ...newFiles] : newFiles;
        onFilesChange?.(updated);
        return updated;
      });

      // Simulate upload progress
      newFiles.forEach((file) => {
        if (file.status === "error") return;

        const interval = setInterval(() => {
          setFiles((prev) => {
            return prev.map((f) => {
              if (f.id === file.id) {
                const newProgress = Math.min(f.progress + Math.random() * 30, 100);
                return {
                  ...f,
                  progress: newProgress,
                  status: newProgress >= 100 ? "success" : "uploading",
                };
              }
              return f;
            });
          });
        }, 200);

        setTimeout(() => clearInterval(interval), 2000);
      });
    },
    [maxSize, multiple, onFilesChange]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      onFilesChange?.(updated);
      return updated;
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}

      <motion.div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
        }}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-8 transition-colors cursor-pointer",
          "hover:border-primary hover:bg-primary/5",
          isDragging && "border-primary bg-primary/10"
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            animate={{ y: isDragging ? -10 : 0 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-asaan-sky to-asaan-steel flex items-center justify-center mb-4"
          >
            <Upload className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-foreground font-medium mb-1">{description}</p>
          <p className="text-sm text-muted-foreground">Max file size: {maxSize}MB</p>
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <File className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>

                  {file.status === "uploading" && (
                    <div className="mt-1 h-1 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        className="h-full bg-gradient-to-r from-asaan-sky to-asaan-steel"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {file.status === "success" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  {file.status === "error" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center"
                    >
                      <AlertCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeFile(file.id)}
                    className="p-1 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadBox;
