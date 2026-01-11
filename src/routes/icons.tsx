import { useState, useMemo } from 'react'
import { EVENT_ICON_MAP, EVENT_MAP } from '@/constants'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, CancelCircleIcon, LayersIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

const ICON_NAME_OVERRIDES: Record<string, string> = {
  '333bf': '3BLD',
  '444bf': '4BLD',
  '555bf': '5BLD',
  '333mbf': 'MBLD',
  '333fm': 'FMC',
  '333oh': '3x3 OH',
}

const HIDDEN_ICONS = ['333ft']
const COPY_FEEDBACK_DURATION = 2000

function IconCard({ 
  icon, 
  eventName, 
  isMultiSelectMode, 
  onToggleSelect
}: { 
  icon: string
  eventName: string
  isMultiSelectMode: boolean
  onToggleSelect: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleClick = () => {
    if (isMultiSelectMode) {
      onToggleSelect()
    } else {
      handleCopy()
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(icon)
      setCopied(true)
      toast.success(`Copied ${eventName}`)
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`group relative flex flex-col items-center justify-center p-6 rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-card hover:bg-accent hover:border-primary/30 hover:shadow-md ${
        copied ? 'bg-primary/5 border-primary/50 shadow-lg' : ''
      }`}
    >
      {!isMultiSelectMode && (
        <div className="absolute top-2 right-2 z-10">
          {copied ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium shadow-md animate-in zoom-in-95 fade-in-0">
              <span>Copied</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/95 backdrop-blur-sm border text-muted-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" />
              <span>Copy</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-center w-full h-24 mb-4">
        <span
          className={`text-7xl transition-all duration-300 ${
            copied ? 'scale-105 text-primary' : 'group-hover:scale-110'
          }`}
          style={{
            fontFamily: 'cubing-icons, sans-serif',
          }}
        >
          {icon}
        </span>
      </div>

      <div className="w-full">
        <p className={`text-sm font-medium text-center truncate w-full transition-colors ${
          copied ? 'text-primary' : ''
        }`}>
          {eventName}
        </p>
      </div>
    </button>
  )
}

export function IconsPage() {
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const allIcons = useMemo(() => 
    Object.entries(EVENT_ICON_MAP)
      .filter(([eventId]) => !HIDDEN_ICONS.includes(eventId))
      .map(([eventId, icon]) => {
        const defaultName = EVENT_MAP[eventId] || eventId
        const displayName = ICON_NAME_OVERRIDES[eventId] || defaultName
        return {
          eventId,
          icon,
          eventName: displayName,
        }
      })
      .sort((a, b) => a.eventName.localeCompare(b.eventName)),
    []
  )

  const iconMap = useMemo(() => {
    return new Map(allIcons.map(({ eventId, icon }) => [eventId, icon]))
  }, [allIcons])

  const selectedIconsString = useMemo(() => {
    return selectedIds.map(eventId => iconMap.get(eventId) || '').join('')
  }, [selectedIds, iconMap])

  const addIcon = (eventId: string) => {
    setSelectedIds(prev => [...prev, eventId])
  }

  const handleCopySelected = async () => {
    if (selectedIds.length === 0) return

    try {
      await navigator.clipboard.writeText(selectedIconsString)
      const count = selectedIds.length
      toast.success(`Copied ${count} ${count === 1 ? 'icon' : 'icons'}`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const toggleMultiSelect = () => {
    if (multiSelectMode) {
      setSelectedIds([])
    }
    setMultiSelectMode(!multiSelectMode)
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Icons</h1>
            <p className="text-muted-foreground mt-1">
              Browse and copy icons for the cubing-icons font
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant={multiSelectMode ? 'outline' : 'default'}
              onClick={toggleMultiSelect}
              className="gap-2"
            >
              {multiSelectMode ? (
                'Exit multi-select'
              ) : (
                <>
                  <HugeiconsIcon icon={LayersIcon} strokeWidth={2} className="size-4" />
                  Multi-select
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {multiSelectMode && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="gap-1.5 shrink-0"
                >
                  <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} className="size-4" />
                  Clear
                </Button>
                <Button
                  onClick={handleCopySelected}
                  size="sm"
                  className="gap-1.5 shrink-0"
                >
                  <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-4" />
                  Copy
                </Button>
                <div
                  className="flex-1 text-2xl leading-relaxed overflow-x-auto py-2"
                  style={{ fontFamily: 'cubing-icons, sans-serif' }}
                >
                  {selectedIconsString}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select multiple icons
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {allIcons.map(({ eventId, icon, eventName }) => (
          <IconCard 
            key={eventId} 
            icon={icon} 
            eventName={eventName}
            isMultiSelectMode={multiSelectMode}
            onToggleSelect={() => addIcon(eventId)}
          />
        ))}
      </div>
    </div>
  )
}
