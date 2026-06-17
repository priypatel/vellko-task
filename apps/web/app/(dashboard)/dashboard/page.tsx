'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, CheckCircle2, Clock, Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error';
import type { Document } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentCard } from '@/components/document/DocumentCard';
import { UploadModal } from '@/components/document/UploadModal';

interface Stats {
  total: number;
  signed: number;
  pending: number;
}

export default function DashboardPage() {
  const [recent, setRecent] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Counts come from the paginated `total` (cheap) rather than fetching
      // every row — scales beyond a single page and respects the list cap.
      const [recentRes, signedRes] = await Promise.all([
        api.documents.list({ page: 1, limit: 5 }),
        api.documents.list({ page: 1, limit: 1, status: 'signed' }),
      ]);
      const total = recentRes.data?.total ?? 0;
      const signed = signedRes.data?.total ?? 0;
      setStats({
        total,
        signed,
        pending: total - signed,
      });
      setRecent(recentRes.data?.documents ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = [
    { label: 'Total Documents', value: stats?.total, icon: FileText },
    { label: 'Signed', value: stats?.signed, icon: CheckCircle2 },
    { label: 'Pending', value: stats?.pending, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" /> Upload Document
        </Button>
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            {loading || value === undefined ? (
              <Skeleton className="mt-2 h-8 w-12" />
            ) : (
              <p className="mt-2 text-3xl font-bold">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent documents */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Documents</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No documents yet.{' '}
            <button
              onClick={() => setUploadOpen(true)}
              className="text-primary hover:underline"
            >
              Upload your first PDF.
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((doc) => (
              <DocumentCard key={doc.id} document={doc} compact />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-5 w-5" /> Upload Document
        </button>
      </div>

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
