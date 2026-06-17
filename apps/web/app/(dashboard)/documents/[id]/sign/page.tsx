'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import type { Signature } from '@/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SigningOverlay,
  type Placement,
} from '@/components/document/SigningOverlay';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { SignatureTyped } from '@/components/signature/SignatureTyped';
import { SignatureUpload } from '@/components/signature/SignatureUpload';

type Tab = 'draw' | 'type' | 'upload' | null;

export default function SignPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(null);

  const [placement, setPlacement] = useState<Placement | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedSig = signatures.find((s) => s.id === selectedId) ?? null;

  const loadSignatures = useCallback(async () => {
    try {
      const res = await api.signatures.list();
      setSignatures(res.data?.signatures ?? []);
    } catch {
      // Non-fatal: user can still create a new signature.
      setSignatures([]);
    }
  }, []);

  // Load the document, guard against already-signed, fetch preview URL + signatures.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const docRes = await api.documents.get(id);
        const doc = docRes.data?.document;
        if (!doc) throw new Error('not found');
        if (doc.status === 'signed') {
          router.replace(`/documents/${id}`);
          return;
        }
        const [url] = await Promise.all([
          api.documents.getPreviewUrl(id),
          loadSignatures(),
        ]);
        if (!active) return;
        setPdfUrl(url);
      } catch (err) {
        if (active) setLoadError(getErrorMessage(err, 'Could not load document.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, router, loadSignatures]);

  const handleNewSignature = async (newId: string) => {
    await loadSignatures();
    setSelectedId(newId);
    setTab(null);
    setConfirmed(false);
    setPlacement(null);
  };

  const handleSign = async () => {
    if (!selectedId || !placement) return;
    setSigning(true);
    setSignError(null);
    try {
      await api.documents.sign(id, {
        signatureId: selectedId,
        page: placement.page,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      });
      setSuccess(true);
      setTimeout(() => router.push(`/documents/${id}`), 900);
    } catch (err) {
      setSignError(getErrorMessage(err, 'Could not sign the document.'));
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (loadError || !pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="font-medium">{loadError || 'Could not load document'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/documents/${id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to document
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/documents/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to document
      </Link>

      <h1 className="text-2xl font-bold">Sign Document</h1>

      {success && (
        <Alert variant="success">
          <AlertDescription>
            Document signed successfully. Redirecting…
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* LEFT — PDF + signature placement */}
        <div>
          <SigningOverlay
            pdfUrl={pdfUrl}
            selectedSignatureImageUrl={selectedSig?.imageUrl ?? null}
            onPlacementChange={setPlacement}
          />
        </div>

        {/* RIGHT — steps */}
        <div className="space-y-4">
          {/* STEP 1 */}
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">1. Choose Signature</h2>

            {signatures.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {signatures.map((sig) => (
                  <button
                    key={sig.id}
                    onClick={() => {
                      setSelectedId(sig.id);
                      setConfirmed(false);
                    }}
                    className={cn(
                      'flex h-20 items-center justify-center rounded-md border bg-white p-2 transition-colors',
                      selectedId === sig.id
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-primary/50',
                    )}
                  >
                    <img
                      src={sig.imageUrl}
                      alt={sig.label || 'Signature'}
                      className="max-h-full max-w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Create new */}
            <div className="flex gap-2">
              {(['draw', 'type', 'upload'] as const).map((t) => (
                <Button
                  key={t}
                  variant={tab === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTab(tab === t ? null : t)}
                >
                  <Plus className="h-3 w-3" />
                  {t === 'draw' ? 'Draw' : t === 'type' ? 'Type' : 'Upload'}
                </Button>
              ))}
            </div>

            <div className="mt-3">
              {tab === 'draw' && (
                <SignaturePad
                  onSave={handleNewSignature}
                  onCancel={() => setTab(null)}
                />
              )}
              {tab === 'type' && (
                <SignatureTyped
                  onSave={handleNewSignature}
                  onCancel={() => setTab(null)}
                />
              )}
              {tab === 'upload' && (
                <SignatureUpload
                  onSave={handleNewSignature}
                  onCancel={() => setTab(null)}
                />
              )}
            </div>
          </section>

          {/* STEP 2 */}
          {selectedId && (
            <section className="rounded-lg border p-4">
              <h2 className="mb-2 font-semibold">2. Place on Document</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Drag the signature to position it on the document. Use the corner
                handle to resize.
              </p>
              {placement && (
                <p className="mb-3 text-sm">
                  Page {placement.page}, position ({placement.x.toFixed(0)}%,{' '}
                  {placement.y.toFixed(0)}%)
                </p>
              )}
              <Button
                size="sm"
                disabled={!placement || confirmed}
                onClick={() => setConfirmed(true)}
              >
                {confirmed && <Check className="h-4 w-4" />}
                {confirmed ? 'Placement Confirmed' : 'Confirm Placement'}
              </Button>
            </section>
          )}

          {/* STEP 3 */}
          {confirmed && placement && (
            <section className="rounded-lg border p-4">
              <h2 className="mb-2 font-semibold">3. Sign Document</h2>
              <div className="mb-3 rounded-md bg-secondary/50 p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Signature: </span>
                  {selectedSig?.label || 'Selected signature'}
                </p>
                <p>
                  <span className="text-muted-foreground">Page: </span>
                  {placement.page}
                </p>
                <p>
                  <span className="text-muted-foreground">Position: </span>(
                  {placement.x.toFixed(0)}%, {placement.y.toFixed(0)}%)
                </p>
              </div>
              {signError && (
                <Alert variant="destructive" className="mb-3">
                  <AlertDescription>{signError}</AlertDescription>
                </Alert>
              )}
              <Button
                className="w-full"
                onClick={handleSign}
                disabled={signing || success}
              >
                {signing && <Spinner className="h-4 w-4" />}
                Sign Document
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
