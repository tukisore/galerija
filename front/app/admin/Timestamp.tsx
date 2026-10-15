function format(value?: string) {
  return value ? new Date(value).toLocaleString() : "Unknown";
}

/** Table cell with when an entity was last updated; its tooltip also says when it was created. */
export default function Timestamp({ created, updated }: { created?: string; updated?: string }) {
  return (
    <td className="whitespace-nowrap" title={`Created: ${format(created)}`}>
      {updated ? format(updated) : <span className="text-muted">Unknown</span>}
    </td>
  );
}
