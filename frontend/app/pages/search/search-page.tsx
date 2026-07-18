import { useState } from 'react';
import { useLoadAction } from '@/lib/uibakery';
import { Search, Monitor, Users, KeySquare, Building2, Briefcase, Landmark, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import searchComputers from '@/actions/search/searchComputers';
import searchEmployees from '@/actions/search/searchEmployees';
import searchSoftware from '@/actions/search/searchSoftware';
import searchEntities from '@/actions/search/searchEntities';
import searchDepartments from '@/actions/search/searchDepartments';
import searchClients from '@/actions/search/searchClients';
import searchLicenses from '@/actions/search/searchLicenses';
import {
  ComputerSearchResult,
  EmployeeSearchResult,
  SoftwareSearchResult,
  EntitySearchResult,
  DepartmentSearchResult,
  ClientSearchResult,
  LicenseSearchResult,
} from '@/app/pages/search/types';
import { ComputerResultCard } from '@/app/pages/search/components/computer-result-card';
import { EmployeeResultCard } from '@/app/pages/search/components/employee-result-card';
import { SoftwareResultCard } from '@/app/pages/search/components/software-result-card';
import { SimpleEntityResultCard } from '@/app/pages/search/components/simple-entity-result-card';
import { LicenseResultCard } from '@/app/pages/search/components/license-result-card';

export default function SearchPage() {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const likeParam = term.trim() ? `%${term.trim()}%` : '%\u0000no-match\u0000%';

  const [computers, loadingComputers]: [ComputerSearchResult[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(searchComputers, [], { q: likeParam }, { enabled: term.trim().length > 0 });
  const [employees, loadingEmployees]: [EmployeeSearchResult[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(searchEmployees, [], { q: likeParam }, { enabled: term.trim().length > 0 });
  const [software, loadingSoftware]: [SoftwareSearchResult[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(searchSoftware, [], { q: likeParam }, { enabled: term.trim().length > 0 });
  const [entities, loadingEntities]: [EntitySearchResult[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(searchEntities, [], { q: likeParam }, { enabled: term.trim().length > 0 });
  const [departments, loadingDepartments]: [DepartmentSearchResult[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(searchDepartments, [], { q: likeParam }, { enabled: term.trim().length > 0 });
  const [clients, loadingClients]: [ClientSearchResult[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(searchClients, [], { q: likeParam }, { enabled: term.trim().length > 0 });
  const [licenses, loadingLicenses]: [LicenseSearchResult[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(searchLicenses, [], { q: likeParam }, { enabled: term.trim().length > 0 });

  const loading =
    loadingComputers || loadingEmployees || loadingSoftware || loadingEntities || loadingDepartments || loadingClients || loadingLicenses;

  const hasSearched = term.trim().length > 0;
  const totalResults =
    (computers?.length ?? 0) +
    (employees?.length ?? 0) +
    (software?.length ?? 0) +
    (entities?.length ?? 0) +
    (departments?.length ?? 0) +
    (clients?.length ?? 0) +
    (licenses?.length ?? 0);

  function runSearch() {
    setTerm(input);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Global Search</CardTitle>
          <CardDescription>
            Search across computer names, asset IDs, software, employees, entities, departments, clients, and licenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch();
                }}
                placeholder="Search computer name, asset ID, software, employee, entity, department, client, or license..."
                className="pl-8"
              />
            </div>
            <Button onClick={runSearch} disabled={!input.trim()}>
              {loading && hasSearched ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasSearched && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Search className="h-8 w-8" />
          <p className="text-sm">Enter a search term above to find related records across the system.</p>
        </div>
      )}

      {hasSearched && !loading && totalResults === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Search className="h-8 w-8" />
          <p className="text-sm">No results found for "{term}".</p>
        </div>
      )}

      {hasSearched && totalResults > 0 && (
        <div className="space-y-6">
          {computers && computers.length > 0 && (
            <ResultSection icon={Monitor} title="Computers / Assets" count={computers.length}>
              {computers.map((r) => (
                <ComputerResultCard key={`computer-${r.id}`} result={r} />
              ))}
            </ResultSection>
          )}

          {employees && employees.length > 0 && (
            <ResultSection icon={Users} title="Employees" count={employees.length}>
              {employees.map((r) => (
                <EmployeeResultCard key={`employee-${r.id}`} result={r} />
              ))}
            </ResultSection>
          )}

          {software && software.length > 0 && (
            <ResultSection icon={KeySquare} title="Software" count={software.length}>
              {software.map((r) => (
                <SoftwareResultCard key={`software-${r.id}`} result={r} />
              ))}
            </ResultSection>
          )}

          {licenses && licenses.length > 0 && (
            <ResultSection icon={ShieldCheck} title="Licenses" count={licenses.length}>
              {licenses.map((r) => (
                <LicenseResultCard key={`license-${r.id}`} result={r} />
              ))}
            </ResultSection>
          )}

          {entities && entities.length > 0 && (
            <ResultSection icon={Building2} title="Entities" count={entities.length}>
              {entities.map((r) => (
                <SimpleEntityResultCard
                  key={`entity-${r.id}`}
                  name={r.name}
                  code={r.code}
                  status={r.status}
                  stats={[
                    { label: 'Assets', value: r.asset_count },
                    { label: 'License pools', value: r.license_pool_count },
                    { label: 'Users', value: r.user_count },
                  ]}
                />
              ))}
            </ResultSection>
          )}

          {departments && departments.length > 0 && (
            <ResultSection icon={Briefcase} title="Departments" count={departments.length}>
              {departments.map((r) => (
                <SimpleEntityResultCard
                  key={`department-${r.id}`}
                  name={r.name}
                  code={r.code}
                  status={r.status}
                  stats={[
                    { label: 'Users', value: r.user_count },
                    { label: 'Assets', value: r.asset_count },
                  ]}
                />
              ))}
            </ResultSection>
          )}

          {clients && clients.length > 0 && (
            <ResultSection icon={Landmark} title="Clients" count={clients.length}>
              {clients.map((r) => (
                <SimpleEntityResultCard
                  key={`client-${r.id}`}
                  name={r.name}
                  code={r.code}
                  status={r.status}
                  stats={[
                    { label: 'Assets', value: r.asset_count },
                    { label: 'License pools', value: r.license_pool_count },
                  ]}
                />
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Monitor;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}
