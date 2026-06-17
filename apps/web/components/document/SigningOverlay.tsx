'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PDFViewer } from './PDFViewer';

export interface Placement {
  page: number;
  x: number; // % from left
  y: number; // % from top
  width: number; // % of page width
  height: number; // % of page height
}

interface SigningOverlayProps {
  pdfUrl: string;
  selectedSignatureImageUrl: string | null;
  onPlacementChange: (placement: Placement) => void;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function SigningOverlay({
  pdfUrl,
  selectedSignatureImageUrl,
  onPlacementChange,
}: SigningOverlayProps) {
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);
  const [box, setBox] = useState({ x: 30, y: 40, width: 25, height: 12 });

  // Report placement whenever it (or the page) changes while a signature is selected.
  useEffect(() => {
    if (selectedSignatureImageUrl) {
      onPlacementChange({ page, ...box });
    }
  }, [page, box, selectedSignatureImageUrl]);

  return (
    <div className="space-y-3">
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= numPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-secondary/20 p-2">
        <PDFViewer
          fileUrl={pdfUrl}
          onPageCountResolved={(n) => setNumPages(n)}
          renderOverlay={(p) =>
            p === page && selectedSignatureImageUrl ? (
              <DraggableSignature
                imageUrl={selectedSignatureImageUrl}
                box={box}
                onChange={setBox}
              />
            ) : null
          }
        />
      </div>
    </div>
  );
}

interface DraggableSignatureProps {
  imageUrl: string;
  box: { x: number; y: number; width: number; height: number };
  onChange: (box: { x: number; y: number; width: number; height: number }) => void;
}

function DraggableSignature({ imageUrl, box, onChange }: DraggableSignatureProps) {
  const ref = useRef<HTMLDivElement>(null);

  const parentRect = () =>
    ref.current?.parentElement?.getBoundingClientRect() ?? null;

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = parentRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...box };

    const move = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      onChange({
        ...orig,
        x: clamp(orig.x + dxPct, 0, 100 - orig.width),
        y: clamp(orig.y + dyPct, 0, 100 - orig.height),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = parentRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...box };

    const move = (ev: PointerEvent) => {
      const dwPct = ((ev.clientX - startX) / rect.width) * 100;
      const dhPct = ((ev.clientY - startY) / rect.height) * 100;
      onChange({
        ...orig,
        width: clamp(orig.width + dwPct, 5, 100 - orig.x),
        height: clamp(orig.height + dhPct, 3, 100 - orig.y),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      ref={ref}
      onPointerDown={startDrag}
      className="absolute cursor-move touch-none rounded border-2 border-dashed border-primary bg-primary/5"
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      }}
    >
      <img
        src={imageUrl}
        alt="Signature"
        draggable={false}
        className="pointer-events-none h-full w-full object-contain"
      />
      <div
        onPointerDown={startResize}
        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-white bg-primary"
        aria-label="Resize"
      />
    </div>
  );
}
