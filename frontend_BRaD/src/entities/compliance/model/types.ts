export type CompanyVerificationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETRY_REQUIRED';

export type ComplaintTargetType = 'VACANCY' | 'PROFILE' | 'MESSAGE';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type ModerationActionType = 'HIDE' | 'WARN' | 'BAN' | 'RESTORE';
export type ConsentType = 'PRIVACY' | 'TERMS' | 'MARKETING';
export type DeletionRequestStatus = 'REQUESTED' | 'CANCELED' | 'PROCESSED';

export interface CompanyVerificationSubmissionInput {
  binIin: string;
  companyEmailDomain: string;
  legalName: string;
  address: string;
  comment?: string;
  fileIds: string[];
}

export interface CompanyVerificationDocument {
  id?: string;
  fileId?: string;
}

export interface CompanyVerificationSubmission {
  id: string;
  status: CompanyVerificationStatus;
  binIin?: string;
  reviewComment?: string | null;
  createdAt?: string;
  documents: CompanyVerificationDocument[];
}

export interface CompanyVerificationMe {
  id: string;
  name?: string;
  verificationStatus?: CompanyVerificationStatus;
  verificationDueAt?: string | null;
  verificationReviewedAt?: string | null;
  verificationComment?: string | null;
  verificationSubmissions: CompanyVerificationSubmission[];
}

export interface CompanyVerificationQueueItem {
  id: string;
  status: CompanyVerificationStatus;
  binIin?: string;
  legalName?: string;
  companyId?: string;
  companyName?: string;
  createdAt?: string;
  documents: CompanyVerificationDocument[];
}

export interface CompanyVerificationReviewInput {
  status: CompanyVerificationStatus;
  comment?: string;
}

export interface ComplaintInput {
  targetType: ComplaintTargetType;
  targetId: string;
  reason: string;
  details?: string;
}

export interface ComplaintAction {
  id?: string;
  actionType?: ModerationActionType;
  note?: string;
  createdAt?: string;
}

export interface Complaint {
  id: string;
  targetType: ComplaintTargetType;
  targetId: string;
  reason: string;
  details?: string;
  status: ComplaintStatus;
  createdAt?: string;
  actions?: ComplaintAction[];
}

export interface ModerateComplaintInput {
  actionType: ModerationActionType;
  complaintStatus?: ComplaintStatus;
  note?: string;
}

export interface PrivacyConsentInput {
  type: ConsentType;
  version: string;
  accepted: boolean;
}

export interface PrivacyConsent {
  id: string;
  type: ConsentType;
  version: string;
  accepted: boolean;
  createdAt?: string;
}

export interface ExportFileIndexItem {
  id?: string;
  type?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface PrivacyExport {
  exportedAt?: string;
  user?: {
    id?: string;
    email?: string;
  };
  filesIndex: ExportFileIndexItem[];
}

export interface DeleteRequest {
  id: string;
  status: DeletionRequestStatus;
  reason?: string;
  note?: string;
  createdAt?: string;
  scheduledHardDeleteAt?: string;
  user?: {
    id?: string;
    email?: string;
  };
}

export interface ProcessDeleteRequestInput {
  status: DeletionRequestStatus;
  note?: string;
}

export type ComplianceApiError = {
  statusCode: number;
  message: string | string[];
  error: string;
};
