import { Suspense } from "react";
import AlbumView from "./AlbumView";

export default function AlbumPage({ params }: PageProps<"/albums/[id]">) {
  return (
    <Suspense>
      <AlbumView params={params} />
    </Suspense>
  );
}
