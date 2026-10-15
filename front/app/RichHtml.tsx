"use client";

import { toHtml } from "@/lib/richText";

/** Shows a stored rich text value; it is sanitized first, so only safe formatting is rendered. */
export default function RichHtml({ value, className = "" }: { value: string; className?: string }) {
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: toHtml(value) }} />;
}
