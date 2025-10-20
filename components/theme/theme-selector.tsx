// components/theme-selector.tsx
'use client';

import { useTheme } from '@/lib/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';

export function ThemeSelector() {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Selection
        </CardTitle>
        <CardDescription>
          Choose a color theme for your application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div>
          <h3 className="text-sm font-medium mb-3">Available Themes</h3>
          <div className="grid grid-cols-2 gap-3">
            {availableThemes.map((theme) => (
              <Button
                key={theme.name}
                variant={currentTheme === theme.name ? "default" : "outline"}
                onClick={() => setTheme(theme.name)}
                className="flex flex-col items-start h-auto p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${theme.light.primary})`
                    }}
                  />
                  <span className="font-medium">{theme.displayName}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {theme.description}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Theme Preview */}
        <div>
          <h3 className="text-sm font-medium mb-3">Preview</h3>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
              <Button size="sm">Primary</Button>
              <Button variant="outline" size="sm">Secondary</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
            </div>
            <div className="text-sm">
              <p className="font-medium">Sample Text</p>
              <p className="text-muted-foreground">Muted text example</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
