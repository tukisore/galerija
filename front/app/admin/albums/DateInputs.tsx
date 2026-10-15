/**
 * Start date (required) and end date (optional, not before the start) of an album, as yyyy-MM-dd.
 * The start date is enforced by the browser when the form is submitted, which points the user at the field.
 */
export default function DateInputs({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (dates: { startDate: string; endDate: string }) => void;
}) {
  return (
    <>
      <label className="label">
        Start date (required)
        <input
          className="input"
          type="date"
          required
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => onChange({ startDate: e.target.value, endDate })}
        />
      </label>
      <label className="label">
        End date (optional)
        <input
          className="input"
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => onChange({ startDate, endDate: e.target.value })}
        />
      </label>
    </>
  );
}
