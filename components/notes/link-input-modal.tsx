'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, X } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface LinkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, text: string) => void;
  selectedText?: string;
}

export function LinkInputModal({
  isOpen,
  onClose,
  onConfirm,
  selectedText = ''
}: LinkInputModalProps) {
  const [url, setUrl] = useState('https://');
  const [linkText, setLinkText] = useState(selectedText || 'Link text');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (url.trim() && linkText.trim()) {
      onConfirm(url.trim(), linkText.trim());
      onClose();
      // Reset form
      setUrl('https://');
      setLinkText(selectedText || 'Link text');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setUrl('https://');
    setLinkText(selectedText || 'Link text');
  };

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 ${getZIndexClass('MODALS')}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Add Link</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Create a clickable link in your note
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkText">Link Text</Label>
            <Input
              id="linkText"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Enter link text..."
              autoFocus={!selectedText}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkUrl">URL</Label>
            <Input
              id="linkUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus={!!selectedText}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!url.trim() || !linkText.trim()}>
              Add Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
