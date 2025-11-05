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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  currentPrompt?: string;
  currentPreset?: 'analyst' | 'strategist' | 'assistant' | 'accounter' | 'empty' | 'custom';
  onSaved?: () => void;
}

const PRESET_TEMPLATES = {
  analyst: 'You are a top class analyst and researcher, that dives deep into topics and synthesizes findings into structured reports. Format your responses using markdown for clarity: use ## headings for sections, **bold** for key terms, bullet points for lists, and a final "Action Items" section when applicable. Keep answers concise, structured, and data-driven.',
  strategist: 'You are a high-level strategic planning and design thinker. You are complex problems solver and develop programs. Format your responses using markdown: use ## headings for major sections, bullet points for lists, and include sections for Objectives, Phases, Risks/Mitigations, and Success Metrics when planning. Provide clear, actionable strategic guidance.',
  assistant: 'You are an organizational assistant and a creative project management expert, that knows about the project-status and the documentation. Format your responses using markdown with checklists, priorities, and next steps. Use - [ ] for checkboxes, **bold** for priorities, and structured bullet points. Focus on actionable, organizational tasks.',
  accounter: 'You are a master in finances, knows about current assets, inventory and sales. Produces financial balances and summaries, analyzes business numbers, including relevant financial metrics, asset valuations, and clear financial insights. Format your responses using markdown: use ## headings for sections, **bold** for key financial terms and amounts, bullet points for lists, and tables for financial data when applicable.',
  empty: '',
  custom: ''
};

export default function SystemPromptSubmodal({ open, onOpenChange, sessionId, currentPrompt, currentPreset, onSaved }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<'analyst' | 'strategist' | 'assistant' | 'accounter' | 'empty' | 'custom'>(currentPreset || 'empty');
  const [customPrompt, setCustomPrompt] = useState(currentPrompt || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize state when modal opens or props change
  useEffect(() => {
    if (open) {
      setSelectedPreset(currentPreset || 'empty');
      setCustomPrompt(currentPrompt || '');
      setError(null);
    }
  }, [open, currentPreset, currentPrompt]);

  // Update custom prompt preview when preset changes
  useEffect(() => {
    if (selectedPreset !== 'custom' && selectedPreset !== 'empty') {
      setCustomPrompt(PRESET_TEMPLATES[selectedPreset]);
    }
  }, [selectedPreset]);

  const handleSave = async () => {
    if (!sessionId) {
      setError('No session selected');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let promptToSave: string | undefined;
      let presetToSave: 'analyst' | 'strategist' | 'assistant' | 'accounter' | 'empty' | 'custom' | undefined;

      if (selectedPreset === 'empty') {
        presetToSave = 'empty';
        promptToSave = undefined;
      } else if (selectedPreset === 'custom') {
        presetToSave = 'custom';
        promptToSave = customPrompt.trim() || undefined;
      } else {
        presetToSave = selectedPreset;
        // Use the template text for preset, but allow customization if user edited it
        promptToSave = customPrompt.trim() || PRESET_TEMPLATES[selectedPreset];
      }

      await ClientAPI.updateSessionPrompt(sessionId, promptToSave, presetToSave);
      
      if (onSaved) {
        onSaved();
      }
      
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save system prompt');
    } finally {
      setSaving(false);
    }
  };

  const isCustomPromptEnabled = selectedPreset === 'custom' || selectedPreset === 'analyst' || selectedPreset === 'strategist' || selectedPreset === 'assistant' || selectedPreset === 'accounter';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>System Prompt Configuration</DialogTitle>
          <DialogDescription>
            Configure how the AI responds. Select a preset or create a custom prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preset Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preset</label>
            <Select value={selectedPreset} onValueChange={(value: any) => setSelectedPreset(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empty">Empty (No system prompt)</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="strategist">Strategist</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="accounter">Accounter</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Prompt Textarea */}
          {selectedPreset !== 'empty' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {selectedPreset === 'custom' ? 'Custom Prompt' : 'Prompt (editable)'}
                </label>
                {selectedPreset !== 'custom' && (
                  <Badge variant="outline" className="text-xs">
                    Based on {selectedPreset} preset
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
                  You can customize the preset template above. Changes will be saved as custom.
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !sessionId}
              className="gap-2"
            >
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

