import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { License } from '@/lib/api/licenses.api';
import type { User } from '@/lib/api/users.api';
import type { Asset } from '@/lib/api/assets.api';

const schema = z.object({
  licenseId: z.string().min(1, 'Select a license'),
  userId: z.string().min(1, 'Select an employee'),
  assetId: z.string(),
  expectedReturnDate: z.string(),
  remarks: z.string(),
});

export type ApiAllocationFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;

  licenses: License[];
  users: User[];
  assets: Asset[];

  onSubmit: (
    values: ApiAllocationFormValues
  ) => Promise<void>;
}

export function AllocationFormDialog({
  open,
  onOpenChange,
  saving,
  licenses,
  users,
  assets,
  onSubmit,
}: Props) {
  const form = useForm<ApiAllocationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      licenseId: '',
      userId: '',
      assetId: 'none',
      expectedReturnDate: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        licenseId: '',
        userId: '',
        assetId: 'none',
        expectedReturnDate: '',
        remarks: '',
      });
    }
  }, [open, form]);

  const selectedLicenseId = form.watch('licenseId');

  const selectedLicense = licenses.find(
    (license) =>
      String(license.id) === selectedLicenseId
  );

  const formatDate = (value?: string | null) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-IN');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Allocate License
          </DialogTitle>

          <DialogDescription>
            Assign an available software license
            to an employee.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="licenseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Available License *
                  </FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select available license" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {licenses.map((license) => (
                        <SelectItem
                          key={license.id}
                          value={String(license.id)}
                        >
                          {license.aliasCode}
                          {' — '}
                          {license.softwareName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {licenses.length === 0 ? (
                    <FormDescription>
                      No active and available licenses
                      are currently available.
                    </FormDescription>
                  ) : null}

                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedLicense ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">
                      Software
                    </div>
                    <div className="font-medium">
                      {selectedLicense.softwareName}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground">
                      Alias Code
                    </div>
                    <div className="font-medium">
                      {selectedLicense.aliasCode}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground">
                      Licensed Email
                    </div>
                    <div className="font-medium">
                      {selectedLicense.licensedEmail || '—'}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground">
                      Expiry Date
                    </div>
                    <div className="font-medium">
                      {formatDate(
                        selectedLicense.expiryDate
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Employee *
                  </FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem
                          key={user.id}
                          value={String(user.id)}
                        >
                          {user.fullName}
                          {user.email
                            ? ` — ${user.email}`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Computer / Asset
                  </FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional computer/asset" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="none">
                        No computer / asset
                      </SelectItem>

                      {assets.map((asset) => (
                        <SelectItem
                          key={asset.id}
                          value={String(asset.id)}
                        >
                          {asset.assetTag}
                          {asset.assetName
                            ? ` — ${asset.assetName}`
                            : ''}
                          {asset.hostName
                            ? ` (${asset.hostName})`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormDescription>
                    Optional. Select the computer
                    where this license will be used.
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedReturnDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Expected Return Date
                  </FormLabel>

                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                    />
                  </FormControl>

                  <FormDescription>
                    Optional for permanent allocations.
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Remarks
                  </FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder="Optional allocation remarks..."
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onOpenChange(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  saving ||
                  licenses.length === 0
                }
              >
                {saving
                  ? 'Allocating...'
                  : 'Allocate License'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
