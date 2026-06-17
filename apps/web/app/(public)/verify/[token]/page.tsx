import Link from 'next/link';
import { CheckCircle2, XCircle, AlertTriangle, FileSignature } from 'lucide-react';
import type { Metadata } from 'next';
import type { ApiResponse, VerificationResult } from '@/types';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Document Verification — DocSign',
  description: 'Verify the authenticity of a document signed through DocSign.',
};

// Always fetch fresh — verification status can change.
export const dynamic = 'force-dynamic';

type VerifyState =
  | { kind: 'verified'; result: VerificationResult }
  | { kind: 'unsigned'; result: VerificationResult }
  | { kind: 'notfound' }
  | { kind: 'error' };

async function fetchVerification(token: string): Promise<VerifyState> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  try {
    const res = await fetch(`${base}/verify/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return { kind: 'notfound' };
    if (!res.ok) return { kind: 'error' };

    const json = (await res.json()) as ApiResponse<VerificationResult>;
    const result = json.data;
    if (!result) return { kind: 'error' };
    return result.verified
      ? { kind: 'verified', result }
      : { kind: 'unsigned', result };
  } catch {
    return { kind: 'error' };
  }
}

export default async function VerifyPage({
  params,
}: {
  params: { token: string };
}) {
  const state = await fetchVerification(params.token);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-lg border bg-background p-8 shadow-sm">
        {state.kind === 'verified' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Document Verified</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This document was signed through DocSign.
            </p>
            <dl className="mt-6 space-y-4 text-left">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Document
                </dt>
                <dd className="font-medium">{state.result.title}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Signed by
                </dt>
                <dd className="font-medium">{state.result.signerName}</dd>
              </div>
              {state.result.signedAt && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Signed on
                  </dt>
                  <dd className="font-medium">
                    {formatDateTime(state.result.signedAt)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Original SHA-256
                </dt>
                <dd className="mt-1 break-all rounded-md bg-secondary px-3 py-2 font-mono text-xs">
                  {state.result.fileHash}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {state.kind === 'unsigned' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Document Not Yet Signed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The document <span className="font-medium">{state.result.title}</span>{' '}
              exists but has not been signed yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Current status: <span className="font-medium">{state.result.status}</span>
            </p>
          </div>
        )}

        {state.kind === 'notfound' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Document Not Found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No document matches this verification link. It may be invalid or the
              document may have been deleted.
            </p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Verification Unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn&apos;t verify this document right now. Please try again
              later.
            </p>
          </div>
        )}

        <div className="mt-8 border-t pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <FileSignature className="h-4 w-4" />
            Powered by DocSign
          </Link>
        </div>
      </div>
    </div>
  );
}
