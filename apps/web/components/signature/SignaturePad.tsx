'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
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

export function SignaturePad({ onSave, onCancel }: Props) {
  const padRef = useRef<SignatureCanvas>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = () => padRef.current?.clear();

  const undo = () => {
    const pad = padRef.current;
    if (!pad) return;
    const data = pad.toData();
    if (data.length > 0) {
      data.pop();
      pad.fromData(data);
    }
  };

  const save = async () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setError('Please draw your signature first.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const canvas = pad.getTrimmedCanvas();
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Export failed'))),
          'image/png',
        ),
      );
      const formData = new FormData();
      formData.append('image', blob, 'signature.png');
      if (label) formData.append('label', label);
      formData.append('type', 'drawn');
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
      <div className="rounded-md border bg-white">
        <SignatureCanvas
          ref={padRef}
          penColor="#0f172a"
          canvasProps={{ className: 'w-full h-40 rounded-md' }}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} disabled={saving}>
          Clear
        </Button>
        <Button variant="outline" size="sm" onClick={undo} disabled={saving}>
          Undo
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pad-label">Label (optional)</Label>
        <Input
          id="pad-label"
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
