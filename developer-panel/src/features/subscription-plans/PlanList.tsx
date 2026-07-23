import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { plansService, type SubscriptionPlan } from '@/services/plans.service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlanForm } from './PlanForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const PlanList: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: plansService.getPlans,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: text,
      duration: 2000,
    });
  };

  const openCreate = () => {
    setEditingPlan(null);
    setIsFormOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
          <p className="text-zinc-500">Manage plans and RevenueCat mappings.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>RevenueCat ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Features</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                  No plans found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
            {plans?.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>{plan.displayOrder}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {plan.name}
                    {plan.isPopular && <Badge variant="secondary" className="text-[10px]">Popular</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500 w-12">Product:</span>
                      <code className="bg-zinc-100 px-1 rounded">{plan.revenueCatProductId}</code>
                      <Copy className="h-3 w-3 cursor-pointer text-zinc-400 hover:text-zinc-900" onClick={() => handleCopy(plan.revenueCatProductId)} />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500 w-12">Entitl:</span>
                      <code className="bg-zinc-100 px-1 rounded">{plan.revenueCatEntitlementId}</code>
                      <Copy className="h-3 w-3 cursor-pointer text-zinc-400 hover:text-zinc-900" onClick={() => handleCopy(plan.revenueCatEntitlementId)} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {plan.isActive ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 w-max">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="w-max">Inactive</Badge>
                    )}
                    {plan.isVisible ? (
                      <Badge variant="outline" className="w-max text-[10px]">Visible</Badge>
                    ) : (
                      <Badge variant="outline" className="w-max text-[10px] text-zinc-400">Hidden</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-zinc-500">
                    {plan.features?.length || 0} features
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          </DialogHeader>
          <PlanForm 
            plan={editingPlan} 
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ['plans'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
