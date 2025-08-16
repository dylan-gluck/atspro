'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md']
};

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUpload({
  onFileUpload,
  isLoading = false,
  error = null,
  className,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false
}: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || disabled) return;

    const file = acceptedFiles[0];
    setUploadedFile(file);
    setUploadSuccess(false);

    try {
      await onFileUpload(file);
      setUploadSuccess(true);
    } catch (err) {
      // Error handling is done by parent component
      console.error('Upload failed:', err);
    }
  }, [onFileUpload, disabled]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    isDragAccept,
    fileRejections
  } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: disabled || isLoading
  });

  const removeFile = () => {
    setUploadedFile(null);
    setUploadSuccess(false);
  };

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) return '📝';
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) return '📋';
    return '📁';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get border color based on state
  const getBorderColor = () => {
    if (disabled) return 'border-muted';
    if (isDragReject || error) return 'border-destructive';
    if (isDragAccept) return 'border-primary';
    if (isDragActive) return 'border-primary';
    if (uploadSuccess) return 'border-emerald-500';
    return 'border-border';
  };

  // Get background color based on state
  const getBackgroundColor = () => {
    if (disabled) return 'bg-muted/50';
    if (isDragReject || error) return 'bg-destructive/5';
    if (isDragAccept) return 'bg-primary/5';
    if (isDragActive) return 'bg-primary/5';
    if (uploadSuccess) return 'bg-emerald-50';
    return 'bg-background';
  };

  return (
    <div className={cn('w-full', className)}>
      <Card>
        <CardContent className="p-6">
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                getBorderColor(),
                getBackgroundColor(),
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center space-y-4">
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                  isDragActive ? 'bg-primary/20' : 'bg-muted'
                )}>
                  <Upload className={cn(
                    'w-8 h-8 transition-colors',
                    isDragActive ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {isDragActive 
                      ? 'Drop your resume here' 
                      : 'Upload your resume'
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your resume, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PDF, DOCX, DOC, TXT, and MD files (max {formatFileSize(maxSize)})
                  </p>
                </div>

                {!disabled && (
                  <Button variant="outline" size="sm" type="button">
                    Choose File
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={cn(
                'flex items-center justify-between p-4 border rounded-lg',
                uploadSuccess ? 'border-emerald-500 bg-emerald-50' : 'border-border'
              )}>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(uploadedFile)}</span>
                  <div>
                    <p className="font-medium text-sm">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isLoading && (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    </div>
                  )}
                  
                  {uploadSuccess && !isLoading && (
                    <div className="flex items-center space-x-1 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Uploaded</span>
                    </div>
                  )}

                  {!isLoading && !uploadSuccess && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {isLoading && (
                <div className="space-y-2">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    Parsing your resume...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* File Rejection Errors */}
          {fileRejections.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <div>
                  <p className="text-sm text-destructive font-medium">Upload failed:</p>
                  {fileRejections.map(({ file, errors }) => (
                    <div key={file.name} className="mt-1">
                      <p className="text-xs text-destructive">
                        {file.name}: {errors.map(e => e.message).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Try Again Button */}
          {uploadedFile && !isLoading && !uploadSuccess && error && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={removeFile}
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}