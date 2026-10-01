export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        backgroundColor: '#EAE5DB',
        borderRadius: '12px',
        padding: '3px',
        width: '100%',
        gap: '2px',
      }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              flex: 1,
              minHeight: '40px',
              padding: '6px 8px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
              color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'var(--primary-tint)' : '#DDD8CE',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                }}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
