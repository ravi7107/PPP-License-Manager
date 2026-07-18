import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface LookupOption {
  id: number;
  name: string;
  code?: string | null;
}

interface LookupComboboxProps {
  options: LookupOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  onCreate?: (name: string) => Promise<void> | void;
  creating?: boolean;
}

// Searchable select that supports inline creation of a new lookup value (department/entity/client),
// so users can add new options (e.g. PTech, EC, AEC, or a new client) without leaving the form.
export function LookupCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  emptyLabel = 'None',
  disabled,
  onCreate,
  creating,
}: LookupComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => options.find((o) => String(o.id) === value), [options, value]);

  const canCreate = Boolean(
    onCreate && search.trim().length > 0 && !options.some((o) => o.name.toLowerCase() === search.trim().toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === '' ? 'opacity-100' : 'opacity-0')} />
                {emptyLabel}
              </CommandItem>
              {options
                .filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()))
                .map((option) => (
                  <CommandItem
                    key={option.id}
                    value={String(option.id)}
                    onSelect={() => {
                      onChange(String(option.id));
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', String(option.id) === value ? 'opacity-100' : 'opacity-0')}
                    />
                    {option.name}
                    {option.code ? <span className="ml-2 text-xs text-muted-foreground">{option.code}</span> : null}
                  </CommandItem>
                ))}
            </CommandGroup>
            {canCreate ? (
              <CommandGroup>
                <CommandItem
                  value={`__create__${search}`}
                  disabled={creating}
                  onSelect={async () => {
                    await onCreate?.(search.trim());
                    setSearch('');
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? 'Adding…' : `Add "${search.trim()}"`}
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
