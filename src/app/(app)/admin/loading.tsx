import { PageSkeleton, PageHeaderSkeleton, CardSkeleton } from "@/components/skeletons";

export default function AdminLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <CardSkeleton lines={4} />
    </PageSkeleton>
  );
}
