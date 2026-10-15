"use client";

import { useLayoutEffect, useRef } from "react";
import { isSafeLink, sanitizeHtml, toHtml } from "@/lib/richText";

const commands = [
  { command: "bold", label: "Bold", text: "B", className: "font-bold" },
  { command: "italic", label: "Italic", text: "I", className: "italic" },
  { command: "underline", label: "Underline", text: "U", className: "underline" },
  { command: "insertUnorderedList", label: "Bullet list", text: "•", className: "" },
  { command: "insertOrderedList", label: "Numbered list", text: "1.", className: "" },
];

/**
 * A text box with formatting controls that grows and shrinks with its content.
 * The value is a small subset of HTML (see lib/richText).
 */
export default function RichText({
  value,
  onChange,
  label,
  placeholder,
  toolbar = "always",
  className = "",
}: {
  value: string;
  onChange: (html: string) => void;
  /** Accessible name of the text box. */
  label: string;
  placeholder?: string;
  /** "focus" shows the controls only while the box is being edited. */
  toolbar?: "always" | "focus";
  className?: string;
}) {
  const editor = useRef<HTMLDivElement>(null);
  // what the box last reported, so its own changes are not written back into it (that would move the caret)
  const reported = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (editor.current && value !== reported.current) {
      editor.current.innerHTML = toHtml(value);
      reported.current = value;
    }
  }, [value]);

  function report() {
    if (!editor.current) return;
    const html = sanitizeHtml(editor.current.innerHTML);
    // an emptied box keeps a stray <br>; drop it so the placeholder shows again
    if (!html) editor.current.innerHTML = "";
    reported.current = html;
    onChange(html);
  }

  function run(command: string, argument?: string) {
    editor.current?.focus();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false, argument);
    report();
  }

  function addLink() {
    const url = prompt("Link address (https://…)")?.trim();
    if (!url) return;
    if (isSafeLink(url)) run("createLink", url);
    else alert("Links must start with http://, https:// or mailto:");
  }

  // keeps the selection in the text box when a control is clicked
  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div className={`rich ${className}`} data-toolbar={toolbar}>
      <div className="rich-toolbar" role="toolbar" aria-label={`Formatting for ${label}`}>
        {commands.map(({ command, label: name, text, className: style }) => (
          <button
            key={command}
            type="button"
            className={`btn btn-small ${style}`}
            aria-label={name}
            title={name}
            onMouseDown={keepSelection}
            onClick={() => run(command)}
          >
            {text}
          </button>
        ))}
        <button type="button" className="btn btn-small" title="Link" onMouseDown={keepSelection} onClick={addLink}>
          Link
        </button>
        <button
          type="button"
          className="btn btn-small"
          title="Remove formatting and links"
          onMouseDown={keepSelection}
          onClick={() => {
            run("removeFormat");
            run("unlink");
          }}
        >
          Clear
        </button>
      </div>
      <div
        ref={editor}
        className="rich-editor input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        data-placeholder={placeholder}
        onInput={report}
        onPaste={(event) => {
          // paste as plain text, so formatting from other pages does not come along
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
        }}
      />
    </div>
  );
}
