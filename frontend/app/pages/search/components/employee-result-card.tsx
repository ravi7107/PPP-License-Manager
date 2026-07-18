import { Users, Building2, Briefcase, Monitor, KeySquare } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmployeeSearchResult } from '@/app/pages/search/types';

export function EmployeeResultCard({ result }: { result: EmployeeSearchResult }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">{result.full_name}</div>
            <div className="text-xs text-muted-foreground">{result.email || '—'}</div>
          </div>
        </div>
        <Badge variant={result.status === 'Active' ? 'default' : 'secondary'}>{result.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {result.role && <span>Role: {result.role}</span>}
          {result.is_team_leader && <Badge variant="outline">Team Leader</Badge>}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {result.department_name && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> {result.department_name}
            </span>
          )}
          {result.entity_name && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {result.entity_name}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          <span className="inline-flex items-center gap-1">
            <Monitor className="h-3 w-3" /> {result.assigned_asset_count} asset(s)
          </span>
          <span className="inline-flex items-center gap-1">
            <KeySquare className="h-3 w-3" /> {result.active_license_count} license(s)
          </span>
        </div>
        {result.assigned_assets && result.assigned_assets.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {result.assigned_assets.map((tag) => (
              <Badge key={tag} variant="outline" className="font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {result.allocated_software && result.allocated_software.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {result.allocated_software.map((name) => (
              <Badge key={name} variant="secondary" className="font-normal">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
