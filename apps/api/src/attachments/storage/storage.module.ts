import { Module } from '@nestjs/common';
import { StorageAdapter } from './storage.interface';
import { R2StorageAdapter } from './r2.storage';
import { FilesystemStorageAdapter } from './filesystem.storage';

export const STORAGE_ADAPTER = 'STORAGE_ADAPTER';
export const STORAGE_ADAPTER_R2 = 'STORAGE_ADAPTER_R2';
export const STORAGE_ADAPTER_FS = 'STORAGE_ADAPTER_FS';

@Module({
  providers: [
    { provide: STORAGE_ADAPTER_R2, useClass: R2StorageAdapter },
    { provide: STORAGE_ADAPTER_FS, useClass: FilesystemStorageAdapter },
    {
      provide: STORAGE_ADAPTER,
      useFactory: (r2: StorageAdapter, fs: StorageAdapter): StorageAdapter => {
        const adapter = process.env.STORAGE_ADAPTER || 'r2';
        return adapter === 'fs' ? fs : r2;
      },
      inject: [STORAGE_ADAPTER_R2, STORAGE_ADAPTER_FS],
    },
  ],
  exports: [STORAGE_ADAPTER, STORAGE_ADAPTER_R2, STORAGE_ADAPTER_FS],
})
export class StorageModule {}
