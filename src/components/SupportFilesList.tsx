import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export default function SupportFilesList() {
  const [files, setFiles] = useState<Array<{ id: string; url: string; filename: string; mimeType: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await api.getSetting('support_files');
        if (Array.isArray(stored)) setFiles(stored);
      } catch {}
    })();
  }, []);

  if (files.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materiais de apoio</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-6 space-y-1">
          {files.map((f) => (
            <li key={f.id}>
              <a href={f.url} target="_blank" rel="noreferrer" className="underline">
                {f.filename}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}


