'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error';
import type { Document, SignaturePlacement } from '@/types';

export function useDocument() {
  const [document, setDocument] = useState<Document | null>(null);
  const [signatures, setSignatures] = useState<SignaturePlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.documents.get(id);
      setDocument(res.data?.document ?? null);
      setSignatures(res.data?.signatures ?? []);
    } catch (err) {
      setError(getErrorMessage(err, 'Document not found.'));
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    await api.documents.delete(id);
  }, []);

  const downloadDocument = useCallback(async (id: string) => {
    const url = await api.documents.getDownloadUrl(id);
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return {
    document,
    signatures,
    loading,
    error,
    fetchDocument,
    deleteDocument,
    downloadDocument,
  };
}
