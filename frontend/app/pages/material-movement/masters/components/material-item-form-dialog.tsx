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
import { Switch } from '@/components/ui/switch';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  MaterialItem,
  MATERIAL_TYPES,
} from '@/lib/api/material-items.api';

import { MaterialItemCategory } from '@/lib/api/material-item-categories.api';

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  Stock: 'Stock',
  Consumable: 'Consumable',
  ITAsset: 'IT Asset',
  Equipment: 'Equipment',
  Tool: 'Tool',
  SparePart: 'Spare Part',
  Other: 'Other',
};

const schema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  itemName: z.string().min(1, 'Item name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  materialType: z.string().min(1, 'Material type is required'),
  unitOfMeasure: z.string(),
  isSerialized: z.boolean(),
  description: z.string(),
  status: z.enum(['Active', 'Inactive']),
});

export type MaterialItemFormValues = z.infer<typeof schema>;

const EMPTY: MaterialItemFormValues = {
  itemCode: '',
  itemName: '',
  categoryId: '',
  materialType: 'Stock',
  unitOfMeasure: '',
  isSerialized: false,
  description: '',
  status: 'Active',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MaterialItem | null;
  categories: MaterialItemCategory[];
  saving: boolean;
  onSubmit: (values: MaterialItemFormValues) => Promise<void>;
}

export function MaterialItemFormDialog({
  open,
  onOpenChange,
  item,
  categories,
  saving,
  onSubmit,
}: Props) {
  const form = useForm<MaterialItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      item
        ? {
            itemCode: item.itemCode,
            itemName: item.itemName,
            categoryId: String(item.categoryId),
            materialType: item.materialType,
            unitOfMeasure: item.unitOfMeasure ?? '',
            isSerialized: item.isSerialized,
            description: item.description ?? '',
            status: item.isActive ? 'Active' : 'Inactive',
          }
        : EMPTY
    );
  }, [open, item, form]);

  const activeCategories = categories.filter(
    (category) =>
      category.isActive || category.id === item?.categoryId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Material Item' : 'Add Material Item'}
          </DialogTitle>

          <DialogDescription>
            Items tracked through the material movement
            workflow.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <FormField
              control={form.control}
              name="itemCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Code</FormLabel>
                  <FormControl>
                    <Input placeholder="ITM-0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Laptop Charger" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {activeCategories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
                          {category.name}
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
              name="materialType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Type</FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material type" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {MATERIAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {MATERIAL_TYPE_LABELS[type] ?? type}
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
              name="unitOfMeasure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measure (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Nos, Kg, Box…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isSerialized"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Serialized Item</FormLabel>
                    <FormDescription>
                      Track this item by individual serial
                      number (e.g. IT assets).
                    </FormDescription>
                  </div>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Item description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="Active">
                        Active
                      </SelectItem>
                      <SelectItem value="Inactive">
                        Inactive
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
