export type MediaUploadTarget =
  | 'USER_AVATAR'
  | 'COMPANY_LOGO'
  | 'CANDIDATE_RESUME'
  | 'CANDIDATE_PORTFOLIO'
  | 'MINI_INTERNSHIP_TASK'
  | 'TASK_SUBMISSION';

export type MediaAttachEntityType =
  | 'USER_AVATAR'
  | 'COMPANY_LOGO'
  | 'CANDIDATE_RESUME'
  | 'CANDIDATE_PORTFOLIO'
  | 'MINI_INTERNSHIP_FILE'
  | 'TASK_SUBMISSION_FILE';

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
  entityType?: MediaAttachEntityType;
  attachEntityType?: MediaAttachEntityType;
  resumeTitle?: string;
  isPrimary?: boolean;
  replaceResumeId?: string;
  miniInternshipId?: string;
  submissionId?: string;
}

export interface UploadAndAttachResult {
  file: UploadedFile;
  attachment?: Record<string, unknown> | null;
}
