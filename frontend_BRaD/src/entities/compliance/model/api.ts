import api from '@shared/lib/api';
import type {
  CompanyVerificationDocument,
  CompanyVerificationMe,
  CompanyVerificationQueueItem,
  CompanyVerificationReviewInput,
  CompanyVerificationStatus,
  CompanyVerificationSubmissionInput,
  ComplaintAction,
  Complaint,
  ComplaintInput,
  ComplaintStatus,
  ConsentType,
  DeleteRequest,
  DeletionRequestStatus,
  ExportFileIndexItem,
  ModerateComplaintInput,
  PrivacyConsent,
  PrivacyConsentInput,
  PrivacyExport,
  ProcessDeleteRequestInput,
} from './types';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const asBoolean = (value: unknown): boolean => {
  return value === true;
};

const asArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const compact = <T>(items: Array<T | null | undefined>): T[] => {
  return items.filter((item): item is T => item !== null && item !== undefined);
};

const extractItems = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  if (Array.isArray(record.items)) {
    return record.items;
  }

  if (Array.isArray(record.data)) {
    return record.data;
  }

  return [];
};

const toCompanyVerificationQueueItem = (value: unknown): CompanyVerificationQueueItem | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = asString(record.id);
  if (!id) {
    return null;
  }

  const company = asRecord(record.company);

  return {
    id,
    status: (asString(record.status) || 'PENDING') as CompanyVerificationStatus,
    binIin: asString(record.binIin) || undefined,
    legalName: asString(record.legalName) || undefined,
    companyId: asString(record.companyId) || undefined,
    companyName: asString(company?.name) || undefined,
    createdAt: asString(record.createdAt) || undefined,
    documents: compact(
      asArray(record.documents).map((entry) => {
        const doc = asRecord(entry);
        if (!doc) {
          return null;
        }

        const normalized: CompanyVerificationDocument = {
          id: asString(doc.id) || undefined,
          fileId: asString(doc.fileId) || undefined,
        };
        return normalized;
      }),
    ),
  };
};

const toCompanyVerificationMe = (payload: unknown): CompanyVerificationMe => {
  const record = asRecord(payload) || {};

  return {
    id: asString(record.id),
    name: asString(record.name) || undefined,
    verificationStatus: (asString(record.verificationStatus) || 'PENDING') as CompanyVerificationStatus,
    verificationDueAt: asString(record.verificationDueAt) || null,
    verificationReviewedAt: asString(record.verificationReviewedAt) || null,
    verificationComment: asString(record.verificationComment) || null,
    verificationSubmissions: compact(
      asArray(record.verificationSubmissions).map((entry) => {
        const submission = asRecord(entry);
        if (!submission) {
          return null;
        }

        const submissionId = asString(submission.id);
        if (!submissionId) {
          return null;
        }

        return {
          id: submissionId,
          status: (asString(submission.status) || 'PENDING') as CompanyVerificationStatus,
          binIin: asString(submission.binIin) || undefined,
          reviewComment: asString(submission.reviewComment) || null,
          createdAt: asString(submission.createdAt) || undefined,
          documents: compact(
            asArray(submission.documents).map((docEntry) => {
              const doc = asRecord(docEntry);
              if (!doc) {
                return null;
              }

              const normalized: CompanyVerificationDocument = {
                id: asString(doc.id) || undefined,
                fileId: asString(doc.fileId) || undefined,
              };
              return normalized;
            }),
          ),
        };
      }),
    ),
  };
};

const toComplaint = (value: unknown): Complaint | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = asString(record.id);
  if (!id) {
    return null;
  }

  return {
    id,
    targetType: (asString(record.targetType) || 'VACANCY') as Complaint['targetType'],
    targetId: asString(record.targetId),
    reason: asString(record.reason),
    details: asString(record.details) || undefined,
    status: (asString(record.status) || 'OPEN') as ComplaintStatus,
    createdAt: asString(record.createdAt) || undefined,
    actions: compact(
      asArray(record.actions).map((entry) => {
        const action = asRecord(entry);
        if (!action) {
          return null;
        }

        const normalized: ComplaintAction = {
          id: asString(action.id) || undefined,
          actionType: asString(action.actionType) as ModerateComplaintInput['actionType'],
          note: asString(action.note) || undefined,
          createdAt: asString(action.createdAt) || undefined,
        };
        return normalized;
      }),
    ),
  };
};

const toPrivacyConsent = (value: unknown): PrivacyConsent | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = asString(record.id);
  if (!id) {
    return null;
  }

  return {
    id,
    type: (asString(record.type) || 'PRIVACY') as ConsentType,
    version: asString(record.version),
    accepted: asBoolean(record.accepted),
    createdAt: asString(record.createdAt) || undefined,
  };
};

const toDeleteRequest = (value: unknown): DeleteRequest | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = asString(record.id);
  if (!id) {
    return null;
  }

  const user = asRecord(record.user);

  return {
    id,
    status: (asString(record.status) || 'REQUESTED') as DeletionRequestStatus,
    reason: asString(record.reason) || undefined,
    note: asString(record.note) || undefined,
    createdAt: asString(record.createdAt) || undefined,
    scheduledHardDeleteAt: asString(record.scheduledHardDeleteAt) || undefined,
    user: user
      ? {
          id: asString(user.id) || undefined,
          email: asString(user.email) || undefined,
        }
      : undefined,
  };
};

export const complianceApi = {
  submitCompanyVerification: async (
    payload: CompanyVerificationSubmissionInput,
  ): Promise<unknown> => {
    const response = await api.post('/compliance/company-verification/submissions', payload);
    return response.data;
  },

  getMyCompanyVerification: async (): Promise<CompanyVerificationMe> => {
    const response = await api.get('/compliance/company-verification/me');
    return toCompanyVerificationMe(response.data);
  },

  listCompanyVerificationQueue: async (
    status?: CompanyVerificationStatus,
  ): Promise<CompanyVerificationQueueItem[]> => {
    const response = await api.get('/compliance/company-verification/queue', {
      params: status ? { status } : undefined,
    });

    return extractItems(response.data)
      .map((entry) => toCompanyVerificationQueueItem(entry))
      .filter((entry): entry is CompanyVerificationQueueItem => Boolean(entry));
  },

  reviewCompanyVerificationSubmission: async (
    id: string,
    payload: CompanyVerificationReviewInput,
  ): Promise<unknown> => {
    const response = await api.patch(`/compliance/company-verification/submissions/${id}/review`, payload);
    return response.data;
  },

  createComplaint: async (payload: ComplaintInput): Promise<Complaint | null> => {
    const response = await api.post('/compliance/complaints', payload);
    return toComplaint(response.data);
  },

  listMyComplaints: async (): Promise<Complaint[]> => {
    const response = await api.get('/compliance/complaints/my');
    return extractItems(response.data)
      .map((entry) => toComplaint(entry))
      .filter((entry): entry is Complaint => Boolean(entry));
  },

  listComplaintsQueue: async (status?: ComplaintStatus): Promise<Complaint[]> => {
    const response = await api.get('/compliance/complaints/admin', {
      params: status ? { status } : undefined,
    });

    return extractItems(response.data)
      .map((entry) => toComplaint(entry))
      .filter((entry): entry is Complaint => Boolean(entry));
  },

  moderateComplaint: async (
    id: string,
    payload: ModerateComplaintInput,
  ): Promise<Complaint | null> => {
    const response = await api.patch(`/compliance/complaints/${id}/moderate`, payload);
    return toComplaint(response.data);
  },

  saveConsent: async (payload: PrivacyConsentInput): Promise<PrivacyConsent | null> => {
    const response = await api.post('/compliance/privacy/consents', payload);
    return toPrivacyConsent(response.data);
  },

  listMyConsents: async (): Promise<PrivacyConsent[]> => {
    const response = await api.get('/compliance/privacy/consents/my');
    return extractItems(response.data)
      .map((entry) => toPrivacyConsent(entry))
      .filter((entry): entry is PrivacyConsent => Boolean(entry));
  },

  exportMyData: async (): Promise<PrivacyExport> => {
    const response = await api.get('/compliance/privacy/export/my');
    const record = asRecord(response.data) || {};

    return {
      exportedAt: asString(record.exportedAt) || undefined,
      user: asRecord(record.user)
        ? {
            id: asString(asRecord(record.user)?.id) || undefined,
            email: asString(asRecord(record.user)?.email) || undefined,
          }
        : undefined,
      filesIndex: compact(
        asArray(record.filesIndex).map((entry) => {
          const file = asRecord(entry);
          if (!file) {
            return null;
          }

          const normalized: ExportFileIndexItem = {
            id: asString(file.id) || undefined,
            type: asString(file.type) || undefined,
            filename: asString(file.filename) || undefined,
            mimeType: asString(file.mimeType) || undefined,
            sizeBytes: typeof file.sizeBytes === 'number' ? file.sizeBytes : undefined,
          };
          return normalized;
        }),
      ),
    };
  },

  createDeleteRequest: async (reason: string): Promise<DeleteRequest | null> => {
    const response = await api.post('/compliance/privacy/delete-request', { reason });
    return toDeleteRequest(response.data);
  },

  cancelDeleteRequest: async (): Promise<DeleteRequest | null> => {
    const response = await api.post('/compliance/privacy/delete-request/cancel');
    return toDeleteRequest(response.data);
  },

  listDeleteRequestsQueue: async (status?: DeletionRequestStatus): Promise<DeleteRequest[]> => {
    const response = await api.get('/compliance/privacy/delete-requests/admin', {
      params: status ? { status } : undefined,
    });

    return extractItems(response.data)
      .map((entry) => toDeleteRequest(entry))
      .filter((entry): entry is DeleteRequest => Boolean(entry));
  },

  processDeleteRequest: async (
    id: string,
    payload: ProcessDeleteRequestInput,
  ): Promise<DeleteRequest | null> => {
    const response = await api.patch(`/compliance/privacy/delete-requests/${id}/process`, payload);
    return toDeleteRequest(response.data);
  },
};
