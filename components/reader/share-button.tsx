'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ImmersionMode } from '@/lib/types';

interface ShareButtonProps {
  text: string;
  immersionMode: ImmersionMode;
  disabled?: boolean;
  isDarkBackground?: boolean;
}

export function ShareButton({ text, immersionMode, disabled = false, isDarkBackground = false }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const generateShareUrl = () => {
    if (!text) return '';
    
    // Encode text as base64 for URL
    const encodedText = btoa(encodeURIComponent(text));
    const baseUrl = window.location.origin;
    const url = new URL(baseUrl);
    url.searchParams.set('text', encodedText);
    url.searchParams.set('mode', immersionMode);
    
    return url.toString();
  };

  const handleCopy = async () => {
    const shareUrl = generateShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareUrl = generateShareUrl();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={
            isDarkBackground
              ? 'text-white/70 hover:text-white hover:bg-white/10 drop-shadow-lg'
              : 'text-foreground/70 hover:text-foreground hover:bg-secondary'
          }
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this reading</DialogTitle>
          <DialogDescription>
            Anyone with this link can read the same text in {immersionMode} mode.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="font-mono text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleCopy}
            className="px-3"
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

