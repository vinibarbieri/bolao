import { PageSkeleton, PageHeaderSkeleton, CardSkeleton } from "@/components/skeletons";

export default function SettingsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <CardSkeleton className="max-w-lg" lines={2} />
      <CardSkeleton className="max-w-lg" lines={1} />
    </PageSkeleton>
  );
}
