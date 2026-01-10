import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface ProgressButtonProps extends React.ComponentProps<typeof Button> {
  progress?: number
  isProcessing?: boolean
}

export function ProgressButton({ progress, isProcessing, children, className, ...props }: ProgressButtonProps) {
  return <Button {...props} disabled={isProcessing || props.disabled} className={`relative overflow-hidden ${className || ''}`}>{isProcessing && progress !== undefined && <Progress value={progress} className="absolute inset-0 h-full bg-transparent *:data-[slot=progress-indicator]:bg-black/20" />}<span className="relative">{children}</span></Button>
}
