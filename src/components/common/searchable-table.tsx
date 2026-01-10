import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createSearchFilter } from '@/utils/search'

interface SearchableTableProps<T> {
  title: string
  description: string
  data: T[]
  isLoading: boolean
  searchPlaceholder: string
  getSearchableText: (item: T) => string
  columns: Array<{ header: string; render: (item: T) => React.ReactNode; className?: string }>
  emptyMessage?: string
  searchWidth?: string
}

export function SearchableTable<T>({ title, description, data, isLoading, searchPlaceholder, getSearchableText, columns, emptyMessage = 'No items found', searchWidth = 'w-64' }: SearchableTableProps<T>) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => data.filter(createSearchFilter(search, getSearchableText)), [data, search, getSearchableText])
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div>
          <div className={`relative ${searchWidth}`}>
            <HugeiconsIcon icon={Search01Icon} className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder={searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center p-8"><Spinner className="h-8 w-8" /></div> : (
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>{columns.map((col, i) => <TableHead key={i} className={col.className}>{col.header}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {filtered.length ? filtered.map((item, i) => <TableRow key={i}>{columns.map((col, j) => <TableCell key={j} className={col.className}>{col.render(item)}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="text-center h-24">{emptyMessage}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
