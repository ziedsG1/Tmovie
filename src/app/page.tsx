import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { HomeCatalog } from "@/components/HomeCatalog";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div>
      <Suspense fallback={<CatalogSkeleton />}>
        <HomeCatalog />
      </Suspense>
    </div>
  );
}
