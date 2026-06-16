import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocSign — Digital Signature & Document Management',
  description:
    'Upload, electronically sign, manage, and verify PDF documents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
