import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import { NotificationsBell } from '@/components/layout/notifications-bell';

interface AppTopbarProps {
  pageTitle: string;
  breadcrumbGroup?: string;
  canSearch?: boolean;
}

export function AppTopbar({
  pageTitle,
  breadcrumbGroup,
  canSearch,
}: AppTopbarProps) {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();

    const q = searchQuery.trim();

    if (!q) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  // Only shown when the group is known and actually distinct from the
  // page title itself (e.g. Dashboard's own group is "Overview", which
  // is worth showing as "Overview > Dashboard" - but this still guards
  // against a page whose label happens to match its group name).
  const showBreadcrumbGroup =
    breadcrumbGroup && breadcrumbGroup !== pageTitle;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />

      <Separator
        orientation="vertical"
        className="h-5"
      />

      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        {showBreadcrumbGroup ? (
          <>
            <span className="truncate text-muted-foreground">
              {breadcrumbGroup}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </>
        ) : null}

        <span className="truncate font-semibold md:text-base">
          {pageTitle}
        </span>
      </div>

      {canSearch ? (
        <form
          onSubmit={handleSearchSubmit}
          className="relative ml-4 hidden w-56 lg:block"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search…"
            className="h-8 pl-8 text-xs"
          />
        </form>
      ) : null}

      <div className="ml-auto flex items-center gap-3">
        <NotificationsBell />
      </div>
    </header>
  );
}
