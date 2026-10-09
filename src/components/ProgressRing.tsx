type Props = {
  done: number
  total: number
}

const SIZE = 46
const STROKE = 3.5
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

export default function ProgressRing({ done, total }: Props) {
  const ratio = total === 0 ? 0 : done / total
  const complete = total > 0 && done === total

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`${done} de ${total} no carrinho`}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--accent-soft)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <span
        className="tabular absolute inset-0 flex items-center justify-center text-[12px] font-semibold"
        style={{ color: complete ? 'var(--accent)' : 'var(--text-secondary)' }}
      >
        {complete ? (
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
            <path
              d="M3.5 8.4 6.6 11.5 12.5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          total - done
        )}
      </span>
    </div>
  )
}
