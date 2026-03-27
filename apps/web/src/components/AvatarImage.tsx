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

const avatarBlobUrlCache = new Map<string, string>();
const avatarRequests = new Map<string, Promise<string>>();

async function fetchAvatarBlobUrl(userId: string): Promise<string> {
  const cached = avatarBlobUrlCache.get(userId);
  if (cached) return cached;

  const pending = avatarRequests.get(userId);
  if (pending) return pending;

  const promise = fetch(getAvatarUrl(userId), {
    headers: getAttachmentDownloadHeaders(),
  })
    .then((res) => {
      if (!res.ok) throw new Error('No avatar');
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      avatarBlobUrlCache.set(userId, blobUrl);
      return blobUrl;
    })
    .finally(() => {
      avatarRequests.delete(userId);
    });

  avatarRequests.set(userId, promise);
  return promise;
}

export function AvatarImage({ userId, alt = 'Avatar', fallback, className, size = 96 }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!userId) return;

    setError(false);
    setSrc(avatarBlobUrlCache.get(userId) ?? null);
    fetchAvatarBlobUrl(userId)
      .then((blobUrl) => {
        if (!mountedRef.current) return;
        setSrc(blobUrl);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError(true);
      });

    return () => {
      mountedRef.current = false;
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
