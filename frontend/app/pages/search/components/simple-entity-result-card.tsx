import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function SimpleEntityResultCard({
  name,
  code,
  status,
  stats,
}: {
  name: string;
  code: string | null;
  status: string;
  stats: { label: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <div className="text-sm font-semibold">{name}</div>
          {code && <div className="text-xs text-muted-foreground">{code}</div>}
        </div>
        <Badge variant={status === 'Active' ? 'default' : 'secondary'}>{status}</Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {stats.map((s) => (
          <span key={s.label}>
            {s.label}: <span className="font-medium text-foreground">{s.value}</span>
          </span>
        ))}
      </CardContent>
    </Card>
  );
}
