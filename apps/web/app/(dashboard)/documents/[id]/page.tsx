'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  PenLine,
  Download,
  Trash2,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useDocument } from '@/hooks/useDocument';
import { api } from '@/lib/api-client';
import { formatDate, formatDateTime, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/document/StatusBadge';
import { PDFViewer } from '@/components/document/PDFViewer';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted-foreground hover:text-foreground"
      aria-label="Copy"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    document,
    signatures,
    loading,
    error,
    fetchDocument,
    deleteDocument,
    downloadDocument,
  } = useDocument();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) fetchDocument(params.id);
  }, [params.id, fetchDocument]);

  useEffect(() => {
    if (!params.id) return;
    let active = true;
    api.documents
      .getPreviewUrl(params.id)
      .then((url) => {
        if (active) setPreviewUrl(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [params.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDocument(params.id);
      router.push('/documents');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDocument(params.id);
    } finally {
      setDownloading(false);
    }
  };

  const verifyUrl =
    document && typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${document.verificationToken}`
      : '';

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="font-medium">{error || 'Document not found'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" /> Back to documents
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/documents"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to documents
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{document.title}</h1>
          <StatusBadge status={document.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {document.status !== 'signed' && (
            <Button asChild>
              <Link href={`/documents/${document.id}/sign`}>
                <PenLine className="h-4 w-4" /> Sign
              </Link>
            </Button>
          )}
          {document.status === 'signed' && (
            <Button onClick={handleDownload} disabled={downloading}>
              <Download className="h-4 w-4" /> Download
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2">
        <Meta label="Created">{formatDate(document.createdAt)}</Meta>
        <Meta label="File Size">{formatFileSize(document.fileSizeBytes)}</Meta>
        <Meta label="Pages">{document.pageCount ?? '—'}</Meta>
        <Meta label="Status">{document.status}</Meta>
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
            File Hash (SHA-256)
          </p>
          <div className="flex items-center gap-2">
            <code className="truncate rounded bg-secondary px-2 py-1 font-mono text-xs">
              {document.fileHash}
            </code>
            <CopyButton value={document.fileHash} />
          </div>
        </div>
        {document.status === 'signed' && (
          <div className="sm:col-span-2">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
              Verification Link
            </p>
            <div className="flex items-center gap-2">
              <code className="truncate rounded bg-secondary px-2 py-1 font-mono text-xs">
                {verifyUrl}
              </code>
              <CopyButton value={verifyUrl} />
              <a
                href={`/verify/${document.verificationToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Open verification page"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* PDF preview */}
      {previewUrl && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Preview</h2>
          <PDFViewer fileUrl={previewUrl} />
        </div>
      )}

      {/* Signature history */}
      {signatures.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Signature History</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Page</th>
                  <th className="px-4 py-2 font-medium">Signed At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {signatures.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">Page {s.page}</td>
                    <td className="px-4 py-2">{formatDateTime(s.signedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-medium capitalize">{children}</p>
    </div>
  );
}
