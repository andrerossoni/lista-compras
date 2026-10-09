import { useRef, useState } from 'react'
import { Plus } from '@phosphor-icons/react'

type Props = {
  onAdd: (text: string) => void
}

export default function NewItemRow({ onAdd }: Props) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
    navigator.vibrate?.(8)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
      inputRef.current?.focus()
    }
  }

  const active = focused || value.length > 0

  return (
    <div
      className="row flex items-center gap-3.5 px-4 py-3 transition-colors"
      style={{ background: 'var(--surface)' }}
      onClick={() => inputRef.current?.focus()}
    >
      <span
        className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-full transition-all duration-200"
        style={{
          background: active ? 'var(--accent)' : 'var(--accent-soft)',
          transform: active ? 'rotate(90deg)' : 'none',
        }}
      >
        <Plus size={15} weight="bold" color={active ? '#fff' : 'var(--accent)'} />
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          submit()
        }}
        placeholder="Adicionar item"
        enterKeyHint="done"
        autoCapitalize="sentences"
        autoCorrect="off"
        aria-label="Adicionar item"
        className="w-full flex-1 bg-transparent py-0.5 text-[17px] leading-snug tracking-[-0.01em] outline-none placeholder:text-[var(--text-tertiary)]"
      />
    </div>
  )
}
