'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, PenLine, Download, Trash2 } from 'lucide-react';
import type { Document } from '@/types';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from './StatusBadge';

interface DocumentCardProps {
  document: Document;
  onDelete?: () => void | Promise<void>;
  onDownload?: () => void | Promise<void>;
  /** Compact mode: only a View link (used on the dashboard). */
  compact?: boolean;
}

export function DocumentCard({
  document,
  onDelete,
  onDownload,
  compact = false,
}: DocumentCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete?.();
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload?.();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-lg border bg-background p-4 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="truncate font-medium" title={document.title}>
            {document.title}
          </h3>
          <StatusBadge status={document.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(document.fileSizeBytes)} · {formatDate(document.createdAt)}
          {document.pageCount ? ` · ${document.pageCount} pages` : ''}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/documents/${document.id}`}>
            <Eye className="h-4 w-4" /> View
          </Link>
        </Button>

        {!compact && document.status !== 'signed' && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/documents/${document.id}/sign`}>
              <PenLine className="h-4 w-4" /> Sign
            </Link>
          </Button>
        )}

        {!compact && document.status === 'signed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-4 w-4" /> Download
          </Button>
        )}

        {!compact && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete document?"
        description={`"${document.title}" and its files will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
