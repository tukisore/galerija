// Rich text is stored as a small, safe subset of HTML.

const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "A", "UL", "OL", "LI", "P", "DIV", "BR"]);

// removed together with everything inside them; other unknown tags only lose the tag itself
const droppedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT"]);

export function isSafeLink(url: string) {
  return /^(https?:\/\/|mailto:)/i.test(url.trim());
}

function clean(source: Node, target: Node, doc: Document) {
  for (const node of Array.from(source.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(node.textContent ?? ""));
    } else if (node instanceof Element && !droppedTags.has(node.tagName)) {
      if (!allowedTags.has(node.tagName)) {
        clean(node, target, doc);
        continue;
      }
      const copy = doc.createElement(node.tagName);
      const href = node.getAttribute("href") ?? "";
      if (node.tagName === "A" && isSafeLink(href)) {
        copy.setAttribute("href", href.trim());
        copy.setAttribute("target", "_blank");
        copy.setAttribute("rel", "noopener noreferrer");
      }
      clean(node, copy, doc);
      target.appendChild(copy);
    }
  }
}

/** Keeps only basic formatting, lists and http(s)/mailto links; everything else is stripped. */
export function sanitizeHtml(html: string): string {
  // parsed into a separate document, so nothing in it loads or runs
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const output = parsed.createElement("div");
  clean(parsed.body, output, parsed);
  return output.textContent?.trim() ? output.innerHTML : "";
}

/** Turns a stored value into safe HTML; values saved before rich text are plain text with line breaks. */
export function toHtml(value: string): string {
  if (/<\/?(b|strong|i|em|u|s|strike|a|ul|ol|li|p|div|br)\b[^>]*>/i.test(value)) return sanitizeHtml(value);
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br>");
}
