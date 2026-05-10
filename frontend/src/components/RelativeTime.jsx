import { useEffect, useState } from "react";

function fmt(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 0) return "in future";
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function RelativeTime({ iso }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const h = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(h);
  }, []);
  return <span title={iso || ""}>{fmt(iso)}</span>;
}
