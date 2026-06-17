'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface Props {
  onSave: (signatureId: string) => void;
  onCancel: () => void;
}

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap';

export function SignatureTyped({ onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the cursive font once.
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_URL}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
  }, []);

  // Re-render the preview whenever the text changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.font = "48px 'Dancing Script', cursive";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text || 'Your name', canvas.width / 2, canvas.height / 2);
  }, [text]);

  const save = async () => {
    if (!text.trim()) {
      setError('Please type your name.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    setSaving(true);
    try {
      // Ensure the webfont is ready before exporting.
      if (document.fonts?.ready) await document.fonts.ready;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.font = "48px 'Dancing Script', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      }
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Export failed'))),
          'image/png',
        ),
      );
      const formData = new FormData();
      formData.append('image', blob, 'signature.png');
      if (label) formData.append('label', label);
      formData.append('type', 'typed');
      const res = await api.signatures.create(formData);
      const id = res.data?.signature.id;
      if (id) onSave(id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save signature.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="typed-name">Your name</Label>
        <Input
          id="typed-name"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Jane Doe"
          disabled={saving}
        />
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="w-full rounded-md border bg-white"
      />
      <div className="space-y-2">
        <Label htmlFor="typed-label">Label (optional)</Label>
        <Input
          id="typed-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. My Signature"
          disabled={saving}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Spinner className="h-4 w-4" />}
          Save Signature
        </Button>
      </div>
    </div>
  );
}
