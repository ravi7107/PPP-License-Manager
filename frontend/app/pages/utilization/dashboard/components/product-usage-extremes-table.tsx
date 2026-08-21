import { TrendingDown, TrendingUp } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import { UtilizationProductUsageRow } from '@/lib/api/utilization.api';

/*
 * Per-product least-used / most-used accounts, by email - the direct
 * follow-up question to "Usage by Product": once you know a product is
 * underused, who specifically is barely touching it (a seat worth
 * reclaiming), and who's the power user (worth asking how they're
 * getting that much value)? A user can appear as "most used" on one
 * product and be entirely absent from another they're also assigned
 * to - this is deliberately one row per PRODUCT, not per user, so a
 * weak product doesn't hide behind that same person's strong usage on
 * a different one (see GetProductUsageAsync's per-group ranking).
 */
export function ProductUsageExtremesTable({
  rows,
}: {
  rows: UtilizationProductUsageRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Least / Most Used Accounts, by Product</CardTitle>
        <CardDescription>
          The specific email using each product the least and the most, in days used this period
        </CardDescription>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No data to break down yet.</p>
          </div>
        ) : (
          <div className="nova-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>
                    <span className="inline-flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      Least Used
                    </span>
                  </th>
                  <th>
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--nova-teal-500)' }} />
                      Most Used
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.softwareLabel}>
                    <td className="max-w-[220px] truncate" title={r.softwareLabel}>
                      {r.softwareLabel}
                      {!r.isMatchedToSoftwareMaster && (
                        <span className="text-muted-foreground"> *</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {r.leastUsedEmail ? (
                        <>
                          <div>{r.leastUsedDisplayName ?? r.leastUsedEmail}</div>
                          <div className="text-muted-foreground">
                            {r.leastUsedEmail} · {r.leastUsedDaysUsed} days
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No usage data</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {r.mostUsedEmail ? (
                        <>
                          <div>{r.mostUsedDisplayName ?? r.mostUsedEmail}</div>
                          <div className="text-muted-foreground">
                            {r.mostUsedEmail} · {r.mostUsedDaysUsed} days
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No usage data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.some((r) => !r.isMatchedToSoftwareMaster) && (
          <p className="mt-2 text-xs text-muted-foreground">
            * not matched to your Software master - shown as reported by the vendor
          </p>
        )}
      </CardContent>
    </Card>
  );
}
