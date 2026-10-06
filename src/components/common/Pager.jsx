import { useMemo, useState, useEffect } from "react";

export const PER_PAGE = 15;

function windowed(cur, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out = [1];
  const a = Math.max(2, cur - 1);
  const b = Math.min(pages - 1, cur + 1);
  if (a > 2) out.push("…a");
  for (let i = a; i <= b; i += 1) out.push(i);
  if (b < pages - 1) out.push("…b");
  out.push(pages);
  return out;
}

export default function Pager({ page, total, perPage = PER_PAGE, onPage }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (!total) return null;
  const cur = Math.min(page, pages);
  return (
    <div className="pager">
      <span className="info">
        {(cur - 1) * perPage + 1}–{Math.min(total, cur * perPage)} of {total}
      </span>
      {pages > 1 && (
        <>
          <button className="pg" onClick={() => onPage(cur - 1)} disabled={cur <= 1} aria-label="Previous page">‹</button>
          {windowed(cur, pages).map((p) =>
            typeof p === "number" ? (
              <button key={p} className={`pg ${p === cur ? "is-active" : ""}`} onClick={() => onPage(p)}>{p}</button>
            ) : (
              <span key={p} className="pg-gap">…</span>
            )
          )}
          <button className="pg" onClick={() => onPage(cur + 1)} disabled={cur >= pages} aria-label="Next page">›</button>
        </>
      )}
    </div>
  );
}

export function usePaged(rows, resetKey = "", perPage = PER_PAGE) {
  const [page, setPage] = useState(1);
  const list = rows || [];
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  useEffect(() => {
    setPage(1);
  }, [resetKey]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const cur = Math.min(page, pages);
  const slice = useMemo(() => list.slice((cur - 1) * perPage, cur * perPage), [list, cur, perPage]);
  return {
    rows: slice,
    page: cur,
    setPage,
    total: list.length,
    pager: <Pager page={cur} total={list.length} perPage={perPage} onPage={setPage} />,
  };
}
