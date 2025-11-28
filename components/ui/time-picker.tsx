'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string; // Format: "HH:mm" (24-hour for internal storage)
  onChange: (value: string) => void; // Receives "HH:mm" format
  placeholder?: string;
  className?: string;
}

export default function TimePicker({ value, onChange, placeholder = "Select time...", className }: TimePickerProps) {
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  // Initialize component from value prop
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      const hour24 = parseInt(h, 10);
      const minute = parseInt(m, 10);

      let hour12 = hour24;
      let period = 'AM' as 'AM' | 'PM';

      if (hour24 === 0) {
        hour12 = 12;
        period = 'AM';
      } else if (hour24 < 12) {
        hour12 = hour24;
        period = 'AM';
      } else if (hour24 === 12) {
        hour12 = 12;
        period = 'PM';
      } else {
        hour12 = hour24 - 12;
        period = 'PM';
      }

      setHours(hour12.toString());
      setMinutes(minute.toString().padStart(2, '0'));
      setAmpm(period);
    } else {
      // Reset to default if no value
      setHours('');
      setMinutes('');
      setAmpm('AM');
    }
  }, [value]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = e.target.value;
    setHours(newHours);

    if (newHours && minutes) {
      updateTime(newHours, minutes, ampm);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = e.target.value;
    setMinutes(newMinutes);

    if (hours && newMinutes) {
      updateTime(hours, newMinutes, ampm);
    }
  };

  const handleAmpmChange = (newAmpm: 'AM' | 'PM') => {
    setAmpm(newAmpm);

    if (hours && minutes) {
      updateTime(hours, minutes, newAmpm);
    }
  };

  const updateTime = (hour12: string, minute: string, period: 'AM' | 'PM') => {
    if (!hour12 || !minute) return;

    let hour24: number;
    const hour12Num = parseInt(hour12, 10);
    const minuteNum = parseInt(minute, 10);

    if (period === 'AM') {
      if (hour12Num === 12) {
        hour24 = 0;
      } else {
        hour24 = hour12Num;
      }
    } else {
      if (hour12Num === 12) {
        hour24 = 12;
      } else {
        hour24 = hour12Num + 12;
      }
    }

    const time24 = `${hour24.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;
    onChange(time24);
  };

  return (
    <div className={cn("flex gap-1", className)}>
      {/* Hours input */}
      <Input
        type="number"
        min="1"
        max="12"
        placeholder="12"
        value={hours}
        onChange={handleHoursChange}
        className="w-12 h-7 text-xs text-center"
      />

      {/* Colon separator */}
      <span className="text-xs font-medium leading-7">:</span>

      {/* Minutes input */}
      <Input
        type="number"
        min="0"
        max="59"
        placeholder="00"
        value={minutes}
        onChange={handleMinutesChange}
        className="w-12 h-7 text-xs text-center"
      />

      {/* AM/PM selector */}
      <Select value={ampm} onValueChange={(value: 'AM' | 'PM') => handleAmpmChange(value)}>
        <SelectTrigger className="w-14 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}