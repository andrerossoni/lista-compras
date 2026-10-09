import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Basket, CaretRight } from '@phosphor-icons/react'
import { supabase, type ShoppingItem } from './lib/supabase'
import ItemRow from './components/ItemRow'
import NewItemRow from './components/NewItemRow'
import ProgressRing from './components/ProgressRing'
import PullToRefresh from './components/PullToRefresh'

export default function App() {
  const [itemsById, setItemsById] = useState<Record<string, ShoppingItem>>({})
  const [loaded, setLoaded] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
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

  // A confirmação de "limpar" se desarma sozinha; nada de modal para isso.
  useEffect(() => {
    if (!confirmingClear) return
    const timer = setTimeout(() => setConfirmingClear(false), 3500)
    return () => clearTimeout(timer)
  }, [confirmingClear])

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
    setConfirmingClear(false)
    setItemsById((prev) => {
      const next = { ...prev }
      for (const id of ids) delete next[id]
      return next
    })
    const { error } = await supabase.from('shopping_items').delete().eq('completed', true)
    if (error) console.error(error)
  }

  const total = pending.length + completed.length
  const empty = total === 0

  return (
    <div className="relative z-1 min-h-dvh">
      <header
        className="sticky top-0 z-20 backdrop-blur-xl backdrop-saturate-150"
        style={{
          background: 'var(--header-bg)',
          paddingTop: 'env(safe-area-inset-top)',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <div className="mx-auto flex max-w-[34rem] items-center gap-4 px-5 pb-3.5 pt-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[30px] font-semibold leading-none tracking-[-0.035em]">Mercado</h1>
            <p
              className="tabular mt-1.5 text-[13px] font-medium tracking-[-0.005em]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {!loaded
                ? ' '
                : empty
                  ? 'Nada na lista'
                  : pending.length === 0
                    ? 'Tudo no carrinho'
                    : completed.length > 0
                      ? `${completed.length} de ${total} no carrinho`
                      : `${total} ${total === 1 ? 'item para pegar' : 'itens para pegar'}`}
            </p>
          </div>
          {loaded && !empty && <ProgressRing done={completed.length} total={total} />}
        </div>
      </header>

      <PullToRefresh onRefresh={refresh}>
        <main
          className="mx-auto max-w-[34rem] px-5 pt-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 40px)' }}
        >
          {!loaded ? (
            <ListSkeleton />
          ) : (
            <>
              {empty && <EmptyState />}

              <section className="card overflow-hidden" aria-label="Itens para pegar">
                <ul className="rows">
                  {pending.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={toggleItem}
                      onDelete={deleteItem}
                      onEdit={editItem}
                    />
                  ))}
                </ul>
                <div className={`relative ${pending.length > 0 ? 'sep-top' : ''}`}>
                  <NewItemRow onAdd={addItem} />
                </div>
              </section>

              {completed.length > 0 && (
                <section className="mt-8" aria-label="Itens concluídos">
                  <div className="mb-2.5 flex items-center justify-between gap-3 px-1.5">
                    <button
                      onClick={() => setShowCompleted((v) => !v)}
                      aria-expanded={showCompleted}
                      className="tabular -m-1 flex items-center gap-1 p-1 text-[13px] font-semibold tracking-[-0.005em] transition-opacity active:opacity-60"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <CaretRight
                        size={12}
                        weight="bold"
                        style={{
                          transform: showCompleted ? 'rotate(90deg)' : 'none',
                          transition: 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                      />
                      Concluídos · {completed.length}
                    </button>
                    <button
                      onClick={() => (confirmingClear ? clearCompleted() : setConfirmingClear(true))}
                      className="-m-1 p-1 text-[13px] font-semibold tracking-[-0.005em] transition-colors active:opacity-60"
                      style={{ color: confirmingClear ? 'var(--danger)' : 'var(--text-secondary)' }}
                    >
                      {confirmingClear ? 'Confirmar' : 'Limpar'}
                    </button>
                  </div>

                  {showCompleted && (
                    <div className="card item-enter overflow-hidden">
                      <ul className="rows">
                        {completed.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            onToggle={toggleItem}
                            onDelete={deleteItem}
                            onEdit={editItem}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </PullToRefresh>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="item-enter flex flex-col items-center gap-3 pb-9 pt-10 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: 'var(--accent-soft)' }}
      >
        <Basket size={26} weight="duotone" style={{ color: 'var(--accent)' }} />
      </span>
      <div>
        <p className="text-[16px] font-semibold tracking-[-0.01em]">Lista vazia</p>
        <p className="mt-0.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          Escreva abaixo e aperte Enter
        </p>
      </div>
    </div>
  )
}

function ListSkeleton() {
  const widths = ['58%', '72%', '41%']
  return (
    <div className="card overflow-hidden">
      <ul className="rows">
        {widths.map((w, i) => (
          <li key={i} className="relative flex items-center gap-3.5 px-4 py-3">
            <div className="skeleton-block h-[25px] w-[25px] shrink-0 rounded-full" />
            <div className="skeleton-block h-[14px] rounded-full" style={{ width: w }} />
          </li>
        ))}
      </ul>
    </div>
  )
}
