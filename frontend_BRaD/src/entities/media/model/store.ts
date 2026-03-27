import { create } from 'zustand';
import api, { getApiErrorMessage } from '@shared/lib/api';
import type { UploadAndAttachInput, UploadedFile } from './types';

interface MediaStore {
  isUploading: boolean;
  isDeleting: boolean;
  error: string | null;
  uploadAndAttach: (input: UploadAndAttachInput) => Promise<UploadedFile>;
  deleteFile: (fileId: string) => Promise<void>;
  getDownloadUrl: (fileId: string) => Promise<string>;
  clearError: () => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeUploadedFile = (payload: unknown): UploadedFile => {
  const data = isRecord(payload) ? payload : {};

  return {
    id: typeof data.id === 'string' ? data.id : '',
    status: typeof data.status === 'string' ? data.status : undefined,
    type: typeof data.type === 'string' ? data.type : undefined,
    filename: typeof data.filename === 'string' ? data.filename : 'file',
    mimeType: typeof data.mimeType === 'string' ? data.mimeType : null,
    sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : null,
    url: typeof data.url === 'string' ? data.url : null,
    downloadUrl: typeof data.downloadUrl === 'string' ? data.downloadUrl : null,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
};

export const useMediaStore = create<MediaStore>((set) => ({
  isUploading: false,
  isDeleting: false,
  error: null,

  uploadAndAttach: async (input) => {
    set({ isUploading: true, error: null });

    try {
      const mimeType = input.file.type || 'application/octet-stream';
      const presignResponse = await api.post('/uploads/presign', {
        target: input.target,
        fileName: input.file.name,
        mimeType,
        sizeBytes: input.file.size,
      });

      const upload = isRecord(presignResponse.data?.upload) ? presignResponse.data.upload : {};
      const fileData = normalizeUploadedFile(presignResponse.data?.file);

      const putResponse = await fetch(String(upload.url || ''), {
        method: String(upload.method || 'PUT'),
        headers: isRecord(upload.headers)
          ? Object.fromEntries(
              Object.entries(upload.headers).filter((entry): entry is [string, string] => {
                return typeof entry[1] === 'string';
              }),
            )
          : { 'Content-Type': mimeType },
        body: input.file,
      });

      if (!putResponse.ok) {
        throw new Error(`Upload failed with status ${putResponse.status}`);
      }

      await api.post('/files/attach', {
        fileId: fileData.id,
        entityType: input.entityType,
        resumeTitle: input.resumeTitle || undefined,
        isPrimary: input.isPrimary,
        replaceResumeId: input.replaceResumeId,
      });

      set({ isUploading: false });
      return fileData;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to upload file');
      set({ isUploading: false, error: message });
      throw new Error(message);
    }
  },

  deleteFile: async (fileId) => {
    set({ isDeleting: true, error: null });

    try {
      await api.delete(`/files/${fileId}`);
      set({ isDeleting: false });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to delete file');
      set({ isDeleting: false, error: message });
      throw new Error(message);
    }
  },

  getDownloadUrl: async (fileId) => {
    try {
      const response = await api.get(`/files/${fileId}/download-url`);
      const downloadUrl = response.data?.downloadUrl;
      if (typeof downloadUrl !== 'string' || !downloadUrl) {
        throw new Error('Download URL is missing');
      }

      return downloadUrl;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to get download URL'));
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
