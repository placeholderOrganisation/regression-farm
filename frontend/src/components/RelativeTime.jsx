function isUtcLike(s) {
  return /Z$|[+-]\d{2}:?\d{2}$/.test(s);
}

function fmt(iso) {
  if (!iso) return "—";
  const s = isUtcLike(iso) ? iso : iso + "Z";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export default function RelativeTime({ iso }) {
  return (
    <span title={iso || ""} className="tabular">
      {fmt(iso)}
    </span>
  );
}
