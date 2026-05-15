import { create } from 'zustand';
import api, { getApiErrorMessage } from '@shared/lib/api';
import type { UploadAndAttachInput, UploadAndAttachResult, UploadedFile } from './types';

interface MediaStore {
  isUploading: boolean;
  isDeleting: boolean;
  error: string | null;
  uploadAndAttach: (input: UploadAndAttachInput) => Promise<UploadAndAttachResult>;
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

const getResponseStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
};

const getMediaErrorMessage = (error: unknown, fallback: string): string => {
  const status = getResponseStatus(error);
  const message = getApiErrorMessage(error, fallback);
  const normalizedMessage = message.toLowerCase();

  if (status === 401) {
    return 'Session expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You do not have permission for this action.';
  }

  if (status === 404) {
    return 'File not found.';
  }

  if (status === 503) {
    return message || 'Storage is temporarily unavailable. Please try again.';
  }

  if (status === 400 && normalizedMessage.includes('file is not uploaded yet')) {
    return 'File is not uploaded yet. Complete upload before attach';
  }

  if (status === 400) {
    return message || 'Invalid file type, size, or upload target.';
  }

  return message;
};

export const useMediaStore = create<MediaStore>((set) => ({
  isUploading: false,
  isDeleting: false,
  error: null,

  uploadAndAttach: async (input) => {
    set({ isUploading: true, error: null });

    try {
      const formData = new FormData();
      formData.append('target', input.target);
      formData.append('file', input.file);
      if (input.entityType) {
        formData.append('entityType', input.entityType);
      }

      if (input.resumeTitle?.trim()) {
        formData.append('resumeTitle', input.resumeTitle.trim());
      }

      if (input.replaceResumeId) {
        formData.append('replaceResumeId', input.replaceResumeId);
      }

      if (input.isPrimary !== undefined) {
        formData.append('isPrimary', String(input.isPrimary));
      }

      const response = await api.post('/uploads/proxy', formData);

      const payload = isRecord(response.data) ? response.data : {};
      const fileData = normalizeUploadedFile(payload.file ?? payload);
      const attachment = isRecord(payload.attachment) ? payload.attachment : null;

      set({ isUploading: false });
      return {
        file: fileData,
        attachment,
      };
    } catch (error) {
      const message = getMediaErrorMessage(error, 'Failed to upload file');
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
      const message = getMediaErrorMessage(error, 'Failed to delete file');
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
      throw new Error(getMediaErrorMessage(error, 'Failed to get download URL'));
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
