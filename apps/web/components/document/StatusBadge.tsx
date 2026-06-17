import { Badge } from '@/components/ui/badge';
import type { DocumentStatus } from '@/types';

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: 'gray' | 'yellow' | 'green' }
> = {
  uploaded: { label: 'Uploaded', variant: 'gray' },
  signing: { label: 'Signing', variant: 'yellow' },
  signed: { label: 'Signed', variant: 'green' },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.uploaded;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
