'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  X, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { JobDocument } from '@/types/services';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, type: JobDocument['type']) => Promise<void>;
}

const DOCUMENT_TYPES = [
  { value: 'resume', label: 'Resume', description: 'Your updated resume document' },
  { value: 'cover_letter', label: 'Cover Letter', description: 'Personalized cover letter' },
  { value: 'portfolio', label: 'Portfolio', description: 'Work samples or portfolio items' },
] as const;

const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'image/jpeg': ['.jpg'],
  'image/png': ['.png'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadDialog({ 
  open, 
  onOpenChange, 
  onUpload 
}: FileUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<JobDocument['type']>('resume');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0] as { errors: { code: string }[] };
      if (rejection.errors.some((e) => e.code === 'file-too-large')) {
        setError('File size too large. Maximum size is 10MB.');
      } else if (rejection.errors.some((e) => e.code === 'file-invalid-type')) {
        setError('Invalid file type. Please select a PDF, DOCX, DOC, TXT, MD, JPG, or PNG file.');
      } else {
        setError('Invalid file. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setError(null);
      
      await onUpload(selectedFile, documentType);
      
      // Reset form
      setSelectedFile(null);
      setDocumentType('resume');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    
    setSelectedFile(null);
    setDocumentType('resume');
    setError(null);
    onOpenChange(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Upload Document</DialogTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            Upload a document related to this job application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setDocumentType(value as JobDocument['type'])}
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Drop Zone */}
          <div className="space-y-2">
            <Label>File</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : selectedFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} disabled={isUploading} />
              <div className="flex flex-col items-center gap-2">
                {selectedFile ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div className="text-sm font-medium">{selectedFile.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div className="text-sm">
                      {isDragActive ? (
                        <span>Drop the file here</span>
                      ) : (
                        <span>
                          <span className="font-medium text-primary">Click to upload</span> or drag and drop
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      PDF, DOCX, DOC, TXT, MD, JPG, PNG (max 10MB)
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}