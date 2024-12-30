'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets = [
  {
    label: 'Last 7 days',
    value: '7d',
    getRange: () => ({
      from: addDays(new Date(), -7),
      to: new Date(),
    }),
  },
  {
    label: 'Last 14 days',
    value: '14d',
    getRange: () => ({
      from: addDays(new Date(), -14),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    value: '30d',
    getRange: () => ({
      from: addDays(new Date(), -30),
      to: new Date(),
    }),
  },
  {
    label: 'Last 90 days',
    value: '90d',
    getRange: () => ({
      from: addDays(new Date(), -90),
      to: new Date(),
    }),
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'LLL dd, y')} -{' '}
                  {format(value.to, 'LLL dd, y')}
                </>
              ) : (
                format(value.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-4 space-y-4">
            <Select
              onValueChange={(value) => {
                const preset = presets.find((p) => p.value === value);
                if (preset) {
                  onChange(preset.getRange());
                  setIsOpen(false);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a preset range" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="border-t" />
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 