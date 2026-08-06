import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { featuresService } from '@/services/features.service';
import type { Feature } from '@/services/features.service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FeatureForm } from './FeatureForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const FeatureList: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  const { data: features, isLoading } = useQuery({
    queryKey: ['features'],
    queryFn: featuresService.getFeatures,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: text,
      duration: 2000,
    });
  };

  const openCreate = () => {
    setEditingFeature(null);
    setIsFormOpen(true);
  };

  const openEdit = (feature: Feature) => {
    setEditingFeature(feature);
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
          <h2 className="text-2xl font-bold tracking-tight">Features</h2>
          <p className="text-zinc-500">Manage all subscription features.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Feature
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Used By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                  No features found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
            {features?.map((feature) => (
              <TableRow key={feature.id}>
                <TableCell className="font-medium">{feature.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="bg-zinc-100 px-2 py-1 rounded text-xs">
                      {feature.code}
                    </code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(feature.code)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {feature.isActive ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {feature.plans && feature.plans.length > 0 ? (
                      feature.plans.map((p) => (
                        <Badge key={p.planId} variant="outline" className="text-xs">
                          {p.plan.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-zinc-400 text-sm">None</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(feature)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFeature ? 'Edit Feature' : 'Create Feature'}</DialogTitle>
          </DialogHeader>
          <FeatureForm 
            feature={editingFeature} 
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ['features'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
