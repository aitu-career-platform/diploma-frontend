export type MiniInternshipStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type MiniInternshipAccessMode = 'PUBLIC' | 'INVITE_ONLY' | 'VACANCY_LINKED';
export type MiniInternshipQuestionType = 'OPEN_ANSWER' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
export type MiniInternshipQuestionScope = 'TASK' | 'REFLECTION';
export type TaskSubmissionStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'LATE'
  | 'REVIEWED'
  | 'REJECTED';
export type TaskDecisionStatus = 'reviewed' | 'accepted' | 'rejected' | 'shortlisted';
export type IntegritySeverity = 'NORMAL' | 'WARNING' | 'SUSPICIOUS';

export interface MiniInternshipCompany {
  id: string;
  name: string;
}

export interface MiniInternshipVacancy {
  id: string;
  title: string;
  status?: string;
}

export interface MiniInternshipAuthor {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface MiniInternshipSkillCriterion {
  id?: string;
  name: string;
  description?: string | null;
  maxScore: number;
  weight?: number | null;
  sortOrder?: number;
}

export interface MiniInternshipQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  sortOrder?: number;
}

export interface MiniInternshipQuestion {
  id: string;
  scope: MiniInternshipQuestionScope;
  type: MiniInternshipQuestionType;
  prompt: string;
  description?: string | null;
  required?: boolean;
  sortOrder?: number;
  options: MiniInternshipQuestionOption[];
}

export interface MiniInternshipFile {
  id: string;
  type?: string;
  status?: string;
  filename: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
  downloadUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MiniInternshipSummary {
  id: string;
  companyId: string;
  vacancyId?: string | null;
  accessMode?: MiniInternshipAccessMode;
  title: string;
  roleCategory: string;
  status: MiniInternshipStatus;
  description?: string;
  taskInstructions?: string;
  deadline: string;
  timeLimitMinutes?: number | null;
  allowedAttempts: number;
  submissionRequirements?: string;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  company?: MiniInternshipCompany | null;
  vacancy?: MiniInternshipVacancy | null;
  author?: MiniInternshipAuthor | null;
  skillCriteria: MiniInternshipSkillCriterion[];
  questions?: MiniInternshipQuestion[];
  questionCount?: number;
  reflectionQuestionCount?: number;
  submissionCount?: number;
}

export interface MiniInternshipDetail extends MiniInternshipSummary {
  files: MiniInternshipFile[];
  taskQuestions?: MiniInternshipQuestion[];
  reflectionQuestions?: MiniInternshipQuestion[];
  submissionStatus?: TaskSubmissionStatus | null;
  currentSubmission?: TaskSubmissionDetail | null;
  attemptsUsed?: number | null;
}

export interface TaskSubmissionStudentProfile {
  city?: string | null;
  country?: string | null;
  desiredRole?: string | null;
  openToWork?: boolean | null;
}

export interface TaskSubmissionStudent {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  candidateProfile?: TaskSubmissionStudentProfile | null;
}

export interface TaskSubmissionApplication {
  id: string;
  status?: string | null;
  vacancyId?: string | null;
}

export interface SubmissionSkillScore {
  id?: string;
  submissionId?: string;
  skillCriterionId: string;
  score: number;
  comment?: string | null;
  skillCriterion?: MiniInternshipSkillCriterion | null;
}

export interface SubmissionExternalLink {
  id?: string;
  url: string;
  label?: string | null;
  type?: string | null;
}

export interface TaskSubmissionHistoryEntry {
  id?: string;
  eventType: string;
  note?: string | null;
  createdAt?: string;
  actorId?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface IntegrityIndicator {
  id?: string;
  severity: IntegritySeverity;
  code?: string;
  reason: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface TaskSubmissionAiEvaluation {
  provider?: string;
  model?: string;
  summary?: string | null;
  overallScore?: number | null;
  criterionResults?: Array<{
    skillCriterionId: string;
    score: number;
    comment?: string | null;
  }>;
  raw?: Record<string, unknown>;
}

export interface TaskSubmissionSummary {
  id: string;
  miniInternshipId: string;
  studentId: string;
  applicationId?: string | null;
  attemptNumber: number;
  status: TaskSubmissionStatus;
  decisionStatus?: TaskDecisionStatus | null;
  answerText?: string | null;
  externalLinks?: SubmissionExternalLink[] | string[];
  startedAt?: string;
  submittedAt?: string | null;
  deadlineSnapshot?: string | null;
  timeLimitMinutesSnapshot?: number | null;
  timeSpentSeconds?: number | null;
  isLate?: boolean;
  overallScore?: number | null;
  averageScore?: number | null;
  weightedScore?: number | null;
  autoScore?: number | null;
  questionAnswers?: MiniInternshipQuestionAnswer[];
  reflectionAnswers?: MiniInternshipQuestionAnswer[];
  reflectionSubmittedAt?: string | null;
  allowCandidateToAddToPortfolio?: boolean;
  reviewedAt?: string | null;
  miniInternship?: MiniInternshipSummary | null;
  student?: TaskSubmissionStudent | null;
  integrityIndicators?: IntegrityIndicator[];
  skillScores?: SubmissionSkillScore[];
  aiProvider?: string | null;
  aiEvaluatedAt?: string | null;
  aiEvaluationError?: string | null;
  aiEvaluation?: TaskSubmissionAiEvaluation | null;
  portfolioAchievement?: PortfolioAchievement | null;
}

export interface TaskSubmissionDetail extends TaskSubmissionSummary {
  application?: TaskSubmissionApplication | null;
  reviewedById?: string | null;
  reviewedBy?: MiniInternshipAuthor | null;
  overallComment?: string | null;
  history?: TaskSubmissionHistoryEntry[];
  files?: MiniInternshipFile[];
}

export interface MiniInternshipQuestionAnswer {
  questionId: string;
  answerText?: string | null;
  selectedOptionIds?: string[];
  answeredAt?: string | null;
  isCorrect?: boolean | null;
  score?: number | null;
}

export interface PortfolioAchievement {
  id: string;
  submissionId: string;
  studentId?: string;
  miniInternshipId?: string | null;
  companyId?: string | null;
  title: string;
  roleCategory: string;
  decisionStatus?: TaskDecisionStatus | null;
  overallScore?: number | null;
  averageScore?: number | null;
  weightedScore?: number | null;
  allowCandidateToAddToPortfolio?: boolean;
  createdAt?: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  completedAt?: string | null;
  company?: MiniInternshipCompany | null;
  miniInternship?: Pick<MiniInternshipSummary, 'id' | 'title' | 'roleCategory'> | null;
  submission?: Pick<TaskSubmissionDetail, 'id' | 'status' | 'decisionStatus' | 'overallScore' | 'weightedScore' | 'averageScore' | 'reviewedAt'> | null;
  skillScoresSnapshot?: SubmissionSkillScore[] | Record<string, unknown> | null;
  employerComment?: string | null;
  verified?: boolean;
  published?: boolean;
}

export interface MiniInternshipListResponse {
  items: MiniInternshipSummary[];
  total: number;
}

export interface TaskSubmissionListResponse {
  items: TaskSubmissionSummary[];
  total: number;
}

export interface PortfolioAchievementListResponse {
  items: PortfolioAchievement[];
  total: number;
}

export interface MiniInternshipListFilters {
  status?: MiniInternshipStatus | '';
  vacancyId?: string;
}

export interface CreateMiniInternshipPayload {
  title: string;
  description: string;
  taskInstructions: string;
  roleCategory: string;
  deadline: string;
  timeLimitMinutes?: number;
  allowedAttempts?: number;
  submissionRequirements: string;
  vacancyId?: string;
  accessMode?: MiniInternshipAccessMode;
  skillCriteria: MiniInternshipSkillCriterion[];
  questions?: MiniInternshipQuestion[];
}

export type UpdateMiniInternshipPayload = Partial<CreateMiniInternshipPayload>;

export interface StartTaskSubmissionPayload {
  applicationId?: string;
}

export interface UpdateTaskSubmissionPayload {
  answerText?: string;
  externalLinks?: string[];
  questionAnswers?: MiniInternshipQuestionAnswer[];
}

export interface SubmitTaskReflectionPayload {
  questionAnswers?: MiniInternshipQuestionAnswer[];
}

export interface ReviewTaskSubmissionScorePayload {
  skillCriterionId: string;
  score: number;
  comment?: string;
}

export interface ReviewTaskSubmissionPayload {
  decisionStatus: TaskDecisionStatus;
  overallComment?: string;
  allowCandidateToAddToPortfolio?: boolean;
  scores: ReviewTaskSubmissionScorePayload[];
}
