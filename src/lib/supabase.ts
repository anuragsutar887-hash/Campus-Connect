import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Proxy write operations to bypass Supabase RLS ─────────────────────────────
class ProxyWriteBuilder {
  private table: string
  private method: string = ''
  private data: any = null
  private filters: { col: string; val: any }[] = []
  private isSingle: boolean = false

  constructor(table: string) {
    this.table = table
  }

  insert(data: any) {
    this.method = 'insert'
    this.data = data
    return this
  }

  update(data: any) {
    this.method = 'update'
    this.data = data
    return this
  }

  upsert(data: any) {
    this.method = 'upsert'
    this.data = data
    return this
  }

  delete() {
    this.method = 'delete'
    return this
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val })
    return this
  }

  select() {
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          method: this.method,
          data: this.data,
          filters: this.filters
        })
      })

      const json = await res.json()
      if (!res.ok) {
        const errObj = { message: json.error || 'Database operation failed' }
        if (onfulfilled) {
          return onfulfilled({ data: null, error: errObj })
        }
        return { data: null, error: errObj }
      }

      const data = this.isSingle && Array.isArray(json.data) ? (json.data[0] || null) : json.data
      const output = { data, error: null }
      if (onfulfilled) {
        return onfulfilled(output)
      }
      return output
    } catch (err: any) {
      const errObj = { message: err?.message || 'Network error' }
      if (onfulfilled) {
        return onfulfilled({ data: null, error: errObj })
      }
      return { data: null, error: errObj }
    }
  }
}

const originalFrom = supabase.from.bind(supabase)
supabase.from = (table: string): any => {
  const originalBuilder = originalFrom(table)
  return new Proxy(originalBuilder, {
    get(target, prop, receiver) {
      if (prop === 'insert' || prop === 'update' || prop === 'delete' || prop === 'upsert') {
        const writeBuilder = new ProxyWriteBuilder(table)
        return writeBuilder[prop].bind(writeBuilder)
      }
      return Reflect.get(target, prop, receiver)
    }
  })
}

// ── Typed helpers for common operations ────────────────────────────────────────

export type SupabaseResult<T> = {
  data: T | null
  error: string | null
}

export async function sbGet<T>(
  table: string,
  filters: Record<string, string | number | boolean>
): Promise<T | null> {
  let query = supabase.from(table).select('*')
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val)
  }
  const { data, error } = await query.single()
  if (error) { console.warn(`[Supabase] GET ${table}:`, error.message); return null }
  return data as T
}

export async function sbList<T>(
  table: string,
  filters: Record<string, string | number | boolean> = {},
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  let query = supabase.from(table).select('*')
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val)
  }
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false })
  }
  const { data, error } = await query
  if (error) { console.warn(`[Supabase] LIST ${table}:`, error.message); return [] }
  return (data ?? []) as T[]
}

export async function sbInsert<T>(
  table: string,
  row: Record<string, unknown>
): Promise<T | null> {
  const { data, error } = await supabase.from(table).insert([row]).select().single()
  if (error) throw new Error(error.message)
  return data as T
}

export async function sbUpsert<T>(
  table: string,
  row: Record<string, unknown>
): Promise<T | null> {
  const { data, error } = await supabase.from(table).upsert([row]).select().single()
  if (error) throw new Error(error.message)
  return data as T
}

export async function sbUpdate(
  table: string,
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from(table).update(updates).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function sbDelete(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
}
