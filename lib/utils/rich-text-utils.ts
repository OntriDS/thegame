// lib/utils/rich-text-utils.ts
import React from 'react';

/**
 * Parse simple markdown-like formatting for notes
 * Supports: **bold**, ## headings, --- dividers
 */
export function parseRichText(content: string): React.ReactElement[] {
  if (!content) return [];

  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Empty line
    if (line.trim() === '') {
      elements.push(React.createElement('br', { key: key++ }));
      continue;
    }
    
    // Divider line
    if (line.trim() === '---') {
      elements.push(
        React.createElement('hr', { 
          key: key++, 
          className: "my-2 border-border" 
        })
      );
      continue;
    }
    
    // Heading (## text)
    if (line.startsWith('## ')) {
      const headingText = line.substring(3).trim();
      elements.push(
        React.createElement('h3', { 
          key: key++, 
          className: "text-sm font-semibold text-foreground mb-1" 
        }, parseInlineFormatting(headingText))
      );
      continue;
    }
    
    // Regular paragraph
    elements.push(
      React.createElement('p', { 
        key: key++, 
        className: "text-sm text-muted-foreground mb-1" 
      }, parseInlineFormatting(line))
    );
  }

  return elements;
}

/**
 * Parse inline formatting within a line (bold, etc.)
 */
function parseInlineFormatting(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;

  // Find all **bold** patterns
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }
    
    // Add bold text
    parts.push(
      React.createElement('strong', { 
        key: key++, 
        className: "font-semibold text-foreground" 
      }, match[1])
    );
    
    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  // If no formatting was found, return the original text
  if (parts.length === 0) {
    return [text];
  }

  return parts;
}

/**
 * Get preview text for note cards (first few lines, no formatting)
 */
export function getNotePreview(content: string, maxLines: number = 3): string {
  if (!content) return '';
  
  const lines = content.split('\n').slice(0, maxLines);
  return lines.join(' ').replace(/\*\*(.*?)\*\*/g, '$1').replace(/## /g, '');
}
