'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, FileText, CheckCircle2, ScrollText, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Counts {
  users: number;
  documents: number;
  signed: number;
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [users, docs, signed] = await Promise.all([
          api.admin.listUsers({ page: 1, limit: 1 }),
          api.admin.listDocuments({ page: 1, limit: 1 }),
          api.admin.listDocuments({ page: 1, limit: 1, status: 'signed' }),
        ]);
        if (!active) return;
        setCounts({
          users: users.data?.total ?? 0,
          documents: docs.data?.total ?? 0,
          signed: signed.data?.total ?? 0,
        });
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = [
    { label: 'Total Users', value: counts?.users, icon: Users },
    { label: 'Total Documents', value: counts?.documents, icon: FileText },
    { label: 'Total Signed', value: counts?.signed, icon: CheckCircle2 },
  ];

  const navCards = [
    { href: '/admin/users', label: 'Manage Users', icon: Users },
    { href: '/admin/documents', label: 'View Documents', icon: FileText },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
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

      <div className="grid gap-4 sm:grid-cols-3">
        {navCards.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-lg border p-5 shadow-sm transition-colors hover:bg-secondary/50"
          >
            <span className="flex items-center gap-3 font-medium">
              <Icon className="h-5 w-5 text-muted-foreground" />
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
