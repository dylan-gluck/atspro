'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Trash2, 
  Eye, 
  Loader2,
  Plus,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { JobDocument } from '@/types/services';
import { getServicesSync } from '@/lib/services';
import { DocumentViewer } from '@/components/document-viewer';
import { FileUploadDialog } from '@/components/file-upload-dialog';

interface JobDocumentsListProps {
  jobId: string;
  documents: JobDocument[];
  onDocumentsUpdate: () => void;
}

export function JobDocumentsList({ 
  jobId, 
  documents, 
  onDocumentsUpdate 
}: JobDocumentsListProps) {
  const [selectedDocument, setSelectedDocument] = useState<JobDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  const { jobsService } = getServicesSync();

  const handleDeleteDocument = async (documentId: string) => {
    try {
      setIsDeleting(documentId);
      
      const response = await jobsService.deleteDocument(documentId);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete document');
      }

      toast.success('Document deleted successfully');
      onDocumentsUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      toast.error(message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadDocument = async (document: JobDocument) => {
    if (!document.content) {
      toast.error('Document content not available');
      return;
    }

    try {
      // Convert markdown to PDF using browser APIs
      const blob = await convertMarkdownToPDF(document.content, document.filename);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.filename.replace(/\.[^/.]+$/, '.pdf');
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download document';
      toast.error(message);
    }
  };

  const handleFileUpload = async (file: File, type: JobDocument['type']) => {
    try {
      const response = await jobsService.uploadDocument(jobId, file, type);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to upload document');
      }

      toast.success('Document uploaded successfully');
      onDocumentsUpdate();
      setShowUploadDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload document';
      toast.error(message);
    }
  };

  const getDocumentTypeIcon = (type: JobDocument['type']) => {
    switch (type) {
      case 'resume': return '📄';
      case 'cover_letter': return '✉️';
      case 'portfolio': return '🎨';
      default: return '📎';
    }
  };

  const getDocumentTypeBadge = (type: JobDocument['type']) => {
    switch (type) {
      case 'resume': return <Badge variant="default">Resume</Badge>;
      case 'cover_letter': return <Badge variant="secondary">Cover Letter</Badge>;
      case 'portfolio': return <Badge variant="outline">Portfolio</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Generated documents and uploads for this job
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No documents yet. Use the action buttons above to generate optimized documents,
              or upload your own files.
            </AlertDescription>
          </Alert>
        </CardContent>
        
        <FileUploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onUpload={handleFileUpload}
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 ? 's' : ''} available
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl flex-shrink-0">
                    {getDocumentTypeIcon(document.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {document.filename}
                      </h4>
                      {getDocumentTypeBadge(document.type)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedDocument(document)}
                    title="View document"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {document.content && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadDocument(document)}
                      title="Download as PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDocument(document.id)}
                    disabled={isDeleting === document.id}
                    title="Delete document"
                  >
                    {isDeleting === document.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          open={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDownload={() => handleDownloadDocument(selectedDocument)}
        />
      )}

      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleFileUpload}
      />
    </>
  );
}

// Utility function to convert markdown to PDF
async function convertMarkdownToPDF(markdownContent: string, filename: string): Promise<Blob> {
  // This is a simplified implementation
  // In a real app, you might want to use a library like jsPDF with markdown-pdf
  // or send the content to a server-side PDF generation service
  
  try {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window');
    }

    // Convert markdown to HTML (basic conversion)
    const htmlContent = markdownContent
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br>');

    // Create HTML document
    const htmlDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              color: #333;
            }
            h1, h2, h3 { color: #2563eb; }
            p { margin-bottom: 1rem; }
            @media print {
              body { margin: 0; padding: 1rem; }
            }
          </style>
        </head>
        <body>
          <p>${htmlContent}</p>
        </body>
      </html>
    `;

    printWindow.document.write(htmlDoc);
    printWindow.document.close();

    // For now, we'll create a simple text blob
    // In production, you'd want to use a proper PDF library
    const blob = new Blob([markdownContent], { type: 'text/plain' });
    printWindow.close();
    
    return blob;
  } catch {
    // Fallback: return the markdown as a text file
    return new Blob([markdownContent], { type: 'text/plain' });
  }
}