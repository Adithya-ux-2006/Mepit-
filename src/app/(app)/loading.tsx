import { PageSkeleton } from '@/components/ui/loading-buffer';

export default function Loading() {
  return <PageSkeleton title="Loading page data" rows={7} />;
}
