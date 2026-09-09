import { useEffect, useMemo, useState } from 'react'
import { supabase, type ShoppingItem } from './lib/supabase'
import ItemRow from './components/ItemRow'
import NewItemRow from './components/NewItemRow'

export default function App() {
  const [itemsById, setItemsById] = useState<Record<string, ShoppingItem>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true

    supabase
      .from('shopping_items')
      .select('*')
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error(error)
          setLoaded(true)
          return
        }
        const map: Record<string, ShoppingItem> = {}
        for (const row of data ?? []) map[row.id] = row as ShoppingItem
        setItemsById(map)
        setLoaded(true)
      })

    const channel = supabase
      .channel('shopping_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items' },
        (payload) => {
          setItemsById((prev) => {
            const next = { ...prev }
            if (payload.eventType === 'DELETE') {
              const old = payload.old as { id: string }
              delete next[old.id]
            } else {
              const row = payload.new as ShoppingItem
              next[row.id] = row
            }
            return next
          })
        },
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  const items = useMemo(() => Object.values(itemsById), [itemsById])

  const pending = useMemo(
    () => items.filter((i) => !i.completed).sort((a, b) => a.position - b.position),
    [items],
  )
  const completed = useMemo(
    () =>
      items
        .filter((i) => i.completed)
        .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
    [items],
  )

  async function addItem(text: string) {
    const tempId = crypto.randomUUID()
    const position = Date.now() / 1000
    const optimistic: ShoppingItem = {
      id: tempId,
      text,
      completed: false,
      position,
      completed_at: null,
      created_at: new Date().toISOString(),
    }
    setItemsById((prev) => ({ ...prev, [tempId]: optimistic }))

    const { data, error } = await supabase
      .from('shopping_items')
      .insert({ text, position })
      .select()
      .single()

    setItemsById((prev) => {
      const next = { ...prev }
      delete next[tempId]
      if (data) next[data.id] = data as ShoppingItem
      return next
    })
    if (error) console.error(error)
  }

  async function toggleItem(item: ShoppingItem) {
    const completed = !item.completed
    const completed_at = completed ? new Date().toISOString() : null
    setItemsById((prev) => ({ ...prev, [item.id]: { ...item, completed, completed_at } }))

    const { error } = await supabase
      .from('shopping_items')
      .update({ completed, completed_at })
      .eq('id', item.id)
    if (error) console.error(error)
  }

  async function editItem(item: ShoppingItem, text: string) {
    setItemsById((prev) => ({ ...prev, [item.id]: { ...item, text } }))

    const { error } = await supabase.from('shopping_items').update({ text }).eq('id', item.id)
    if (error) console.error(error)
  }

  async function deleteItem(id: string) {
    setItemsById((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    const { error } = await supabase.from('shopping_items').delete().eq('id', id)
    if (error) console.error(error)
  }

  async function clearCompleted() {
    const ids = completed.map((i) => i.id)
    if (ids.length === 0) return
    setItemsById((prev) => {
      const next = { ...prev }
      for (const id of ids) delete next[id]
      return next
    })
    const { error } = await supabase.from('shopping_items').delete().eq('completed', true)
    if (error) console.error(error)
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <header
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          background: 'var(--header-bg)',
          paddingTop: 'env(safe-area-inset-top)',
          borderBottom: '0.5px solid var(--separator)',
        }}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <h1 className="text-[28px] font-bold" style={{ color: 'var(--text)' }}>
            Mercado
          </h1>
          {completed.length > 0 && (
            <button
              onClick={clearCompleted}
              className="text-[15px] font-medium"
              style={{ color: 'var(--accent)' }}
            >
              Limpar concluídos
            </button>
          )}
        </div>
      </header>

      <main className="px-4 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {!loaded ? (
          <p className="px-1 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            Carregando…
          </p>
        ) : (
          <>
            <div
              className="overflow-hidden rounded-[14px]"
              style={{ background: 'var(--bg-elevated)' }}
            >
              {pending.map((item, i) => (
                <div key={item.id}>
                  {i > 0 && <Separator />}
                  <ItemRow item={item} onToggle={toggleItem} onDelete={deleteItem} onEdit={editItem} />
                </div>
              ))}
              {pending.length > 0 && <Separator />}
              <NewItemRow onAdd={addItem} />
            </div>

            {completed.length > 0 && (
              <div className="mt-7">
                <p
                  className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Concluídos · {completed.length}
                </p>
                <div className="overflow-hidden rounded-[14px]" style={{ background: 'var(--bg-elevated)' }}>
                  {completed.map((item, i) => (
                    <div key={item.id}>
                      {i > 0 && <Separator />}
                      <ItemRow item={item} onToggle={toggleItem} onDelete={deleteItem} onEdit={editItem} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Separator() {
  return <div style={{ height: '0.5px', background: 'var(--separator)', marginLeft: '52px' }} />
}
