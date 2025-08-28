import { Button } from "@/components/ui/button"
import { ArrowLeftRight } from "lucide-react"

interface SwapButtonProps {
  onClick: () => void
}

export function SwapButton({ onClick }: SwapButtonProps) {
  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        size="icon"
        onClick={onClick}
        className="rounded-full bg-background/50 border-border/50 hover:bg-accent/50"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
