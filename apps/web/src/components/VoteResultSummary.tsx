'use client';

export function VoteResultSummary({
  yes,
  no,
  abstain,
  total,
}: {
  yes: number;
  no: number;
  abstain: number;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
      <p className="font-medium">Resultado</p>
      <p className="text-muted-foreground">
        Sí: {yes} — No: {no} — Abstención: {abstain}
      </p>
      <p className="text-muted-foreground">Total votos: {total}</p>
    </div>
  );
}
