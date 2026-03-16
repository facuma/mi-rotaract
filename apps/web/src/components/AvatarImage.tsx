'use client';

import { useEffect, useRef, useState } from 'react';
import { getAvatarUrl, getAttachmentDownloadHeaders } from '@/lib/api';
import { cn } from '@/lib/utils';

type Props = {
  userId: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: number;
};

export function AvatarImage({ userId, alt = 'Avatar', fallback, className, size = 96 }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setError(false);
    const url = getAvatarUrl(userId);
    const headers = getAttachmentDownloadHeaders();
    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('No avatar');
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        blobRef.current = blobUrl;
        setSrc(blobUrl);
      })
      .catch(() => setError(true));
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setSrc(null);
    };
  }, [userId]);

  if (error || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
          className,
        )}
        style={{ width: size, height: size }}
      >
        {fallback ? fallback.slice(0, 2).toUpperCase() : '?'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn('rounded-full object-cover', className)}
      width={size}
      height={size}
    />
  );
}
