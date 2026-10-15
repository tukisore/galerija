import { Suspense } from "react";
import AlbumEditPage from "./AlbumEditPage";

export default function Page({ params }: PageProps<"/admin/albums/[id]">) {
  return (
    <Suspense>
      <AlbumEditPage params={params} />
    </Suspense>
  );
}
