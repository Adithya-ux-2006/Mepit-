import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

const BUFFER_SEGMENTS = Array.from({ length: 21 }, (_, index) => index);

export function BufferBar({ className }: { className?: string }) {
  return (
    <div className={cn('buffer-bar', className)} aria-hidden="true">
      {BUFFER_SEGMENTS.map((segment) => (
        <span key={segment} style={{ animationDelay: `${segment * 34}ms` }} />
      ))}
    </div>
  );
}

export function RouteBuffer({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div className="route-buffer" role="status" aria-live="polite">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
      <BufferBar />
    </div>
  );
}

export function PageSkeleton({
  title = 'Preparing page',
  rows = 8,
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6" role="status" aria-live="polite">
      <div className="page-header">
        <div className="space-y-2">
          <div className="h-7 w-56 loading-shimmer" />
          <div className="h-4 w-80 max-w-[70vw] loading-shimmer" />
        </div>
        <div className="h-8 w-32 loading-shimmer" />
      </div>
      <div className="data-surface p-4">
        <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{title}</span>
        </div>
        <BufferBar className="mb-5" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-20 loading-shimmer" />
          <div className="h-20 loading-shimmer" />
          <div className="h-20 loading-shimmer" />
          <div className="h-20 loading-shimmer" />
        </div>
        <div className="mt-6 space-y-2">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="grid grid-cols-[1.2fr_.8fr_.8fr_.6fr] gap-3">
              <div className="h-8 loading-shimmer" />
              <div className="h-8 loading-shimmer" />
              <div className="h-8 loading-shimmer" />
              <div className="h-8 loading-shimmer" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
