'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error';
import { formatFileSize } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle('');
    setFile(null);
    setProgress(0);
    setError(null);
    setUploading(false);
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const validateAndSet = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('File exceeds the 20 MB limit.');
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('file', file);
      await api.documents.upload(formData, (evt) => {
        if (evt.total) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });
      reset();
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed.'));
      setUploading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Upload Document"
      description="Add a PDF to sign and manage."
      dismissible={!uploading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            placeholder="e.g. Service Agreement"
          />
        </div>

        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!uploading) validateAndSet(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-input'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => validateAndSet(e.target.files?.[0])}
            disabled={uploading}
          />
          {file ? (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground">
                ({formatFileSize(file.size)})
              </span>
            </div>
          ) : (
            <>
              <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drop PDF here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">Max 20 MB</p>
            </>
          )}
        </div>

        {uploading && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}% uploaded</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={uploading || !file}>
            {uploading && <Spinner className="h-4 w-4" />}
            Upload Document
          </Button>
        </div>
      </form>
    </Modal>
  );
}
