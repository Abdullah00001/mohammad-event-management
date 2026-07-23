import React from 'react';
import { useForm as useReactHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { plansService } from '@/services/plans.service';
import type { SubscriptionPlan } from '@/services/plans.service';
import { featuresService } from '@/services/features.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

import { Checkbox } from "@/components/ui/checkbox"

const planSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  revenueCatProductId: z.string().min(1, 'RevenueCat Product ID is required'),
  entitlementId: z.string().min(1, 'Entitlement ID is required'),
  displayOrder: z.number().int(),
  isPopular: z.boolean(),
  isVisible: z.boolean(),
  isActive: z.boolean(),
  featureIds: z.array(z.string()).optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;

interface PlanFormProps {
  plan?: SubscriptionPlan | null;
  onSuccess: () => void;
}

export const PlanForm: React.FC<PlanFormProps> = ({ plan, onSuccess }) => {
  const { toast } = useToast();

  const { data: features } = useQuery({
    queryKey: ['features'],
    queryFn: featuresService.getFeatures,
  });
  
  const form = useReactHookForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan?.name || '',
      description: plan?.description || '',
      revenueCatProductId: plan?.revenueCatProductId || '',
      entitlementId: plan?.revenueCatEntitlementId || '',
      displayOrder: plan?.displayOrder ?? 0,
      isPopular: plan?.isPopular ?? false,
      isVisible: plan?.isVisible ?? true,
      isActive: plan?.isActive ?? true,
      featureIds: plan?.features?.map(f => f.featureId) || [],
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PlanFormValues) => 
      plan ? plansService.updatePlan(plan.id, data) : plansService.createPlan(data),
    onSuccess: () => {
      toast({
        title: `Plan ${plan ? 'updated' : 'created'} successfully`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PlanFormValues) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...form.register('name')} placeholder="e.g. Pro Monthly" />
          {form.formState.errors.name && (
            <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input id="displayOrder" type="number" {...form.register('displayOrder', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...form.register('description')} placeholder="Plan description" />
        {form.formState.errors.description && (
            <p className="text-red-500 text-xs">{form.formState.errors.description.message}</p>
          )}
      </div>

      <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-zinc-50">
        <div className="col-span-2 pb-2">
          <h3 className="text-sm font-medium">RevenueCat Integration</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="revenueCatProductId">Product ID</Label>
          <Input id="revenueCatProductId" {...form.register('revenueCatProductId')} placeholder="e.g. pro_monthly_999" />
          {form.formState.errors.revenueCatProductId && (
            <p className="text-red-500 text-xs">{form.formState.errors.revenueCatProductId.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="entitlementId">Entitlement ID</Label>
          <Input id="entitlementId" {...form.register('entitlementId')} placeholder="e.g. pro" />
          {form.formState.errors.entitlementId && (
            <p className="text-red-500 text-xs">{form.formState.errors.entitlementId.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border p-4 rounded-md">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="isActive" 
            checked={form.watch('isActive')}
            onCheckedChange={(checked: boolean) => form.setValue('isActive', checked)}
          />
          <Label htmlFor="isActive" className="text-sm font-normal">Active</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="isVisible" 
            checked={form.watch('isVisible')}
            onCheckedChange={(checked: boolean) => form.setValue('isVisible', checked)}
          />
          <Label htmlFor="isVisible" className="text-sm font-normal">Visible</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="isPopular" 
            checked={form.watch('isPopular')}
            onCheckedChange={(checked: boolean) => form.setValue('isPopular', checked)}
          />
          <Label htmlFor="isPopular" className="text-sm font-normal">Popular (Highlight)</Label>
        </div>
      </div>

      <div className="space-y-2 border p-4 rounded-md">
        <Label>Assigned Features</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {features?.filter(f => f.isActive).map((feature) => {
            const isChecked = form.watch('featureIds')?.includes(feature.id);
            return (
              <div key={feature.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`feature-${feature.id}`} 
                  checked={isChecked}
                  onCheckedChange={(checked: boolean) => {
                    const current = form.getValues('featureIds') || [];
                    if (checked) {
                      form.setValue('featureIds', [...current, feature.id]);
                    } else {
                      form.setValue('featureIds', current.filter(id => id !== feature.id));
                    }
                  }}
                />
                <Label htmlFor={`feature-${feature.id}`} className="text-sm font-normal cursor-pointer">
                  {feature.name} <span className="text-zinc-400 text-xs">({feature.code})</span>
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Plan'}
        </Button>
      </div>
    </form>
  );
};
