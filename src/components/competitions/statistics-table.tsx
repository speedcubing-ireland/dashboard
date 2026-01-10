import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { StatsData } from '@/hooks/use-statistics'

const EVENT_COLS = [
  '3x3 ', '2x2 ', '4x4 ', '5x5 ', '6x6 ', '7x7 ',
  '3BLD', 'FMC ', '3OH ', 'Clk ', 'Mega', 'Pyr ', 'Skb ', 'SQ-1',
  '4BLD', '5BLD', 'MBLD',
]

interface StatisticsTableProps {
  data: StatsData
  showRawNumbers: boolean
  onToggleRawNumbers: (checked: boolean) => void
}

export function StatisticsTable({ data, showRawNumbers, onToggleRawNumbers }: StatisticsTableProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Competition Overview</CardTitle>
          <CardDescription>Upcoming Irish competitions and registration status</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Competition</TableHead>
                <TableHead>Reg Opens</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead className="text-right">Registrations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.compData.map((comp, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{comp.Name}</TableCell>
                  <TableCell className="text-muted-foreground">{comp['Reg Start']}</TableCell>
                  <TableCell>{comp['Start Date']}</TableCell>
                  <TableCell className="text-muted-foreground">{comp.Location}</TableCell>
                  <TableCell className="text-right font-mono">{comp.Competitors}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Rounds</CardTitle>
          <CardDescription>Number of rounds per event at each competition</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Competition</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Events</TableHead>
                {EVENT_COLS.map((e) => (
                  <TableHead key={e} className="text-center px-2 min-w-[4ch]">{e.trim()}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rounds.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.Name}</TableCell>
                  <TableCell className="text-center font-mono">{row.Rounds}</TableCell>
                  <TableCell className="text-center font-mono">{row.Events}</TableCell>
                  {EVENT_COLS.map((e) => (
                    <TableCell key={e} className="text-center text-muted-foreground">{row[e] || ''}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Event Signups</CardTitle>
            <CardDescription>
              {showRawNumbers ? 'Raw registration counts per event' : 'Percentage of competitors per event'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="raw-toggle" className="text-sm text-muted-foreground">Raw numbers</Label>
            <Switch
              id="raw-toggle"
              checked={showRawNumbers}
              onCheckedChange={onToggleRawNumbers}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Competition</TableHead>
                {EVENT_COLS.map((e) => (
                  <TableHead key={e} className="text-center px-2 min-w-[4ch]">{e.trim()}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(showRawNumbers ? data.rawSignups : data.signups).map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.Name}</TableCell>
                  {EVENT_COLS.map((e) => (
                    <TableCell key={e} className="text-center text-muted-foreground">{row[e] || ''}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
