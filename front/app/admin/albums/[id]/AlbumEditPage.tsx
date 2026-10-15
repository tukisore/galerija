"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { albums, media, type Album, type Child, type Media } from "@/lib/api";
import { useList } from "@/lib/useList";
import PageHeader from "../../PageHeader";
import AlbumEditor from "../AlbumEditor";

/** Descriptions belong to the media, not the album, so changed ones are saved on the media. */
async function saveDescriptions(childs: Child[], stored: Media[]) {
  for (const child of childs) {
    if (child.type !== "media") continue;
    const description = child.value.description ?? "";
    const before = stored.find((item) => item.id === child.value.id)?.description ?? "";
    if (description !== before) await media.update(child.value.id, { description });
  }
}

/** The albums that hold this one, the outermost first; when it is in several, the first one found is followed. */
function parentsOf(id: string, all: Album[]): Album[] {
  const chain: Album[] = [];
  let current = id;
  for (;;) {
    const parent = all.find((album) => album.childs?.some((child) => child.type === "album" && child.value.id === current));
    // the guard stops at a loop, which the backend does not allow but old data might have
    if (!parent || parent.id === id || chain.includes(parent)) return chain;
    chain.unshift(parent);
    current = parent.id;
  }
}

/** One album's edit form; saving or cancelling goes back to the album that holds it, or else to the album list. */
export default function AlbumEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // keyed by id, so moving to another album starts over and reloads the albums too
  return <AlbumEdit key={id} id={id} />;
}

function AlbumEdit({ id }: { id: string }) {
  const router = useRouter();
  const mediaList = useList(media.list);
  const albumList = useList(albums.list);
  const [loaded, setLoaded] = useState<Album | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    albums.get(id).then(
      (album) => active && setLoaded(album),
      (e) => active && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      active = false;
    };
  }, [id]);

  const album = loaded;
  const parents = parentsOf(id, albumList.items ?? []);
  const back = parents.length ? `/admin/albums/${parents[parents.length - 1].id}` : "/admin/albums";

  return (
    <>
      <nav className="flex flex-wrap gap-x-4 gap-y-1">
        {[{ id: "", name: "Albums" }, ...parents].map((parent) => (
          <Link
            key={parent.id}
            href={parent.id ? `/admin/albums/${parent.id}` : "/admin/albums"}
            className="text-muted hover:text-foreground"
          >
            ← {parent.name}
          </Link>
        ))}
      </nav>
      <PageHeader title={album?.name ?? "Album"} error={error ?? mediaList.error} />
      {album && (
        <AlbumEditor
          key={album.id}
          album={album}
          onSave={async (input) => {
            try {
              await saveDescriptions(input.childs ?? [], mediaList.items ?? []);
              const saved = await albums.update(album.id, input);
              setError(null);
              return saved;
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
          onSaved={() => router.push(back)}
          onCancel={() => router.push(back)}
          onUploaded={() => mediaList.run(async () => {})}
        />
      )}
    </>
  );
}
