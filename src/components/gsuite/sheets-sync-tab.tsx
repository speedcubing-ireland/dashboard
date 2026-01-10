import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useGSuiteAuthStore } from '@/stores/gsuite-auth'
import { groupKeys } from '@/hooks/use-groups'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  executeSync,
  generateSyncPreview,
  loadSheetData,
  ROLES_DB_SHEET,
  TEAM_CONFIG_SHEET,
} from '@/services/gsuite/sync-service'
import { getErrorMessage } from '@/utils/error'
import type {
  MembershipChange,
  RoleAssignment,
  SyncPreview,
  SyncResult,
  TeamConfig,
} from '@/types/gsuite'
import { CheckmarkCircle01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

type SyncStep = 'configure' | 'preview' | 'confirm' | 'result'
const STEPS: SyncStep[] = ['configure', 'preview', 'confirm', 'result']

export function SheetsSyncTab() {
  const { accessToken } = useGSuiteAuthStore()
  const queryClient = useQueryClient()
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [step, setStep] = useState<SyncStep>('configure')
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [teams, setTeams] = useState<TeamConfig[]>([])
  const [roles, setRoles] = useState<RoleAssignment[]>([])
  const [preview, setPreview] = useState<SyncPreview | null>(null)
  const [result, setResult] = useState<SyncResult | null>(null)
  
  const [syncOpts, setSyncOpts] = useState({ additions: true, removals: false, updates: true })

  const loadPreview = async () => {
    if (!accessToken || !spreadsheetId) return
    setIsLoading(true)
    try {
      const id = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || spreadsheetId
      const { teams: lTeams, roles: lRoles } = await loadSheetData(accessToken, id)
      setTeams(lTeams)
      setRoles(lRoles)
      setPreview(await generateSyncPreview(accessToken, id))
      setStep('preview')
      toast.success('Preview generated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load preview')
    } finally {
      setIsLoading(false)
    }
  }

  const runSync = async () => {
    if (!accessToken || !preview) return
    setIsSyncing(true)
    try {
      const res = await executeSync(accessToken, preview, syncOpts)
      setResult(res)
      const affectedGroupEmails = new Set([
        ...preview.additions.map(c => c.groupEmail),
        ...preview.removals.map(c => c.groupEmail),
        ...preview.updates.map(c => c.groupEmail),
      ])
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
      affectedGroupEmails.forEach(groupEmail => {
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupEmail) })
        queryClient.invalidateQueries({ queryKey: ['gsuite', 'groups', groupEmail, 'members'] })
      })
      
      setStep('result')
      toast[res.success ? 'success' : 'warning'](res.success ? 'Sync completed' : 'Sync completed with errors')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Sync failed'))
    } finally {
      setIsSyncing(false)
    }
  }

  const reset = () => {
    setStep('configure')
    setPreview(null)
    setResult(null)
    setTeams([])
    setRoles([])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step === s ? 'bg-primary text-primary-foreground' : 
              i < STEPS.indexOf(step) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm capitalize ${step === s ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < 3 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {step === 'configure' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Spreadsheet Configuration</CardTitle>
              <CardDescription>Enter Google Sheets URL or ID</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button onClick={loadPreview} disabled={!spreadsheetId || isLoading} className="w-full">
                {isLoading ? <><Spinner className="mr-2 h-4 w-4" /> Loading...</> : 'Load & Preview'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expected Format</CardTitle>
              <CardDescription>Required sheets structure</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="teams">
                  <AccordionTrigger>{TEAM_CONFIG_SHEET}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Columns: Team Name, Short Name, Leader Title, Contact, Groups
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="roles">
                  <AccordionTrigger>{ROLES_DB_SHEET}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Columns: Person, Role, Status, Start Date, Finish Date
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Teams" value={teams.length} />
            <StatsCard title="Roles" value={roles.length} />
            <StatsCard title="Affected Groups" value={new Set([...preview.additions, ...preview.removals, ...preview.updates].map(c => c.groupEmail)).size} />
            <StatsCard title="Unchanged" value={preview.unchanged} />
          </div>

          {preview.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Errors Found</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside">{preview.errors.map(e => <li key={e}>{e}</li>)}</ul>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="additions">
            <TabsList>
              <TabsTrigger value="additions">Additions <Badge variant="secondary" className="ml-2">{preview.additions.length}</Badge></TabsTrigger>
              <TabsTrigger value="removals">Removals <Badge variant="secondary" className="ml-2">{preview.removals.length}</Badge></TabsTrigger>
              <TabsTrigger value="updates">Updates <Badge variant="secondary" className="ml-2">{preview.updates.length}</Badge></TabsTrigger>
            </TabsList>
            <TabsContent value="additions"><ChangesTable changes={preview.additions} emptyMsg="No members to add" /></TabsContent>
            <TabsContent value="removals"><ChangesTable changes={preview.removals} emptyMsg="No members to remove" /></TabsContent>
            <TabsContent value="updates"><ChangesTable changes={preview.updates} emptyMsg="No role updates" /></TabsContent>
          </Tabs>

          <div className="flex gap-4">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button onClick={() => setStep('confirm')} disabled={!preview.additions.length && !preview.removals.length && !preview.updates.length}>Continue</Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="grid gap-6">
          <Alert><AlertTitle>Review Changes</AlertTitle><AlertDescription>Select operations to perform.</AlertDescription></Alert>
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <ConfigRow label="Add members" count={preview?.additions.length} checked={syncOpts.additions} onChange={c => setSyncOpts(s => ({ ...s, additions: c }))} />
              <ConfigRow label="Update roles" count={preview?.updates.length} checked={syncOpts.updates} onChange={c => setSyncOpts(s => ({ ...s, updates: c }))} />
              <ConfigRow label="Remove members" count={preview?.removals.length} checked={syncOpts.removals} onChange={c => setSyncOpts(s => ({ ...s, removals: c }))} destructive />
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('preview')}>Back</Button>
              <Button onClick={runSync} disabled={isSyncing || (!syncOpts.additions && !syncOpts.removals && !syncOpts.updates)} variant={syncOpts.removals ? 'destructive' : 'default'}>
                {isSyncing ? <><Spinner className="mr-2 h-4 w-4" /> Syncing...</> : 'Apply Changes'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 'result' && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={result.success ? CheckmarkCircle01Icon : AlertCircleIcon} className={`h-5 w-5 ${result.success ? 'text-green-500' : 'text-yellow-500'}`} />
              Sync Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <ResultStat label="Added" value={result.added} color="text-green-600" />
              <ResultStat label="Updated" value={result.updated} color="text-blue-600" />
              <ResultStat label="Removed" value={result.removed} color="text-red-600" />
            </div>
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Errors ({result.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside max-h-40 overflow-y-auto">{result.errors.map(e => <li key={e}>{e}</li>)}</ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter><Button onClick={reset} className="w-full">Start New Sync</Button></CardFooter>
        </Card>
      )}
    </div>
  )
}

function StatsCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{title}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader>
    </Card>
  )
}

function ChangesTable({ changes, emptyMsg }: { changes: MembershipChange[]; emptyMsg: string }) {
  if (!changes.length) return <Card><CardContent className="py-8 text-center text-muted-foreground">{emptyMsg}</CardContent></Card>
  return (
    <Card>
      <Table>
        <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Group</TableHead><TableHead>Role</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
        <TableBody>
          {changes.map((c, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{c.memberEmail}</TableCell>
              <TableCell>{c.groupEmail}</TableCell>
              <TableCell>
                {c.action === 'add' && <Badge className="bg-green-500/10 text-green-600">{c.newRole}</Badge>}
                {c.action === 'remove' && <Badge variant="secondary">{c.currentRole}</Badge>}
                {c.action === 'update' && <span className="flex gap-2"><Badge variant="secondary">{c.currentRole}</Badge>→<Badge className="bg-blue-500/10 text-blue-600">{c.newRole}</Badge></span>}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{c.source || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function ConfigRow({ label, count = 0, checked, onChange, destructive }: { label: string; count?: number; checked: boolean; onChange: (v: boolean) => void; destructive?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border p-4 ${destructive ? 'border-destructive/50' : ''}`}>
      <div className="grid gap-1">
        <Label className={`text-base ${destructive ? 'text-destructive' : ''}`}>{label}</Label>
        <p className="text-sm text-muted-foreground">{count} affected</p>
      </div>
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} disabled={!count} />
    </div>
  )
}

function ResultStat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="rounded-lg border p-4"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
}

