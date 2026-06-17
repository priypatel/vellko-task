'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error';
import type { Document, DocumentStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentCard } from '@/components/document/DocumentCard';
import { UploadModal } from '@/components/document/UploadModal';
import { useDocument } from '@/hooks/useDocument';

const PAGE_SIZE = 9;
type StatusFilter = 'all' | DocumentStatus;

export default function DocumentsPage() {
  const { deleteDocument, downloadDocument } = useDocument();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.documents.list({
        page,
        limit: PAGE_SIZE,
        status: status === 'all' ? undefined : status,
      });
      setDocuments(res.data?.documents ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    // If we removed the last item on a page, step back a page.
    if (documents.length === 1 && page > 1) {
      setPage((p) => p - 1);
    } else {
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My Documents</h1>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as StatusFilter);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="uploaded">Uploaded</option>
            <option value="signing">Signing</option>
            <option value="signed">Signed</option>
          </select>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Upload Document
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No documents yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload your first PDF to get started.
          </p>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Upload Document
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={() => handleDelete(doc.id)}
                onDownload={() => downloadDocument(doc.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          setPage(1);
          setStatus('all');
          load();
        }}
      />
    </div>
  );
}
