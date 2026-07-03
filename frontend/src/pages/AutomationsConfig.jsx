import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export default function AutomationsConfig() {
  return (
    <div className="max-w-6xl mx-auto">
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-8">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Automations View</CardTitle>
        </CardHeader>
        <CardContent className="text-zinc-500 dark:text-zinc-400 text-sm">
          Scaffolded view for Automations configuration.
        </CardContent>
      </Card>
    </div>
  );
}
