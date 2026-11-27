// Automation Task definition form.
// The definition selects a registered TheGame automation; it does not store
// an agent executor, skill path, schedule, prompt, or workflow implementation.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TaskModalFooter } from './task-modal';
import DatesSubmodal from './submodals/dates-submodal';
import { Task } from '@/types/entities';
import { BUSINESS_STRUCTURE, TaskStatus, TaskType } from '@/types/enums';
import { v4 as uuid } from 'uuid';
import type { Station } from '@/types/type-aliases';
import { Calendar as CalendarIcon } from 'lucide-react';
import { AUTOMATION_DEFINITION_OPTIONS } from '@/workflows/automation/automation-registry';

interface AutomationTaskModalContentProps {
  task?: Task | null;
  allCharacters?: any[];
  onSave: (task: Task) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

const statuses = [
  TaskStatus.CREATED,
  TaskStatus.ON_HOLD,
  TaskStatus.IN_PROGRESS,
  TaskStatus.FINISHING,
  TaskStatus.DONE,
  TaskStatus.FAILED,
];
const stations = Object.values(BUSINESS_STRUCTURE).flatMap((values) => values) as Station[];

export default function AutomationTaskModalContent({
  task,
  allCharacters = [],
  onSave,
  onOpenChange,
}: AutomationTaskModalContentProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [station, setStation] = useState<Station>('strategy' as Station);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.CREATED);
  const [ownerId, setOwnerId] = useState('');
  const [doneAt, setDoneAt] = useState<Date | undefined>();
  const [collectedAt, setCollectedAt] = useState<Date | undefined>();
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [automationName, setAutomationName] = useState('monthly-close');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const runtimeTask = task as (Task & { doneAt?: string | Date; collectedAt?: string | Date }) | null | undefined;
    setName(task?.name || '');
    setDescription(task?.description || '');
    setStation((task?.station || 'strategy') as Station);
    setStatus((task?.status || TaskStatus.CREATED) as TaskStatus);
    setOwnerId(task?.ownerIds?.[0] || '');
    setDoneAt(runtimeTask?.doneAt ? new Date(runtimeTask.doneAt) : undefined);
    setCollectedAt(runtimeTask?.collectedAt ? new Date(runtimeTask.collectedAt) : undefined);
    setAutomationName((task as any)?.context?.automation?.automationName || 'monthly-close');
    setError('');
  }, [task]);

  const ownerOptions = useMemo(() => allCharacters.filter((character) => character?.id), [allCharacters]);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim() || !description.trim()) {
      setError('Name and exact execution description are required.');
      return;
    }

    const definition = AUTOMATION_DEFINITION_OPTIONS.find((option) => option.automationName === automationName);
    if (!definition) {
      setError('Select a registered automation.');
      return;
    }

    const nextTask = {
      ...(task || {}),
      id: task?.id || uuid(),
      name: name.trim(),
      description: description.trim(),
      type: TaskType.AUTOMATION,
      status,
      station,
      ownerIds: ownerId ? [ownerId] : [],
      doneAt,
      collectedAt,
      lifecycle: {
        ...((task as any)?.lifecycle || {}),
        doneAt: doneAt || null,
        collectedAt: collectedAt || null,
      },
      context: {
        ...((task as any)?.context || {}),
        automation: { automationType: definition.automationType, automationName: definition.automationName },
      },
    } as Task;

    setSaving(true);
    try {
      await onSave(nextTask);
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save automation task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDatesUpdate = (newDates: { createdAt?: Date; doneAt?: Date; collectedAt?: Date }) => {
    setDoneAt(newDates.doneAt);
    setCollectedAt(newDates.collectedAt);
  };

  return <>
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="automation-name">Name *</Label>
          <Input id="automation-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="automation-name" />
        </div>
        <div className="space-y-2">
          <Label>Station *</Label>
          <Select value={station} onValueChange={(v) => setStation(v as Station)}>
            <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="automation-description">Exact execution description *</Label>
          <Textarea id="automation-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="State exactly what must be done; do not rely on inference." />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{statuses.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Accountable owner</Label>
          <Select value={ownerId || 'none'} onValueChange={(v) => setOwnerId(v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No owner</SelectItem>
              {ownerOptions.map((character) => <SelectItem key={character.id} value={character.id}>{character.name || character.id}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Registered automation</Label>
          <Select value={automationName} onValueChange={(value) => {
            setAutomationName(value);
            const nextDefinition = AUTOMATION_DEFINITION_OPTIONS.find((option) => option.automationName === value);
            if (!task && nextDefinition) setName(nextDefinition.defaultTaskName);
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUTOMATION_DEFINITION_OPTIONS.map((option) => (
                <SelectItem key={option.automationName} value={option.automationName}>
                  {option.automationType} / {option.automationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
    <TaskModalFooter>
      <div className="flex flex-wrap items-center gap-2">
        {task && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDatesModal(true)}
            className="h-8 text-xs bg-secondary/50"
          >
            <CalendarIcon className="w-3 h-3 mr-2" />
            Timeline
          </Button>
        )}
        <div className="text-xs text-muted-foreground">The definition selects a registered automation. Run inputs and scheduling are handled separately.</div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="button" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save automation task'}</Button>
      </div>
    </TaskModalFooter>
    <DatesSubmodal
      open={showDatesModal}
      onOpenChange={setShowDatesModal}
      entityId={task?.id ? `data:task:${task.id}` : undefined}
      createdAt={task?.createdAt}
      doneAt={doneAt}
      collectedAt={collectedAt}
      currentStatus={status}
      onDatesChange={handleDatesUpdate}
    />
  </>;
}
