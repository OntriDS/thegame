'use client';

import { useRef, useEffect, useState } from 'react';
import { LinkInputModal } from './link-input-modal';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const maxUndoSteps = 5;
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedTextForLink, setSelectedTextForLink] = useState('');
  const [linkRange, setLinkRange] = useState<Range | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose editor ref for external formatting commands
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).execCommand = (command: string, showUI?: boolean, value?: string) => {
        return document.execCommand(command, showUI, value);
      };
    }
  }, []);

  // Convert markdown to HTML for display
  const convertToHtml = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold text-foreground mb-2 mt-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-base font-semibold text-foreground mb-2 mt-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-sm font-semibold text-foreground mb-1 mt-2">$1</h3>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 mb-1">$2</li>') // Numbered lists
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1 list-disc">$2</li>') // Bullet lists
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-2 rounded text-sm font-mono overflow-x-auto my-2"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/---/g, '<hr class="my-2 border-border" />')
      .replace(/\n/g, '<br>');
  };

  // Convert HTML back to markdown for storage
  const convertToMarkdown = (html: string) => {
    // First, strip all HTML attributes and styles
    let cleanHtml = html
      .replace(/<[^>]*style="[^"]*"[^>]*>/g, (match) => {
        // Remove style attributes but keep the tag
        return match.replace(/\s*style="[^"]*"/g, '');
      })
      .replace(/<[^>]*class="[^"]*"[^>]*>/g, (match) => {
        // Remove class attributes but keep the tag
        return match.replace(/\s*class="[^"]*"/g, '');
      })
      .replace(/<[^>]*data-[^=]*="[^"]*"[^>]*>/g, (match) => {
        // Remove data attributes
        return match.replace(/\s*data-[^=]*="[^"]*"/g, '');
      })
      .replace(/<[^>]*scrollbar-[^=]*="[^"]*"[^>]*>/g, (match) => {
        // Remove scrollbar attributes
        return match.replace(/\s*scrollbar-[^=]*="[^"]*"/g, '');
      });

    // Convert to markdown
    return cleanHtml
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1')
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1')
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1')
      .replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/g, '### $1') // Convert H4-H6 to H3
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<li[^>]*class="[^"]*list-disc[^"]*"[^>]*>(.*?)<\/li>/g, '- $1') // Bullet lists
      .replace(/<li[^>]*>(.*?)<\/li>/g, '1. $1') // Numbered lists (default)
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/g, '```\n$1\n```')
      .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
      .replace(/<hr[^>]*\/?>/g, '---')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<div[^>]*>/g, '')
      .replace(/<\/div>/g, '')
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '\n')
      .replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
      .replace(/<section[^>]*>(.*?)<\/section>/g, '$1')
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
      .trim();
  };

  // Update content when value prop changes (but avoid unnecessary updates)
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = convertToHtml(value);
      const editorHtml = editorRef.current.innerHTML;
      
      // Only update if the content is significantly different (avoid cursor jumps)
      if (editorHtml !== currentHtml && !editorRef.current.contains(document.activeElement)) {
        const cursorPosition = saveCursorPosition();
        editorRef.current.innerHTML = currentHtml;
        
        // Restore cursor position after DOM update
        setTimeout(() => {
          restoreCursorPosition(cursorPosition);
        }, 0);
      }
    }
  }, [value]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const saveToUndoStack = (content: string) => {
    if (undoStack.current.length >= maxUndoSteps) {
      undoStack.current.shift(); // Remove oldest
    }
    undoStack.current.push(content);
  };

  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
    return 0;
  };

  const restoreCursorPosition = (position: number) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;

    let charCount = 0;
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;
      if (charCount + nodeLength >= position) {
        const range = document.createRange();
        range.setStart(node, position - charCount);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      charCount += nodeLength;
    }

    // If we can't find the exact position, place cursor at the end
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleInput = () => {
    if (editorRef.current) {
      // Clear any existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Debounce the update to prevent cursor jumping during rapid typing
      updateTimeoutRef.current = setTimeout(() => {
        if (editorRef.current) {
          const html = editorRef.current.innerHTML;
          const markdown = convertToMarkdown(html);
          saveToUndoStack(markdown);
          onChange(markdown);
        }
      }, 100); // 100ms debounce
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    // Get the raw clipboard data
    let text = e.clipboardData.getData('text/plain');
    
    // Cursor puts HTML in text/plain when copying from code/formatted content
    if (text.includes('<') || text.includes('style=') || text.includes('data-')) {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      
      // Extract text while preserving basic structure
      const elements = tempDiv.querySelectorAll('*');
      let structuredText = '';
      
      // Walk through elements and preserve important formatting
      elements.forEach((element, index) => {
        const textContent = element.textContent || '';
        if (textContent.trim()) {
          // Check if this is a heading
          if (element.tagName?.match(/^H[1-6]$/)) {
            const level = element.tagName.charAt(1);
            if (level === '1') structuredText += `# ${textContent.trim()}\n\n`;
            else if (level === '2') structuredText += `## ${textContent.trim()}\n\n`;
            else if (level === '3') structuredText += `### ${textContent.trim()}\n\n`;
            else structuredText += `### ${textContent.trim()}\n\n`;
          }
          // Check if this is a list item
          else if (element.tagName === 'LI') {
            structuredText += `- ${textContent.trim()}\n`;
          }
          // Check if this is a paragraph or div with content
          else if (element.tagName?.match(/^(P|DIV|SECTION)$/) && textContent.trim()) {
            structuredText += `${textContent.trim()}\n\n`;
          }
        }
      });
      
      // If structured extraction didn't work well, fall back to textContent
      text = structuredText.trim() || tempDiv.textContent || tempDiv.innerText || text;
    }
    
    // Minimal cleaning - only remove HTML artifacts, preserve ALL content
    const cleanText = text
      // Only decode HTML entities
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      
      // Remove only HTML attributes that shouldn't be in plain text
      .replace(/data-section-index="[^"]*"/g, '')
      .replace(/style="[^"]*"/g, '')
      .replace(/class="[^"]*"/g, '')
      
      // Clean up excessive whitespace while preserving paragraph breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Insert clean text at cursor position
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(cleanText));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, append to end
        editorRef.current.textContent += cleanText;
      }
      
      // Trigger input event to update state
      handleInput();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold');
      } else if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // Undo
        if (undoStack.current.length > 0) {
          const previousContent = undoStack.current.pop()!;
          redoStack.current.push(convertToMarkdown(editorRef.current?.innerHTML || ''));
          if (editorRef.current) {
            editorRef.current.innerHTML = convertToHtml(previousContent);
            onChange(previousContent);
          }
        }
      } else if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        // Redo
        if (redoStack.current.length > 0) {
          const nextContent = redoStack.current.pop()!;
          undoStack.current.push(convertToMarkdown(editorRef.current?.innerHTML || ''));
          if (editorRef.current) {
            editorRef.current.innerHTML = convertToHtml(nextContent);
            onChange(nextContent);
          }
        }
      }
    }
    
    // Handle formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '1') {
        e.preventDefault();
        insertHeader(1);
      } else if (e.key === '2') {
        e.preventDefault();
        insertHeader(2);
      } else if (e.key === '3') {
        e.preventDefault();
        insertHeader(3);
      } else if (e.key === '4') {
        e.preventDefault();
        insertCodeBlock();
      } else if (e.key === '5') {
        e.preventDefault();
        insertInlineCode();
      } else if (e.key === 'd') {
        e.preventDefault();
        insertDivider();
      } else if (e.key === 'i') {
        e.preventDefault();
        insertLink();
      } else if (e.key === 'l') {
        e.preventDefault();
        insertBulletList();
      } else if (e.key === 'o') {
        e.preventDefault();
        insertNumberedList();
      }
    }
  };

  const insertHeader = (level: number) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const headerPrefix = '#'.repeat(level) + ' ';
        
        // Insert header prefix at the beginning of the line
        const textNode = document.createTextNode(headerPrefix);
        range.insertNode(textNode);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update state
        handleInput();
      }
    }
  };

  const insertCodeBlock = () => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const codeBlock = '```\n\n```';
        
        // Insert code block
        const textNode = document.createTextNode(codeBlock);
        range.insertNode(textNode);
        
        // Position cursor inside the code block
        range.setStart(textNode, 4); // After ```
        range.setEnd(textNode, 4);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update state
        handleInput();
      }
    }
  };

  const insertInlineCode = () => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        
        if (selectedText) {
          // Wrap selected text in inline code
          const inlineCode = '`' + selectedText + '`';
          range.deleteContents();
          const textNode = document.createTextNode(inlineCode);
          range.insertNode(textNode);
          range.collapse(false);
        } else {
          // Insert empty inline code
          const inlineCode = '`code`';
          const textNode = document.createTextNode(inlineCode);
          range.insertNode(textNode);
          
          // Select the word "code" for easy replacement
          range.setStart(textNode, 1);
          range.setEnd(textNode, 5);
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update state
        handleInput();
      }
    }
  };

  const insertDivider = () => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const divider = '\n---\n';
        
        // Insert divider
        const textNode = document.createTextNode(divider);
        range.insertNode(textNode);
        
        // Position cursor after the divider
        range.setStart(textNode, divider.length);
        range.setEnd(textNode, divider.length);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update state
        handleInput();
      }
    }
  };

  const insertLink = () => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        const selectedText = selection.toString();
        
        // Store the range and selected text for the modal
        setLinkRange(range);
        setSelectedTextForLink(selectedText);
        setShowLinkModal(true);
      }
    }
  };

  const handleLinkConfirm = (url: string, linkText: string) => {
    if (linkRange && editorRef.current) {
      // Restore the selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(linkRange);
        
        // Create the link markdown
        const link = `[${linkText}](${url})`;
        
        // Insert the link
        linkRange.deleteContents();
        const textNode = document.createTextNode(link);
        linkRange.insertNode(textNode);
        linkRange.collapse(false);
        
        // Update selection
        selection.removeAllRanges();
        selection.addRange(linkRange);
        
        // Trigger input event to update state
        handleInput();
      }
    }
    
    // Reset state
    setLinkRange(null);
    setSelectedTextForLink('');
  };

  const insertBulletList = () => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const bulletItem = '- List item';
        
        // Insert bullet list item
        const textNode = document.createTextNode(bulletItem);
        range.insertNode(textNode);
        
        // Select "List item" for easy replacement
        range.setStart(textNode, 2);
        range.setEnd(textNode, bulletItem.length);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update state
        handleInput();
      }
    }
  };

  const insertNumberedList = () => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const numberedItem = '1. List item';
        
        // Insert numbered list item
        const textNode = document.createTextNode(numberedItem);
        range.insertNode(textNode);
        
        // Select "List item" for easy replacement
        range.setStart(textNode, 3);
        range.setEnd(textNode, numberedItem.length);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update state
        handleInput();
      }
    }
  };

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={`border rounded-md p-3 bg-background overflow-y-auto text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
        style={{ whiteSpace: 'pre-wrap', minHeight: '200px' }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
      />
      
      <LinkInputModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onConfirm={handleLinkConfirm}
        selectedText={selectedTextForLink}
      />
    </>
  );
}
