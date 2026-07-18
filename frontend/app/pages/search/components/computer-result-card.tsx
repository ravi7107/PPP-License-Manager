import { Monitor, User, Building2, Landmark, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComputerSearchResult } from '@/app/pages/search/types';

export function ComputerResultCard({ result }: { result: ComputerSearchResult }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">{result.computer_name || result.asset_tag}</div>
            <div className="text-xs text-muted-foreground">{result.asset_tag}</div>
          </div>
        </div>
        <Badge variant={result.status === 'Active' ? 'default' : 'secondary'}>{result.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs text-muted-foreground">
        {result.model && <div>Model: {result.model}</div>}
        {result.serial_number && <div>Serial: {result.serial_number}</div>}
        {result.operating_system && <div>OS: {result.operating_system}</div>}
        {result.location && <div>Location: {result.location}</div>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          {result.assigned_user_name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {result.assigned_user_name}
            </span>
          )}
          {result.entity_name && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {result.entity_name}
            </span>
          )}
          {result.department_name && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> {result.department_name}
            </span>
          )}
          {result.client_name && (
            <span className="inline-flex items-center gap-1">
              <Landmark className="h-3 w-3" /> {result.client_name}
            </span>
          )}
        </div>
        {result.installed_software && result.installed_software.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {result.installed_software.map((name) => (
              <Badge key={name} variant="outline" className="font-normal">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
