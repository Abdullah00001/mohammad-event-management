import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { featuresService } from '@/services/features.service';
import { plansService } from '@/services/plans.service';
import { Activity, CheckCircle, CreditCard, ListTree } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const Dashboard: React.FC = () => {
  const { data: features, isLoading: isFeaturesLoading } = useQuery({
    queryKey: ['features'],
    queryFn: featuresService.getFeatures,
  });

  const { data: plans, isLoading: isPlansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: plansService.getPlans,
  });

  if (isFeaturesLoading || isPlansLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-zinc-500">Overview of the subscription ecosystem.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalPlans = plans?.length || 0;
  const activePlans = plans?.filter((p) => p.isActive).length || 0;
  const inactivePlans = totalPlans - activePlans;

  const totalFeatures = features?.length || 0;
  const activeFeatures = features?.filter((f) => f.isActive).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-zinc-500">Overview of the subscription ecosystem.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
            <p className="text-xs text-zinc-500">
              {activePlans} active, {inactivePlans} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Activity className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlans}</div>
            <p className="text-xs text-zinc-500">Currently active plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Features</CardTitle>
            <ListTree className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeatures}</div>
            <p className="text-xs text-zinc-500">System wide features</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Features</CardTitle>
            <CheckCircle className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFeatures}</div>
            <p className="text-xs text-zinc-500">Features currently enabled</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
