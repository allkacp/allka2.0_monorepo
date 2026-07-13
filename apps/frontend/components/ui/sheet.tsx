
import type * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-500",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-350",
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  hideOverlay = false,
  onInteractOutside,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  hideOverlay?: boolean
}) {
  const handleInteractOutside = (e: CustomEvent) => {
    // Never close when clicking inside the sidebar
    const target = e.target as Element | null
    if (target?.closest("[data-sidebar-root]")) {
      e.preventDefault()
      return
    }
    onInteractOutside?.(e as any)
  }

  const handlePointerDownOutside = (e: CustomEvent) => {
    const target = e.target as Element | null
    if (target?.closest("[data-sidebar-root]")) {
      e.preventDefault()
      return
    }
    onPointerDownOutside?.(e as any)
  }

  return (
    <SheetPortal>
      {!hideOverlay && <SheetOverlay />}
      <SheetPrimitive.Content
        data-slot="sheet-content"
        onInteractOutside={handleInteractOutside}
        onPointerDownOutside={handlePointerDownOutside}
        data-side={side}
        className={cn(
          // base
          "bg-background fixed z-50 flex flex-col gap-4 shadow-2xl border border-slate-200/80 dark:border-slate-700/80",
          // entry — smooth slide from right (400ms to match custom panels)
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right data-[state=open]:duration-400 data-[state=open]:ease-[cubic-bezier(0.2,0,0,1)]",
          // exit — slide out to the right (300ms to match custom panels)
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right data-[state=closed]:duration-300 data-[state=closed]:ease-in",
          side === "right"  && "right-0 w-full border-l",
          side === "left"   && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top"    && "inset-x-0 top-0 h-auto border-b",
          side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-5 right-5 rounded-lg opacity-100 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:pointer-events-none p-2">
          <XIcon className="size-5 text-slate-600 dark:text-slate-400" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-2 px-6 py-5", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2 px-6 py-5 border-t border-slate-200/80 dark:border-slate-700/80", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold text-foreground dark:text-white", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-slate-600 dark:text-slate-400", className)}
      {...props}
    />
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
