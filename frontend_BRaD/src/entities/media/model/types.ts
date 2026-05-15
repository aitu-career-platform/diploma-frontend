export type MediaUploadTarget =
  | 'USER_AVATAR'
  | 'COMPANY_LOGO'
  | 'CANDIDATE_RESUME'
  | 'CANDIDATE_PORTFOLIO';

export interface UploadedFile {
  id: string;
  status?: string;
  type?: string;
  filename: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
  downloadUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UploadAndAttachInput {
  file: File;
  target: MediaUploadTarget;
  entityType?: MediaUploadTarget;
  resumeTitle?: string;
  isPrimary?: boolean;
  replaceResumeId?: string;
}

export interface UploadAndAttachResult {
  file: UploadedFile;
  attachment?: Record<string, unknown> | null;
}
