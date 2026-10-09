type Props = {
  checked: boolean
  onChange: () => void
}

// Checkbox próprio em vez do ícone pronto: o anel encolhe, o disco cresce e o
// traço do check é desenhado, tudo com transform/opacity.
export default function Checkbox({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      aria-label={checked ? 'Marcar como pendente' : 'Marcar como concluído'}
      className="group -m-2 flex shrink-0 items-center justify-center p-2"
    >
      <span className="relative block h-[25px] w-[25px] transition-transform duration-150 group-active:scale-[0.86]">
        <svg viewBox="0 0 25 25" className="absolute inset-0 h-full w-full">
          <circle
            cx="12.5"
            cy="12.5"
            r="11"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="1.6"
            style={{
              opacity: checked ? 0 : 1,
              transition: 'opacity 180ms ease',
            }}
          />
          <circle
            cx="12.5"
            cy="12.5"
            r="12"
            fill="var(--accent)"
            style={{
              transformOrigin: 'center',
              transform: `scale(${checked ? 1 : 0.1})`,
              opacity: checked ? 1 : 0,
              transition: 'transform 260ms cubic-bezier(0.3, 1.5, 0.5, 1), opacity 160ms ease',
            }}
          />
          <path
            d="M7 12.8 11 16.6 18 9.2"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: checked ? 0 : 1,
              transition: checked
                ? 'stroke-dashoffset 240ms cubic-bezier(0.4, 0, 0.2, 1) 90ms'
                : 'stroke-dashoffset 120ms ease',
            }}
          />
        </svg>
      </span>
    </button>
  )
}
