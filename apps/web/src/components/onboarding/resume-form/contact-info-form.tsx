'use client';

import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ContactInfoForm() {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contact_info.links',
  });

  const addLink = () => {
    append({ name: '', url: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
        <CardDescription>
          Enter your basic contact details and professional links
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            {...register('contact_info.full_name', {
              required: 'Full name is required',
            })}
            placeholder="John Doe"
          />
          {errors.contact_info?.full_name && (
            <p className="text-sm text-destructive">
              {errors.contact_info.full_name.message as string}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('contact_info.email', {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              placeholder="john@example.com"
            />
            {errors.contact_info?.email && (
              <p className="text-sm text-destructive">
                {errors.contact_info.email.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register('contact_info.phone')}
              placeholder="+1 (555) 123-4567"
            />
            {errors.contact_info?.phone && (
              <p className="text-sm text-destructive">
                {errors.contact_info.phone.message as string}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            {...register('contact_info.address')}
            placeholder="City, State, Country"
          />
          {errors.contact_info?.address && (
            <p className="text-sm text-destructive">
              {errors.contact_info.address.message as string}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Professional Links</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLink}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <div className="space-y-1">
                <Label htmlFor={`link-name-${index}`}>Name</Label>
                <Input
                  id={`link-name-${index}`}
                  {...register(`contact_info.links.${index}.name`)}
                  placeholder="LinkedIn, GitHub, Portfolio, etc."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`link-url-${index}`}>URL</Label>
                <div className="flex gap-2">
                  <Input
                    id={`link-url-${index}`}
                    {...register(`contact_info.links.${index}.url`, {
                      pattern: {
                        value: /^https?:\/\/.+/,
                        message: 'Please enter a valid URL starting with http:// or https://',
                      },
                    })}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    className="px-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {errors.contact_info?.links?.[index]?.url && (
                  <p className="text-sm text-destructive">
                    {errors.contact_info.links[index].url.message as string}
                  </p>
                )}
              </div>
            </div>
          ))}

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add professional links like LinkedIn, GitHub, portfolio website, etc.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}