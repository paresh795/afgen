"use client";

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type FigureStatus = 'queued' | 'done' | 'error';

interface FigureCardProps {
  id: string;
  name: string;
  tagline: string;
  imageUrl?: string;
  status: FigureStatus;
  createdAt: Date;
  className?: string;
  onDownload?: () => void;
}

export function FigureCard({
  id,
  name,
  tagline,
  imageUrl,
  status,
  createdAt,
  className,
  onDownload,
}: FigureCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="truncate">{name}</CardTitle>
        <CardDescription className="truncate">{tagline}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-[2/3] overflow-hidden bg-neutral-100/50">
          {status === 'done' && imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${name} action figure`}
              fill
              className="object-cover transition-all hover:scale-105"
            />
          ) : status === 'queued' ? (
            <div className="flex h-full w-full flex-col items-center justify-center space-y-4 p-4 text-center">
              <p className="animate-pulse font-medium text-neutral-600">
                Generating your figure...
              </p>
              <div className="h-4 w-48 rounded-full bg-neutral-200 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-primary animate-pulse"></div>
              </div>
            </div>
          ) : status === 'error' ? (
            <div className="flex h-full w-full items-center justify-center p-4 text-center">
              <p className="text-destructive">Generation failed</p>
            </div>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-4">
        <p className="text-xs text-neutral-500">
          {createdAt.toLocaleDateString()}
        </p>
        {status === 'done' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDownload}
            className="gap-1"
          >
            <span>Download</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 