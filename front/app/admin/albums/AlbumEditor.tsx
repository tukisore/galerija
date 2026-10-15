"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { media, type Album, type AlbumInput, type Child } from "@/lib/api";
import { toUpload } from "@/lib/files";
import AlbumContents, { type Item } from "./AlbumContents";
import RichText from "../RichText";
import DateInputs from "./DateInputs";

export default function AlbumEditor({
  album,
  onSave,
  onSaved,
  onCancel,
  onUploaded,
}: {
  album: Album;
  /** Saves the album; resolves to the saved album, or undefined when saving failed. */
  onSave: (input: AlbumInput) => Promise<Album | undefined>;
  /** Called after Save, to leave the editor. */
  onSaved: () => void;
  /** Called after files were uploaded as new media. */
  onUploaded: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(album.name);
  const [dates, setDates] = useState({ startDate: album.startDate ?? "", endDate: album.endDate ?? "" });
  const [items, setItems] = useState<Item[]>(() =>
    (album.childs ?? []).map((child, index) => ({ key: `initial-${index}`, child })),
  );
  const added = useRef(0);
  const [albumName, setAlbumName] = useState("");
  const [text, setText] = useState("");
  const [description, setDescription] = useState(album.description ?? "");
  const [isPublic, setIsPublic] = useState(album.public ?? false);
  const [hoverImage, setHoverImage] = useState(album.hoverImage ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<string[]>([]);

  function add(child: Child) {
    const key = `added-${added.current++}`;
    setItems((current) => [...current, { key, child }]);
  }

  // a new, empty album; the backend gives it an id when this album is saved
  function addAlbum() {
    add({ type: "album", value: { id: "", name: albumName.trim() } });
    setAlbumName("");
  }

  function addText() {
    add({ type: "text", value: { name: text.trim() } });
    setText("");
  }

  // Each file becomes a media right away and is added to the contents; the album itself is saved on Save.
  async function uploadFiles(files: File[]) {
    setFailed([]);
    for (const [index, file] of files.entries()) {
      setUpload({ done: index, total: files.length });
      try {
        const value = await media.create(await toUpload(file));
        add({ type: "media", value });
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        setFailed((current) => [...current, `${file.name}: ${reason}`]);
      }
    }
    setUpload(null);
    onUploaded();
  }

  function input(): AlbumInput {
    const childs = items.map((item) => item.child);
    // the hover image is one of the album's own images, so it goes when that image is removed
    const kept = childs.some((child) => child.type === "media" && child.value.id === hoverImage);
    return { name: name.trim(), ...dates, description, public: isPublic, childs, hoverImage: kept ? hoverImage : "" };
  }

  // what the form held when it opened, to tell whether anything was changed since
  const [initial] = useState(() => JSON.stringify(input()));

  // with changes, or a sub-album that does not exist yet, this album is saved first
  async function openAlbum(index: number) {
    const child = items[index].child;
    let id = child.value.id;
    if (!id || JSON.stringify(input()) !== initial) {
      if (!confirm(`Save this album and open "${child.value.name}"?`)) return;
      setSaving(true);
      const saved = await onSave(input());
      setSaving(false);
      if (!saved) return;
      // the saved contents are in the order they were sent
      id = saved.childs?.[index]?.value.id;
    }
    if (id) router.push(`/admin/albums/${id}`);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const saved = await onSave(input());
    setSaving(false);
    if (saved) onSaved();
  }

  return (
    <form onSubmit={save} className="card flex flex-col gap-4 p-4">
      <div className="font-medium">
        Edit album <span className="font-mono text-muted">{album.id}</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="label min-w-40 flex-1">
          Name
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <DateInputs {...dates} onChange={setDates} />
        <label className="flex h-[34px] items-center gap-2">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public
        </label>
      </div>

      <div className="label">
        Description
        <RichText label="Album description" value={description} onChange={setDescription} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs text-muted">Contents, in order. Drag to reorder. The hover image is shown when hovering the album in the list.</div>
        <AlbumContents items={items} onChange={setItems} hoverImage={hoverImage} onHoverImageChange={setHoverImage} onOpenAlbum={openAlbum} />
      </div>

      <div className="grid gap-3 border-t border-border pt-4 md:grid-cols-2">
        <div className="flex items-end gap-2">
          <label className="label min-w-0 flex-1">
            New album
            <input
              className="input"
              placeholder="Name"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (albumName.trim()) addAlbum();
                }
              }}
            />
          </label>
          <button type="button" className="btn" disabled={!albumName.trim()} onClick={addAlbum}>
            Create
          </button>
        </div>
        <div className="flex items-end gap-2">
          <label className="label min-w-0 flex-1">
            Add text
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (text.trim()) addText();
                }
              }}
            />
          </label>
          <button type="button" className="btn" disabled={!text.trim()} onClick={addText}>
            Add
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="label">
          Upload files
          <input
            className="input"
            type="file"
            multiple
            disabled={upload !== null}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) uploadFiles(files);
            }}
          />
        </label>
        {upload && (
          <div className="text-muted" role="status">
            Uploading {upload.done + 1} of {upload.total}…
          </div>
        )}
        {failed.length > 0 && (
          <div className="banner-error" role="alert">
            Could not upload: {failed.join("; ")}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={!name.trim() || saving || upload !== null}>
          Save album
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
