'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Skeleton } from '@/components/ui/skeleton';

interface PageInfo {
  width: number;
  height: number;
  scale: number;
}

interface PDFViewerProps {
  fileUrl: string;
  onPageCountResolved?: (count: number) => void;
  /** Render an overlay layer on top of a given (1-based) page. */
  renderOverlay?: (page: number) => ReactNode;
  maxWidth?: number;
}

export function PDFViewer({
  fileUrl,
  onPageCountResolved,
  renderOverlay,
  maxWidth = 820,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the document and compute each page's render dimensions.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPages([]);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        const doc = await pdfjs.getDocument({ url: fileUrl }).promise;
        if (cancelled) return;
        docRef.current = doc;
        onPageCountResolved?.(doc.numPages);

        const available = Math.min(
          maxWidth,
          containerRef.current?.clientWidth || maxWidth,
        );

        const infos: PageInfo[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = available / base.width;
          const vp = page.getViewport({ scale });
          infos.push({ width: vp.width, height: vp.height, scale });
        }
        if (cancelled) return;
        setPages(infos);
        setLoading(false);
      } catch (err) {
        console.error('[PDFViewer] failed to load PDF', err);
        if (!cancelled) {
          setError('Could not load the document preview.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, maxWidth]);

  // Render each page into its canvas once the canvases are mounted.
  useEffect(() => {
    const doc = docRef.current;
    if (!doc || pages.length === 0) return;
    let cancelled = false;

    (async () => {
      for (let i = 1; i <= pages.length; i++) {
        if (cancelled) return;
        const canvas = containerRef.current?.querySelector(
          `canvas[data-page="${i}"]`,
        ) as HTMLCanvasElement | null;
        if (!canvas) continue;
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: pages[i - 1].scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pages]);

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4" ref={containerRef}>
        {[0, 1].map((i) => (
          <Skeleton key={i} className="mx-auto h-[600px] w-full max-w-[820px]" />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4">
      {pages.map((p, idx) => {
        const pageNumber = idx + 1;
        return (
          <div
            key={pageNumber}
            className="relative shadow-sm"
            style={{ width: p.width, height: p.height }}
            data-page-wrapper={pageNumber}
          >
            <canvas
              data-page={pageNumber}
              className="block rounded-sm border"
              style={{ width: p.width, height: p.height }}
            />
            {renderOverlay && (
              <div className="absolute inset-0">{renderOverlay(pageNumber)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
