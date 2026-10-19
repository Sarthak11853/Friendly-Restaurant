export default function Stars({ value, className = "" }: { value: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={`whitespace-nowrap text-amber-500 ${className}`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {"★".repeat(rounded)}
      <span className="text-stone-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
