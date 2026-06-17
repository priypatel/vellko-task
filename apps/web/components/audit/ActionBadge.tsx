import { Badge } from '@/components/ui/badge';

const green = new Set([
  'DOCUMENT_SIGNED',
  'USER_LOGIN',
  'PASSWORD_RESET_COMPLETED',
]);
const blue = new Set([
  'DOCUMENT_UPLOADED',
  'DOCUMENT_DOWNLOADED',
  'SIGNATURE_CREATED',
  'VERIFICATION_CHECKED',
]);
const red = new Set([
  'DOCUMENT_DELETED',
  'SIGNATURE_DELETED',
  'USER_LOGOUT',
]);

function variantFor(action: string): 'green' | 'blue' | 'red' | 'gray' {
  if (green.has(action)) return 'green';
  if (blue.has(action)) return 'blue';
  if (red.has(action)) return 'red';
  return 'gray';
}

/** Human-readable label, e.g. DOCUMENT_SIGNED → "Document Signed". */
export function humanizeAction(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ActionBadge({ action }: { action: string }) {
  return <Badge variant={variantFor(action)}>{humanizeAction(action)}</Badge>;
}
