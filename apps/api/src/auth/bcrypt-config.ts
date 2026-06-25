export const BCRYPT_COST = (() => {
  const raw = process.env.BCRYPT_COST;
  if (!raw) return 12;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 10 || n > 15) return 12;
  return n;
})();
