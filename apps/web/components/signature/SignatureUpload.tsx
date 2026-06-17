'use client';

import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
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

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export function SignatureUpload({ onSave, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError('Only PNG, JPG, or WebP images are allowed.');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('Image exceeds the 5 MB limit.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!file) {
      setError('Please choose an image.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (label) formData.append('label', label);
      formData.append('type', 'uploaded');
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

      <div
        onClick={() => !saving && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!saving) select(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-input'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => select(e.target.files?.[0])}
          disabled={saving}
        />
        {preview ? (
          <img
            src={preview}
            alt="Signature preview"
            className="max-h-28 object-contain"
          />
        ) : (
          <>
            <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop image or click to browse</p>
            <p className="text-xs text-muted-foreground">PNG/JPG/WebP, max 5 MB</p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="upload-label">Label (optional)</Label>
        <Input
          id="upload-label"
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
        <Button onClick={save} disabled={saving || !file}>
          {saving && <Spinner className="h-4 w-4" />}
          Save Signature
        </Button>
      </div>
    </div>
  );
}
