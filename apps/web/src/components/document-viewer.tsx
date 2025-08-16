'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X } from 'lucide-react';
import type { JobDocument } from '@/types/services';

interface DocumentViewerProps {
  document: JobDocument;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export function DocumentViewer({ 
  document, 
  open, 
  onClose, 
  onDownload 
}: DocumentViewerProps) {
  const getDocumentTypeBadge = (type: JobDocument['type']) => {
    switch (type) {
      case 'resume': return <Badge variant="default">Resume</Badge>;
      case 'cover_letter': return <Badge variant="secondary">Cover Letter</Badge>;
      case 'portfolio': return <Badge variant="outline">Portfolio</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatMarkdownContent = (content: string) => {
    // Basic markdown to HTML conversion for display
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 text-primary">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3 text-primary">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2 text-primary">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/gim, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/gim, '</p><p class="mb-4">')
      .replace(/\n/gim, '<br>');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg">{document.filename}</DialogTitle>
              {getDocumentTypeBadge(document.type)}
            </div>
            <div className="flex items-center gap-2">
              {document.content && (
                <Button
                  size="sm"
                  onClick={onDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogDescription>
            Created {new Date(document.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {document.content ? (
            <div className="prose prose-sm max-w-none p-4">
              <div 
                className="whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: `<p class="mb-4">${formatMarkdownContent(document.content)}</p>` 
                }}
              />
            </div>
          ) : document.file_url ? (
            <div className="p-4">
              <div className="border rounded-lg p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  This document is stored as a file. Click download to view the content.
                </p>
                <Button onClick={onDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                No content available for this document.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}