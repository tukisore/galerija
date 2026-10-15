"use client";

import { useState } from "react";
import { coverId } from "@/lib/albums";
import type { Child } from "@/lib/api";
import { fileUrl, isGpx, isImage } from "@/lib/files";
import GpxMap from "../GpxMap";
import RichText from "../RichText";

/** A child with a key that stays the same while the list is reordered. */
export type Item = { key: string; child: Child };

function Thumbnail({
  child,
  ...dragProps
}: { child: Exclude<Child, { type: "text" }> } & React.ComponentProps<"div">) {
  const imageId =
    child.type === "album"
      ? coverId(child.value)
      : isImage(child.value.filename)
        ? child.value.id
        : undefined;
  const extension = child.type === "media" ? child.value.filename.split(".").pop() : undefined;

  return (
    <div
      {...dragProps}
      draggable
      title="Drag to reorder"
      className="relative flex h-64 w-64 cursor-grab items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
    >
      {child.type === "media" && isGpx(child.value.filename) ? (
        <GpxMap mediaId={child.value.id} className="h-full w-full" />
      ) : imageId ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by the backend, not optimizable
        <img
          src={fileUrl(imageId)}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs font-medium uppercase text-muted">
          {child.type === "album" ? "Empty album" : extension || "File"}
        </span>
      )}
      {child.type === "album" && <span className="badge absolute left-1.5 top-1.5">album</span>}
    </div>
  );
}

/**
 * The contents of an album as a grid of thumbnails, with texts on a line of their own.
 * Reorder by dragging a thumbnail or a text's handle, or with the arrow buttons.
 */
export default function AlbumContents({
  items,
  onChange,
  hoverImage,
  onHoverImageChange,
  onOpenAlbum,
}: {
  items: Item[];
  onChange: (items: Item[]) => void;
  /** Id of the media chosen as the album's hover image; empty for none. */
  hoverImage: string;
  onHoverImageChange: (mediaId: string) => void;
  /** Opens the sub-album at this index of the contents in its own editor. */
  onOpenAlbum: (index: number) => void;
}) {
  const [dragKey, setDragKey] = useState<string | null>(null);

  function shift(index: number, by: number) {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  }

  // While dragging, the dragged item follows the pointer: it lands before or after the item under it,
  // depending on which half the pointer is in (top/bottom for texts, left/right for thumbnails).
  function dragOver(event: React.DragEvent<HTMLElement>, over: Item) {
    if (!dragKey) return;
    event.preventDefault();
    if (over.key === dragKey) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const after =
      over.child.type === "text"
        ? event.clientY > rect.top + rect.height / 2
        : event.clientX > rect.left + rect.width / 2;
    const dragged = items.find((item) => item.key === dragKey);
    if (!dragged) return;
    const next = items.filter((item) => item.key !== dragKey);
    next.splice(next.indexOf(over) + (after ? 1 : 0), 0, dragged);
    if (next.some((item, index) => item !== items[index])) onChange(next);
  }

  function controls(item: Item, index: number, earlier: string, later: string) {
    return (
      <>
        <button
          type="button"
          className="btn btn-small"
          aria-label="Move earlier"
          disabled={index === 0}
          onClick={() => shift(index, -1)}
        >
          {earlier}
        </button>
        <button
          type="button"
          className="btn btn-small"
          aria-label="Move later"
          disabled={index === items.length - 1}
          onClick={() => shift(index, 1)}
        >
          {later}
        </button>
        <button
          type="button"
          className="btn btn-small btn-danger"
          aria-label="Remove"
          onClick={() => onChange(items.filter((other) => other !== item))}
        >
          ✕
        </button>
      </>
    );
  }

  function update(item: Item, child: Child) {
    onChange(items.map((other) => (other === item ? { ...item, child } : other)));
  }

  if (items.length === 0) return <div className="text-muted">This album is empty.</div>;

  return (
    <div className="flex flex-wrap gap-3" onDragOver={(e) => dragKey && e.preventDefault()}>
      {items.map((item, index) => {
        const { child } = item;
        const dragging = item.key === dragKey ? "opacity-40" : "";

        if (child.type === "text")
          return (
            <div
              key={item.key}
              data-item="text"
              className={`flex basis-full items-start gap-2 ${dragging}`}
              onDragOver={(e) => dragOver(e, item)}
            >
              <span
                draggable
                title="Drag to reorder"
                className="cursor-grab select-none px-1 text-lg text-muted"
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  if (e.currentTarget.parentElement) e.dataTransfer.setDragImage(e.currentTarget.parentElement, 12, 16);
                  setDragKey(item.key);
                }}
                onDragEnd={() => setDragKey(null)}
              >
                ⠿
              </span>
              <RichText
                className="flex-1"
                label="Text"
                value={child.value.name}
                onChange={(name) => update(item, { ...child, value: { ...child.value, name } })}
              />
              {controls(item, index, "↑", "↓")}
            </div>
          );

        return (
          <div
            key={item.key}
            data-item={child.type}
            className={`flex w-64 flex-col gap-1.5 ${dragging}`}
            onDragOver={(e) => dragOver(e, item)}
          >
            <Thumbnail
              child={child}
              onClick={child.type === "album" ? () => onOpenAlbum(index) : undefined}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                if (e.currentTarget.parentElement) e.dataTransfer.setDragImage(e.currentTarget.parentElement, 20, 20);
                setDragKey(item.key);
              }}
              onDragEnd={() => setDragKey(null)}
            />
            <div className="truncate text-xs" title={child.value.name}>
              {child.value.name}
            </div>
            {child.type === "media" && (
              <RichText
                label={`Description of ${child.value.name}`}
                placeholder="Description"
                toolbar="focus"
                value={child.value.description ?? ""}
                onChange={(description) => update(item, { ...child, value: { ...child.value, description } })}
              />
            )}
            <div className="flex gap-2">
              {controls(item, index, "←", "→")}
              {child.type === "album" && (
                <button type="button" className="btn btn-small ml-auto" onClick={() => onOpenAlbum(index)}>
                  Edit album
                </button>
              )}
              {child.type === "media" && isImage(child.value.filename) && (
                <button
                  type="button"
                  className={`btn btn-small ml-auto ${child.value.id === hoverImage ? "btn-primary" : ""}`}
                  aria-pressed={child.value.id === hoverImage}
                  onClick={() => onHoverImageChange(child.value.id === hoverImage ? "" : child.value.id)}
                >
                  {child.value.id === hoverImage ? "★ Hover image" : "Set as hover"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
