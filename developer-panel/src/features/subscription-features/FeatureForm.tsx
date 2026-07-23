import React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { featuresService } from '@/services/features.service';
import type { Feature } from '@/services/features.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm as useReactHookForm } from "react-hook-form"

const featureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric and underscores'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FeatureFormValues = z.infer<typeof featureSchema>;

interface FeatureFormProps {
  feature?: Feature | null;
  onSuccess: () => void;
}

export const FeatureForm: React.FC<FeatureFormProps> = ({ feature, onSuccess }) => {
  const { toast } = useToast();
  
  const form = useReactHookForm<FeatureFormValues>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      name: feature?.name || '',
      code: feature?.code || '',
      description: feature?.description || '',
      isActive: feature?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FeatureFormValues) => 
      feature ? featuresService.updateFeature(feature.id, data) : featuresService.createFeature(data),
    onSuccess: () => {
      toast({
        title: `Feature ${feature ? 'updated' : 'created'} successfully`,
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

  const onSubmit = (data: FeatureFormValues) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register('name')} placeholder="e.g. Travel Mode" />
        {form.formState.errors.name && (
          <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Code (Unique Identifier)</Label>
        <Input 
          id="code" 
          {...form.register('code')} 
          placeholder="e.g. TRAVEL_MODE" 
          disabled={!!feature} // Code is usually immutable after creation
        />
        {form.formState.errors.code && (
          <p className="text-red-500 text-xs">{form.formState.errors.code.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...form.register('description')} placeholder="Optional description" />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select 
          onValueChange={(val) => form.setValue('isActive', val === 'true')} 
          defaultValue={form.getValues('isActive') ? 'true' : 'false'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Feature'}
        </Button>
      </div>
    </form>
  );
};
