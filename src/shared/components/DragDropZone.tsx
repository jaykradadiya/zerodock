import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection, type DropzoneOptions } from 'react-dropzone';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface DragDropZoneProps extends Omit<DropzoneOptions, 'onDrop'> {
  onFilesAccepted: (files: File[]) => void;
  title?: string;
  description?: string;
  className?: string;
  maxFiles?: number;
}

export function DragDropZone({ 
  onFilesAccepted, 
  title = "Select Files", 
  description = "or drag and drop them here",
  className,
  maxFiles = 0,
  maxSize = 52428800, // 50MB default limit to prevent memory crashes
  ...dropzoneProps 
}: DragDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (acceptedFiles.length > 0) {
      onFilesAccepted(acceptedFiles);
    }
    if (fileRejections.length > 0) {
      console.warn("Files rejected:", fileRejections);
    }
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    onDrop,
    maxFiles: maxFiles > 0 ? maxFiles : undefined,
    maxSize,
    ...dropzoneProps
  });

  const isSizeError = fileRejections.some(r => r.errors.some(e => e.code === 'file-too-large'));
  const rejectMessage = isSizeError ? "File is too large" : "Invalid file type";

  // Calculate dynamic styles based on state
  let borderColor = 'var(--zd-border)';
  let backgroundColor = 'var(--zd-surface)';
  let iconBg = 'var(--zd-bg)';
  let iconColor = 'var(--zd-text-muted)';

  if (isDragActive && !isDragReject) {
    borderColor = 'var(--zd-primary)';
    backgroundColor = 'var(--zd-primary-soft)';
    iconBg = 'var(--zd-primary)';
    iconColor = 'var(--zd-surface)';
  } else if (isDragReject) {
    borderColor = '#EF4444'; // Red
    backgroundColor = 'rgba(239, 68, 68, 0.05)';
    iconBg = '#EF4444';
    iconColor = 'var(--zd-surface)';
  } else if (isHovered) {
    borderColor = 'var(--zd-primary)';
    backgroundColor = 'var(--zd-surface-raised)';
    iconBg = 'var(--zd-primary-soft)';
    iconColor = 'var(--zd-primary)';
  }

  return (
    <div 
      {...getRootProps()} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-80 rounded-[var(--zd-radius-xl)] transition-all duration-300 cursor-pointer overflow-hidden",
        className
      )}
      style={{
        border: `2px dashed ${borderColor}`,
        backgroundColor,
      }}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 z-10">
        <div 
          className="p-4 rounded-[var(--zd-radius-lg)] transition-all duration-300 shadow-sm"
          style={{
            backgroundColor: iconBg,
            color: iconColor,
            transform: isDragActive ? 'scale(1.1)' : isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {isDragReject ? (
            <AlertCircle className="w-10 h-10" />
          ) : (
            <UploadCloud className="w-10 h-10" />
          )}
        </div>
        
        <div className="space-y-2">
          <p 
            className="text-xl font-bold transition-colors"
            style={{ color: isDragReject ? '#EF4444' : 'var(--zd-text-primary)' }}
          >
            {isDragActive && !isDragReject ? "Drop files now" : isDragReject ? rejectMessage : title}
          </p>
          <p 
            className="text-sm transition-colors"
            style={{ color: 'var(--zd-text-muted)' }}
          >
            {description}
          </p>
        </div>
        
        {!isDragActive && (
          <button 
            type="button" 
            className="mt-2 px-6 py-2.5 rounded-[var(--zd-radius-md)] font-medium transition-all duration-200"
            style={{
              backgroundColor: isHovered ? 'var(--zd-primary)' : 'var(--zd-primary-soft)',
              color: isHovered ? '#FFFFFF' : 'var(--zd-primary)',
              boxShadow: isHovered ? 'var(--zd-shadow-md)' : 'none',
            }}
          >
            Select Files
          </button>
        )}
      </div>

      {/* Subtle glow effect on hover */}
      {isHovered && !isDragActive && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-50"
          style={{ boxShadow: 'inset 0 0 40px var(--zd-glow)' }}
        />
      )}
    </div>
  );
}
