import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ShoppingCartSimple } from '@phosphor-icons/react'
import { supabase, type ShoppingItem } from './lib/supabase'
import ItemRow from './components/ItemRow'
import NewItemRow from './components/NewItemRow'
import PullToRefresh from './components/PullToRefresh'

export default function App() {
  const [itemsById, setItemsById] = useState<Record<string, ShoppingItem>>({})
  const [loaded, setLoaded] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase.from('shopping_items').select('*')
    if (error) {
      console.error(error)
      return
    }
    const map: Record<string, ShoppingItem> = {}
    for (const row of data ?? []) map[row.id] = row as ShoppingItem
    setItemsById(map)
  }, [])

  const resubscribe = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`shopping_items_changes_${Date.now()}`)
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
  }, [])

  // Puxar pra atualizar: refaz o fetch e reabre o canal de tempo real,
  // já que o socket pode ter caído silenciosamente sem que o app perceba.
  const refresh = useCallback(async () => {
    resubscribe()
    await fetchAll()
  }, [fetchAll, resubscribe])

  useEffect(() => {
    fetchAll().then(() => setLoaded(true))
    resubscribe()

    // No Android, o app instalado ("Adicionar à tela de início") pode ficar
    // minimizado por horas — o WebSocket do tempo real cai nesse meio tempo
    // e não volta sozinho. Ao reabrir (a aba fica visível de novo),
    // resincroniza tudo.
    function handleVisible() {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('pageshow', handleVisible)
    window.addEventListener('focus', handleVisible)

    return () => {
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('pageshow', handleVisible)
      window.removeEventListener('focus', handleVisible)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [fetchAll, resubscribe, refresh])

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
        <div className="flex items-end justify-between px-4 pb-3 pt-4">
          <div>
            <h1
              className="text-[32px] font-bold leading-tight tracking-tight"
              style={{ color: 'var(--text)' }}
            >
              Mercado
            </h1>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {loaded
                ? pending.length > 0
                  ? `${pending.length} ${pending.length === 1 ? 'item' : 'itens'}`
                  : completed.length > 0
                    ? 'Tudo pronto'
                    : 'Sua lista está vazia'
                : ' '}
            </p>
          </div>
          {completed.length > 0 && (
            <button
              onClick={clearCompleted}
              className="text-[15px] font-medium transition-opacity active:opacity-50"
              style={{ color: 'var(--accent)' }}
            >
              Limpar concluídos
            </button>
          )}
        </div>
      </header>

      <PullToRefresh onRefresh={refresh}>
      <main className="px-4 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {!loaded ? (
          <ListSkeleton />
        ) : (
          <>
            {pending.length === 0 && completed.length === 0 && (
              <div className="item-enter flex flex-col items-center gap-2 pb-8 pt-6 text-center">
                <ShoppingCartSimple size={36} weight="thin" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                  Adicione o primeiro item abaixo
                </p>
              </div>
            )}
            <div
              className="list-card overflow-hidden rounded-[14px]"
              style={{ background: 'var(--bg-elevated)' }}
            >
              {pending.map((item, i) => (
                <div key={item.id} className="item-enter">
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
                <div
                  className="list-card overflow-hidden rounded-[14px]"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  {completed.map((item, i) => (
                    <div key={item.id} className="item-enter">
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
      </PullToRefresh>
    </div>
  )
}

function Separator() {
  return <div style={{ height: '0.5px', background: 'var(--separator)', marginLeft: '52px' }} />
}

function ListSkeleton() {
  const widths = ['55%', '70%', '40%']
  return (
    <div className="list-card overflow-hidden rounded-[14px]" style={{ background: 'var(--bg-elevated)' }}>
      {widths.map((w, i) => (
        <div key={i}>
          {i > 0 && <Separator />}
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="skeleton-block h-[26px] w-[26px] shrink-0 rounded-full" />
            <div className="skeleton-block h-[15px] rounded-full" style={{ width: w }} />
          </div>
        </div>
      ))}
    </div>
  )
}
