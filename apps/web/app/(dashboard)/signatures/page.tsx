'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2, PenTool } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error';
import { formatDate } from '@/lib/utils';
import type { Signature, SignatureType } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { SignatureTyped } from '@/components/signature/SignatureTyped';
import { SignatureUpload } from '@/components/signature/SignatureUpload';

type Tab = 'draw' | 'type' | 'upload';

const typeLabel: Record<SignatureType, string> = {
  drawn: 'Drawn',
  typed: 'Typed',
  uploaded: 'Uploaded',
};

export default function SignaturesPage() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('draw');
  const [toast, setToast] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Signature | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.signatures.list();
      setSignatures(res.data?.signatures ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaved = async () => {
    await load();
    showToast('Signature saved');
    setActiveTab('draw');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.signatures.delete(deleteTarget.id);
      setSignatures((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete signature.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">My Signatures</h1>
        <Badge variant="secondary">{signatures.length}</Badge>
      </div>

      {toast && (
        <Alert variant="success">
          <AlertDescription>{toast}</AlertDescription>
        </Alert>
      )}
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

      {/* Section 1 — Saved signatures */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Saved Signatures</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : signatures.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
            <PenTool className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No saved signatures yet. Create one below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className="flex flex-col rounded-lg border bg-background p-3 shadow-sm"
              >
                <div className="flex h-20 items-center justify-center rounded-md bg-white">
                  <img
                    src={sig.imageUrl}
                    alt={sig.label || 'Signature'}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {sig.label || 'Untitled'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(sig.createdAt)}
                    </p>
                  </div>
                  <Badge variant="gray">{typeLabel[sig.type]}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 self-start text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(sig)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2 — Create new */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Create New Signature</h2>
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex gap-2">
            {(['draw', 'type', 'upload'] as const).map((t) => (
              <Button
                key={t}
                variant={activeTab === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(t)}
              >
                {t === 'draw' ? 'Draw' : t === 'type' ? 'Type' : 'Upload'}
              </Button>
            ))}
          </div>

          {activeTab === 'draw' && (
            <SignaturePad
              onSave={handleSaved}
              onCancel={() => setActiveTab('draw')}
            />
          )}
          {activeTab === 'type' && (
            <SignatureTyped
              onSave={handleSaved}
              onCancel={() => setActiveTab('draw')}
            />
          )}
          {activeTab === 'upload' && (
            <SignatureUpload
              onSave={handleSaved}
              onCancel={() => setActiveTab('draw')}
            />
          )}
        </div>
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete signature?"
        description="Delete this signature? It cannot be used in future signing sessions."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
