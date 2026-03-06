'use client';

import { useEffect, useState } from 'react';

function formatSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function TimerDisplay({
  remainingSec: initialRemaining,
  overtimeSec,
}: {
  remainingSec: number;
  overtimeSec: number;
}) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [overtime, setOvertime] = useState(overtimeSec);

  useEffect(() => {
    if (initialRemaining > 0) {
      setRemaining(initialRemaining);
      setOvertime(0);
    } else {
      setRemaining(0);
      setOvertime(overtimeSec);
    }
  }, [initialRemaining, overtimeSec]);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
      setOvertime((o) => (remaining <= 0 ? o + 1 : o));
    }, 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const isOvertime = remaining === 0 && (overtime > 0 || overtimeSec > 0);
  return (
    <div style={{ padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
      <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        {remaining > 0 ? formatSec(remaining) : formatSec(overtime)}
      </span>
      {isOvertime && <span style={{ marginLeft: 8, color: 'crimson' }}>Destiempo</span>}
    </div>
  );
}
