'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Link, FileText } from 'lucide-react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onUseDemo: () => void;
  disabled?: boolean;
}

export function TextInput({ value, onChange, onUseDemo, disabled }: TextInputProps) {
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const charCount = value.length;

  const handleFetchUrl = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setError(null);
    setIsFetching(true);
    setIsCached(false);

    try {
      const response = await fetch('/api/linkup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch content');
      }

      const data = await response.json();
      onChange(data.content);
      setIsCached(data.cached || false);
      setUrl(''); // Clear URL input after successful fetch
    } catch (err) {
      console.error('Error fetching URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch content from URL');
    } finally {
      setIsFetching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isFetching) {
      handleFetchUrl();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Text to Narrate</CardTitle>
        <CardDescription>
          Enter your text, paste a URL, or use the demo sample
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" disabled={disabled}>
              <FileText className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="url" disabled={disabled}>
              <Link className="h-4 w-4 mr-2" />
              URL
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4">
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
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="https://example.com/article"
                  disabled={disabled || isFetching}
                  className="flex-1"
                />
                <Button
                  onClick={handleFetchUrl}
                  disabled={disabled || isFetching || !url.trim()}
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    'Fetch Content'
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Paste a URL to any article, blog post, or webpage. We'll extract and clean the content for you.
              </p>
            </div>
            
            {value && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Extracted content:</p>
                  {isCached && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      ✓ Cached
                    </span>
                  )}
                </div>
                <div className="max-h-[150px] overflow-y-auto p-3 bg-muted rounded-md">
                  <p className="text-sm line-clamp-6">{value}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-muted-foreground">
                    {wordCount} words • {charCount} characters
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onChange('');
                      setIsCached(false);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

