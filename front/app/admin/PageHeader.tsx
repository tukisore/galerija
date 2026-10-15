export default function PageHeader({
  title,
  count,
  error,
}: {
  title: string;
  count?: number;
  error: string | null;
}) {
  return (
    <>
      <h1 className="text-xl font-semibold">
        {title}
        {count !== undefined && <span className="ml-2 font-normal text-muted">{count}</span>}
      </h1>
      {error && (
        <div className="banner-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
