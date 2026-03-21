'use client';

import { useState, useEffect } from 'react';
import { ClientAPI } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  coerceStoredSystemPreset,
  SYSTEM_PRESET_PROMPTS,
  type AISystemPreset,
} from '@/lib/ai/system-presets';

type PresetChoice = AISystemPreset;

const PRESET_LABELS: Record<Exclude<AISystemPreset, 'empty' | 'custom'>, string> = {
  orchestrator: 'Orchestrator (Pixelbrain)',
  researcher: 'Researcher (Librarian)',
  strategist: 'Strategist (Oracle)',
  analyst: 'Analyst (Scientist)',
  promoter: 'Promoter (Producer)',
  designer: 'Designer (Creative)',
};

const PRESET_TEMPLATES: Record<Exclude<AISystemPreset, 'empty' | 'custom'>, string> = {
  ...SYSTEM_PRESET_PROMPTS,
};

function presetForUi(raw?: string): PresetChoice {
  return coerceStoredSystemPreset(raw) ?? 'empty';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  currentPrompt?: string;
  currentPreset?: string;
  onSaved?: () => void;
}

export default function SystemPromptSubmodal({ open, onOpenChange, sessionId, currentPrompt, currentPreset, onSaved }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<PresetChoice>('empty');
  const [customPrompt, setCustomPrompt] = useState(currentPrompt || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPreset(presetForUi(currentPreset));
      setCustomPrompt(currentPrompt || '');
      setError(null);
    }
  }, [open, currentPreset, currentPrompt]);

  const handleSave = async () => {
    if (!sessionId) {
      setError('No session selected');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let promptToSave: string | undefined;
      let presetToSave: AISystemPreset | undefined;

      if (selectedPreset === 'empty') {
        presetToSave = 'empty';
        promptToSave = undefined;
      } else if (selectedPreset === 'custom') {
        presetToSave = 'custom';
        promptToSave = customPrompt.trim() || undefined;
      } else {
        presetToSave = selectedPreset;
        promptToSave = customPrompt.trim() || PRESET_TEMPLATES[selectedPreset];
      }

      await ClientAPI.updateSessionPrompt(sessionId, promptToSave, presetToSave);

      onSaved?.();
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save system prompt');
    } finally {
      setSaving(false);
    }
  };

  const agentPresetKeys = Object.keys(PRESET_LABELS) as (keyof typeof PRESET_LABELS)[];
  const isCustomPromptEnabled =
    selectedPreset === 'custom' ||
    (selectedPreset !== 'empty' && selectedPreset in PRESET_TEMPLATES);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>System Prompt Configuration</DialogTitle>
          <DialogDescription>
            Presets match Pixelbrain agents. Pick one, edit the text if needed, or use Custom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Preset</label>
            <Select
              value={selectedPreset}
              onValueChange={(value) => {
                const v = value as PresetChoice;
                setSelectedPreset(v);
                if (v !== 'custom' && v !== 'empty' && v in PRESET_TEMPLATES) {
                  setCustomPrompt(PRESET_TEMPLATES[v as keyof typeof PRESET_TEMPLATES]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empty">Empty (No system prompt)</SelectItem>
                {agentPresetKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {PRESET_LABELS[key]}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedPreset !== 'empty' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {selectedPreset === 'custom' ? 'Custom prompt' : 'Prompt (editable)'}
                </label>
                {selectedPreset !== 'custom' && (
                  <Badge variant="outline" className="text-xs">
                    Based on {PRESET_LABELS[selectedPreset as keyof typeof PRESET_LABELS] ?? selectedPreset}
                  </Badge>
                )}
              </div>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={selectedPreset === 'custom' ? 'Enter your custom system prompt...' : undefined}
                disabled={!isCustomPromptEnabled}
                className="min-h-[200px] font-mono text-sm"
              />
              {selectedPreset !== 'custom' && (
                <p className="text-xs text-muted-foreground">
                  You can edit the template above before saving.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !sessionId} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
