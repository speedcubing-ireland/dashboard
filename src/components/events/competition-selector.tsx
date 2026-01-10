import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getAvailableCompetitions } from '@/services/competition-data'
import type { APICompetition } from '@/types/competition'

interface CompetitionSelectorProps {
  competitions: APICompetition[]
  selected: string[]
  searchTerm: string
  onSearchChange: (term: string) => void
  onToggle: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

export function CompetitionSelector({
  competitions,
  selected,
  searchTerm,
  onSearchChange,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: CompetitionSelectorProps) {
  const available = getAvailableCompetitions(competitions)
  const filtered = available.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Select Competitions</CardTitle>
        <CardDescription>Choose past competitions to analyze</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            disabled={selected.length === competitions.length}
            className="flex-1"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeselectAll}
            disabled={selected.length === 0}
            className="flex-1"
          >
            Clear
          </Button>
        </div>

        <Input
          placeholder="Search competitions..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <Separator />

        <ScrollArea className="h-80">
          <div className="space-y-2 pr-4">
            {filtered.map((comp) => (
              <div key={comp.id} className="flex items-center gap-3 py-1">
                <Checkbox
                  id={comp.id}
                  checked={selected.includes(comp.id)}
                  onCheckedChange={() => onToggle(comp.id)}
                />
                <Label htmlFor={comp.id} className="cursor-pointer text-sm leading-tight flex-1">
                  {comp.name}
                </Label>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No competitions found
              </p>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selected.length}</span> of {competitions.length} selected
        </p>
      </CardContent>
    </Card>
  )
}
