import { useEffect, useRef, useState } from 'react'
import { Circle, CheckCircle, Trash } from '@phosphor-icons/react'
import type { ShoppingItem } from '../lib/supabase'

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
      editInputRef.current?.focus()
      editInputRef.current?.select()
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
    setDragX(Math.max(Math.min(dx, 0), -MAX_DRAG))
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

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center"
        style={{ background: 'var(--danger)' }}
      >
        <Trash size={20} weight="bold" color="#fff" />
      </div>
      <div
        className="relative flex items-center gap-3 px-4 py-2.5"
        style={{
          background: 'var(--bg-elevated)',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease-out',
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={() => onToggle(item)}
          className="flex shrink-0 items-center justify-center"
          aria-label={item.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
        >
          {item.completed ? (
            <CheckCircle size={26} weight="fill" style={{ color: 'var(--accent)' }} />
          ) : (
            <Circle size={26} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
          )}
        </button>
        {editing ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={commitEdit}
            className="flex-1 bg-transparent py-0.5 text-[17px] leading-snug outline-none"
            style={{ color: 'var(--text)' }}
          />
        ) : (
          <span
            onClick={startEdit}
            className="flex-1 py-0.5 text-[17px] leading-snug"
            style={{
              color: item.completed ? 'var(--text-secondary)' : 'var(--text)',
              textDecoration: item.completed ? 'line-through' : 'none',
              wordBreak: 'break-word',
              cursor: 'text',
            }}
          >
            {item.text}
          </span>
        )}
      </div>
    </div>
  )
}
