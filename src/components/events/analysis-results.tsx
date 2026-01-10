import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon } from '@hugeicons/core-free-icons'
import {
  getRegistrationRate,
  type EventAnalysis,
  type RegistrationRateType,
} from '@/services/competition-data'

interface AnalysisResultsProps {
  analysis: EventAnalysis[]
  rateType: RegistrationRateType
  onRateTypeChange: (type: RegistrationRateType) => void
  onCopy: () => void
}

function getRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600'
  if (rate >= 60) return 'text-emerald-600'
  if (rate >= 40) return 'text-blue-600'
  if (rate >= 20) return 'text-purple-600'
  if (rate >= 10) return 'text-orange-600'
  return 'text-red-600'
}

export function AnalysisResults({ analysis, rateType, onRateTypeChange, onCopy }: AnalysisResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Analysis Results</CardTitle>
        <CardDescription>
          Registration rates showing what percentage of attendees register for each event
        </CardDescription>
      </CardHeader>
      <CardContent>
        {analysis.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Select competitions and click "Analyze" to see results
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={rateType} onValueChange={(v) => onRateTypeChange(v as RegistrationRateType)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mean">Mean (Average)</SelectItem>
                  <SelectItem value="median">Median</SelectItem>
                  <SelectItem value="p75">75th Percentile</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onCopy}>
                <HugeiconsIcon icon={Copy01Icon} className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Comps</TableHead>
                  <TableHead className="text-right">Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.map((event) => {
                  const rate = getRegistrationRate(event, rateType)
                  const hasData = event.competitionsWithEvent > 0

                  return (
                    <TableRow key={event.eventId} className={hasData ? '' : 'opacity-50'}>
                      <TableCell className="font-medium">{event.eventName}</TableCell>
                      <TableCell className="text-right">
                        {hasData ? (
                          <span className={`font-medium ${getRateColor(rate)}`}>{rate}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {hasData ? `${event.competitionsWithEvent}/${event.totalCompetitions}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {hasData ? `${event.minRegistrationRate}%-${event.maxRegistrationRate}%` : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
