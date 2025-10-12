'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onUseDemo: () => void;
  disabled?: boolean;
}

export function TextInput({ value, onChange, onUseDemo, disabled }: TextInputProps) {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const charCount = value.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Text to Narrate</CardTitle>
        <CardDescription>
          Enter your text or use the demo sample
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your text here..."
          className="min-h-[200px] resize-none"
          disabled={disabled}
        />
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {wordCount} words • {charCount} characters
          </div>
          <Button
            variant="outline"
            onClick={onUseDemo}
            disabled={disabled}
          >
            Use Demo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

