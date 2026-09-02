"use client"

import { CheckIcon, ChevronDownIcon } from "lucide-react"
import * as React from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ComboboxOption = {
  value: string
  label: string
}

export type ComboboxGroup = {
  /** Omit or leave blank for a flat, ungrouped list. */
  label?: string
  options: ComboboxOption[]
}

type ComboboxProps = {
  groups: ComboboxGroup[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  id?: string
}

function Combobox({
  groups,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  disabled = false,
  className,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(
    () =>
      groups
        .flatMap((group) => group.options)
        .find((option) => option.value === value),
    [groups, value],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-slot="combobox-trigger"
          className={cn(
            "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span
            className={cn(
              "line-clamp-1 flex items-center gap-2",
              !selected && "text-muted-foreground",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups.map((group, index) => (
              <CommandGroup
                key={group.label ?? index}
                heading={group.label}
              >
                {group.options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                  >
                    {option.label}
                    <CheckIcon
                      className={cn(
                        "ml-auto size-4",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox }
