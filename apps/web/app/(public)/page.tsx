import Link from 'next/link';
import {
  FileSignature,
  Upload,
  PenTool,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Upload,
    title: 'Upload PDFs',
    description:
      'Securely upload your PDF documents. We validate and store every file with a tamper-evident hash.',
  },
  {
    icon: PenTool,
    title: 'Sign Electronically',
    description:
      'Draw, type, or upload your signature and place it precisely on any page of your document.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify Authenticity',
    description:
      'Anyone can confirm a document was signed through DocSign via a public verification link.',
  },
];

const steps = [
  { n: 1, title: 'Upload', text: 'Add your PDF document to your dashboard.' },
  { n: 2, title: 'Sign', text: 'Place your signature and complete the document.' },
  {
    n: 3,
    title: 'Download & Share',
    text: 'Download the signed PDF and share a verification link.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <FileSignature className="h-5 w-5 text-primary" />
          <span>DocSign</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Sign Documents with Confidence
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Upload, electronically sign, manage, and verify PDF documents — all in
          one secure platform built for modern teams.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>

        {/* Demo credentials */}
        <div className="mt-10 w-full max-w-md rounded-lg border border-dashed bg-secondary/40 p-4 text-left">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Try it with a demo account
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-medium">User</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                demo@test.com
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Demo@12345
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-medium">Admin</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                admin@test.com
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Admin@12345
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-lg border bg-background p-6 shadow-sm"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step.n}
                </div>
                <h3 className="mb-1 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t px-6 py-6 text-center text-sm text-muted-foreground">
        DocSign © 2024
      </footer>
    </div>
  );
}
