import { useRef, useState } from 'react'
import { Plus } from '@phosphor-icons/react'

type Props = {
  onAdd: (text: string) => void
}

export default function NewItemRow({ onAdd }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: 'var(--bg-elevated)' }}>
      <Plus size={26} weight="bold" style={{ color: 'var(--accent)' }} className="shrink-0" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={submit}
        placeholder="Novo item"
        enterKeyHint="done"
        autoCapitalize="sentences"
        autoCorrect="off"
        className="flex-1 bg-transparent text-[17px] outline-none"
        style={{ color: 'var(--text)' }}
      />
    </div>
  )
}
