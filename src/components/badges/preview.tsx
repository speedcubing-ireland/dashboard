import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBadgeStore } from '@/stores/badge-config'
import { generateSingleBadge } from '@/services/pdf/generator'
import { buildPersonSchedule } from '@/utils/schedule'
import { loadFlagBytes, extractUrl, generateQRBytes, prepareImages } from '@/services/assets'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick02Icon, ArrowDown01Icon, Refresh01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/utils/cn'
import type { PersonScheduleInfo } from '@/types/wcif'

export function BadgePreview({ refreshTrigger }: { refreshTrigger?: number }) {
  const { wcif, activities, config } = useBadgeStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const accepted = useMemo(() => wcif?.persons.filter((p) => p.registration?.status === 'accepted') ?? [], [wcif])

  const filtered = useMemo(() => {
    if (!query) return accepted
    const q = query.toLowerCase()
    return accepted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.wcaId?.toLowerCase().includes(q) ||
        p.countryIso2.toLowerCase().includes(q) ||
        p.registrantId.toString().includes(q)
    )
  }, [accepted, query])

  const selected = useMemo(() => (selectedId ? accepted.find((p) => p.registrantId === selectedId) : null), [accepted, selectedId])

  const personInfo: PersonScheduleInfo | null = useMemo(
    () => (selected && activities ? buildPersonSchedule(selected, activities) : null),
    [selected, activities]
  )

  useEffect(() => { if (accepted.length > 0 && selectedId === null) setSelectedId(accepted[0].registrantId) }, [accepted, selectedId])
  useEffect(() => { if (selectedId !== null && personInfo && !isGenerating) generatePreview() }, [selectedId, refreshTrigger])

  const generatePreview = async () => {
    if (!personInfo || !wcif) return

    setIsGenerating(true)
    try {
      const flagMap = new Map<string, Uint8Array>()
      if (personInfo.countryCode) {
        try { flagMap.set(personInfo.countryCode, await loadFlagBytes(personInfo.countryCode)) } catch {}
      }

      let qrCode: Uint8Array | undefined
      if (config.showWcaLiveQrCode && config.qrCodeText) {
        const url = extractUrl(config.qrCodeText)
        if (url) {
          try { qrCode = await generateQRBytes(url, 200) } catch {}
        }
      }

      const images = await prepareImages(config, flagMap, qrCode)
      const pdfDoc = await generateSingleBadge(personInfo, config, {
        background: images.background,
        logo: images.logo,
        wcaLogo: images.wcaLogo,
        flag: flagMap.get(personInfo.countryCode),
        qrCode: images.qrCode,
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(url)
    } catch {
      toast.error('Failed to generate preview')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  if (!wcif) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Badge Preview</CardTitle>
          <CardDescription>Load WCIF data to preview badges</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Badge Preview</CardTitle>
            <CardDescription>Select a competitor to preview their badge</CardDescription>
          </div>
          {selected && (
            <Button variant="outline" size="icon" onClick={generatePreview} disabled={isGenerating} title="Refresh">
              <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
              {selected ? `${selected.name} ${selected.wcaId ? `(${selected.wcaId})` : '(Newcomer)'}` : 'Select competitor...'}
              <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search..." value={query} onValueChange={setQuery} />
              <CommandList>
                <CommandEmpty>No competitors found.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((p) => (
                    <CommandItem
                      key={p.registrantId}
                      value={`${p.name} ${p.wcaId || ''} ${p.countryIso2}`}
                      onSelect={() => {
                        setSelectedId(p.registrantId)
                        setOpen(false)
                        setQuery('')
                      }}
                    >
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2}
                        className={cn('mr-2 size-4', selectedId === p.registrantId ? 'opacity-100' : 'opacity-0')}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.wcaId || 'Newcomer'} • {p.countryIso2} • ID {p.registrantId}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {isGenerating && <div className="text-sm text-muted-foreground text-center py-4">Generating preview...</div>}

        {previewUrl && !isGenerating && (
          <div className="border rounded-lg overflow-hidden bg-muted/50">
            <iframe src={previewUrl} className="w-full h-[560px]" title="Badge Preview" />
          </div>
        )}

        {!selected && !isGenerating && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Select a competitor above to preview their badge</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
