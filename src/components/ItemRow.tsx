import { useEffect, useRef, useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import type { ShoppingItem } from '../lib/supabase'
import Checkbox from './Checkbox'

const DELETE_THRESHOLD = 72
const MAX_DRAG = 96

type Props = {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onEdit: (item: ShoppingItem, text: string) => void
}

export default function ItemRow({ item, onToggle, onDelete, onEdit }: Props) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.text)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const axisRef = useRef<'none' | 'x' | 'y'>('none')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      const input = editInputRef.current
      input?.focus()
      input?.setSelectionRange(input.value.length, input.value.length)
    }
  }, [editing])

  function startEdit() {
    setEditValue(item.text)
    setEditing(true)
  }

  function commitEdit() {
    setEditing(false)
    const trimmed = editValue.trim()
    if (!trimmed) {
      onDelete(item.id)
      return
    }
    if (trimmed !== item.text) {
      onEdit(item, trimmed)
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      editInputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(item.text)
      setEditing(false)
    }
  }

  function handleToggle() {
    navigator.vibrate?.(item.completed ? 8 : [0, 12])
    onToggle(item)
  }

  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    axisRef.current = 'none'
    setDragging(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null || startYRef.current === null) return
    const dx = e.touches[0].clientX - startXRef.current
    const dy = e.touches[0].clientY - startYRef.current

    if (axisRef.current === 'none') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (axisRef.current !== 'x') return

    e.preventDefault()
    const next = Math.max(Math.min(dx, 0), -MAX_DRAG)
    // Vibra uma vez ao cruzar o limite, como aviso de que soltar apaga.
    if (next <= -DELETE_THRESHOLD && dragX > -DELETE_THRESHOLD) navigator.vibrate?.(10)
    setDragX(next)
  }

  function handleTouchEnd() {
    setDragging(false)
    if (dragX <= -DELETE_THRESHOLD) {
      onDelete(item.id)
    }
    setDragX(0)
    startXRef.current = null
    startYRef.current = null
    axisRef.current = 'none'
  }

  const armed = dragX <= -DELETE_THRESHOLD

  return (
    <li className="item-enter group/row relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center"
        style={{ background: 'var(--danger)', opacity: Math.min(-dragX / 40, 1) }}
      >
        <Trash
          size={20}
          weight="bold"
          color="#fff"
          style={{
            transform: `scale(${armed ? 1.15 : 0.9})`,
            transition: 'transform 180ms cubic-bezier(0.3, 1.4, 0.5, 1)',
          }}
        />
      </div>
      <div
        className="row relative flex items-center gap-3.5 px-4 py-3 transition-colors"
        style={{
          background: 'var(--surface)',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1)',
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Checkbox checked={item.completed} onChange={handleToggle} />
        {editing ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={commitEdit}
            className="w-full flex-1 bg-transparent py-0.5 text-[17px] leading-snug tracking-[-0.01em] outline-none"
          />
        ) : (
          <span
            onClick={startEdit}
            className="flex-1 py-0.5 text-[17px] leading-snug tracking-[-0.01em]"
            style={{ wordBreak: 'break-word', cursor: 'text' }}
          >
            {/* O risco mora num span inline para medir o texto, não a linha. */}
            <span
              className={`strike ${item.completed ? 'strike-on' : ''}`}
              style={{ color: item.completed ? 'var(--text-tertiary)' : 'var(--text)' }}
            >
              {item.text}
            </span>
          </span>
        )}
        {/* Sem toque não há swipe: no desktop a exclusão aparece no hover. */}
        <button
          onClick={() => onDelete(item.id)}
          aria-label={`Excluir ${item.text}`}
          className="-m-1.5 hidden shrink-0 p-1.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 md:block"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Trash size={17} weight="regular" />
        </button>
      </div>
    </li>
  )
}
