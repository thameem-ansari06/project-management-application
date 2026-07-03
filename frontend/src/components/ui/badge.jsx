import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "border-transparent bg-primary text-primary-foreground shadow",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "destructive" && "border-transparent bg-destructive text-foreground",
        variant === "outline" && "border border-border text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
