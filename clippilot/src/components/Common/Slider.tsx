interface SliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  displayValue?: string | number;
  disabled?: boolean;
  hint?: string;
}

export default function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  displayValue,
  disabled = false,
  hint,
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={disabled ? "opacity-50" : ""}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-dark-300">{label}</label>
          <span className="text-sm font-semibold text-white tabular-nums">
            {displayValue ?? value}
          </span>
        </div>
      )}
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-dark-700">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          style={{ margin: 0 }}
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-white shadow-lg border-2 border-brand-500 transition-all pointer-events-none"
          style={{ left: `calc(${percent}% - 8px)` }}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-dark-500">{hint}</p>}
    </div>
  );
}
