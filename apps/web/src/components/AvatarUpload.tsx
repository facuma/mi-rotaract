'use client';

import { useRef, useState } from 'react';
import { AvatarImage } from './AvatarImage';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

type Props = {
  userId: string;
  displayName?: string;
  onUpload: (file: File) => Promise<void>;
  canEdit?: boolean;
  size?: number;
  className?: string;
};

const ACCEPT = 'image/jpeg,image/jpg,image/png';
const MAX_SIZE_MB = 2;

export function AvatarUpload({
  userId,
  displayName,
  onUpload,
  canEdit = true,
  size = 96,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Máximo ${MAX_SIZE_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      await onUpload(file);
      setKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const fallback = displayName
    ? displayName
        .split(/\s+/)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
    : '?';

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative">
        <AvatarImage
          key={key}
          userId={userId}
          fallback={fallback}
          size={size}
          className="border-2 border-border"
        />
        {canEdit && (
          <>
            <input
              ref={inputRef}
              id="avatar-upload"
              type="file"
              accept={ACCEPT}
              onChange={handleChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              disabled={uploading}
              aria-label="Subir foto"
            />
            {uploading && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white text-xs"
                style={{ width: size, height: size }}
              >
                Subiendo...
              </div>
            )}
          </>
        )}
      </div>
      {canEdit && (
        <Label htmlFor="avatar-upload" className="text-xs text-muted-foreground cursor-pointer">
          {uploading ? 'Subiendo...' : 'Cambiar foto (JPG/PNG, máx. 2 MB)'}
        </Label>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
