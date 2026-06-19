// Blend costing engine — weighted average over tea ratios.
export type Item = { ratio: number; costPerKg: number };

export function blendCost(items: Item[]): number {
  const c = items.reduce((s, i) => s + i.costPerKg * (i.ratio / 100), 0);
  return Math.round(c * 100) / 100;
}

export function blendTotal(items: { ratio: number }[]): number {
  return Math.round(items.reduce((s, i) => s + (Number(i.ratio) || 0), 0) * 100) / 100;
}

export function margin(cost: number, price: number): number {
  return price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
}

export function isValidBlend(items: { ratio: number; teaId?: string }[]): boolean {
  return (
    items.length > 0 &&
    items.every((i) => i.teaId && Number(i.ratio) > 0) &&
    Math.abs(blendTotal(items) - 100) < 0.01
  );
}

export function money(n: number): string {
  return "₹" + (Math.round(n * 100) / 100).toLocaleString("en-IN");
}
