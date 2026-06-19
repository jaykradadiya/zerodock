import { useState } from 'react';
import { DragDropZone } from '../../../shared/components/DragDropZone';
import { File, Trash2, ArrowRight, Layers, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';

export default function PdfMerger() {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesAccepted = (acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setError(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please select at least 2 PDF files to merge.");
      return;
    }
    
    setIsMerging(true);
    setError(null);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const fileArrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(fileArrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfFile = await mergedPdf.save();
      
      const blob = new Blob([mergedPdfFile as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zerodock-merged-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error merging PDFs", err);
      setError("Failed to merge PDFs. Make sure all selected files are valid PDFs without passwords.");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 h-full flex flex-col">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-3">
          <Layers className="w-8 h-8 text-blue-500" />
          Merge PDF Files
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Combine multiple PDF files into one document. Drag and drop your files below to get started. All processing happens locally in your browser.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center min-h-0">
        {files.length === 0 ? (
          <div className="w-full max-w-3xl">
            <DragDropZone 
              onFilesAccepted={handleFilesAccepted} 
              accept={{ 'application/pdf': ['.pdf'] }}
              title="Select PDF files"
              description="or drop PDFs here"
            />
          </div>
        ) : (
          <div className="w-full space-y-6 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{files.length} Files Selected</h3>
              <div className="flex gap-2">
                <button 
                  onClick={clearFiles}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-sm font-medium transition-colors"
                >
                  Clear All
                </button>
                <label className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-sm font-medium transition-colors cursor-pointer">
                  Add More Files
                  <input 
                    type="file" 
                    multiple 
                    accept="application/pdf" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesAccepted(Array.from(e.target.files));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <AnimatePresence>
                  {files.map((file, index) => (
                    <motion.div 
                      key={`${file.name}-${index}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      layout
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <File className="w-8 h-8 text-red-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFile(index)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {error && (
              <div className="text-center text-red-500 font-medium text-sm">
                {error}
              </div>
            )}
            <div className="flex justify-center pt-4">
              <button 
                onClick={handleMerge}
                disabled={isMerging || files.length < 2}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-[var(--zd-radius-xl)] font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    Merge PDFs
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
