import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileUp,
  Paperclip,
  MessageSquare,
  PlayCircle,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useApplicationStore } from '@entities/application';
import { useMediaStore } from '@entities/media';
import { useMiniInternshipStore } from '@entities/mini-internship';
import {
  cardStyle,
  formatDateTime,
  formatEnumLabel,
  getFileLabel,
  getPersonName,
  getSubmissionLinks,
  normalizeDecisionStatus,
  splitLines,
} from './shared';

const formatCountdown = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

type QuestionAnswerDraft = {
  questionId: string;
  answerText: string;
  selectedOptionIds: string[];
};

const createAnswerDraft = (questionId: string): QuestionAnswerDraft => ({
  questionId,
  answerText: '',
  selectedOptionIds: [],
});

const normalizeAnswerDrafts = (
  drafts: QuestionAnswerDraft[],
): Array<{ questionId: string; answerText?: string; selectedOptionIds?: string[] }> =>
  drafts.map((draft) => ({
    questionId: draft.questionId,
    answerText: draft.answerText.trim(),
    selectedOptionIds: draft.selectedOptionIds,
  }));

export const MiniInternshipSubmitPage = () => {
  const { t } = useUISettings();
  const { id } = useParams<{ id: string }>();
  const { currentUser, isAuthenticated } = useUserStore();
  const { items: applications, listApplications } = useApplicationStore();
  const { uploadAndAttach, isUploading } = useMediaStore();
  const {
    selectedMiniInternship,
    selectedSubmission,
    loadMiniInternship,
    loadSubmission,
    startMiniInternship,
    updateSubmission,
    submitSubmission,
    submitReflection,
    addSubmissionToPortfolio,
    isLoading,
    isMutating,
    error,
  } = useMiniInternshipStore();
  const [answerText, setAnswerText] = useState('');
  const [externalLinksText, setExternalLinksText] = useState('');
  const [taskAnswerDrafts, setTaskAnswerDrafts] = useState<QuestionAnswerDraft[]>([]);
  const [reflectionAnswerDrafts, setReflectionAnswerDrafts] = useState<QuestionAnswerDraft[]>([]);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [localSelectedFile, setLocalSelectedFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const isAllowed = isAuthenticated && isCandidateRole(currentUser?.role);
  const miniInternship = selectedMiniInternship?.id === id ? selectedMiniInternship : null;
  const activeSubmission =
    (miniInternship?.currentSubmission &&
      (selectedSubmission?.id === miniInternship.currentSubmission.id
        ? selectedSubmission
        : miniInternship.currentSubmission)) ||
    (selectedSubmission?.miniInternshipId === id ? selectedSubmission : null);

  const matchedApplication = useMemo(() => {
    if (!miniInternship?.vacancyId) {
      return null;
    }

    return (
      applications.find(
        (application) =>
          application.vacancyId === miniInternship.vacancyId &&
      application.status !== 'WITHDRAWN',
    ) || null
    );
  }, [applications, miniInternship?.vacancyId]);
  const allQuestions =
    miniInternship?.questions ||
    activeSubmission?.questions ||
    activeSubmission?.miniInternship?.questions ||
    [];
  const taskQuestions = useMemo(
    () => {
      if (miniInternship?.taskQuestions?.length) {
        return miniInternship.taskQuestions;
      }

      if (activeSubmission?.taskQuestions?.length) {
        return activeSubmission.taskQuestions;
      }

      if (activeSubmission?.miniInternship?.taskQuestions?.length) {
        return activeSubmission.miniInternship.taskQuestions;
      }

      const scoped = allQuestions.filter((question) => question.scope === 'TASK');
      return scoped.length ? scoped : allQuestions;
    },
    [
      allQuestions,
      activeSubmission?.miniInternship?.taskQuestions,
      activeSubmission?.taskQuestions,
      miniInternship?.taskQuestions,
    ],
  );
  const reflectionQuestions = useMemo(
    () => {
      if (miniInternship?.reflectionQuestions?.length) {
        return miniInternship.reflectionQuestions;
      }

      if (activeSubmission?.reflectionQuestions?.length) {
        return activeSubmission.reflectionQuestions;
      }

      if (activeSubmission?.miniInternship?.reflectionQuestions?.length) {
        return activeSubmission.miniInternship.reflectionQuestions;
      }

      return allQuestions.filter((question) => question.scope === 'REFLECTION');
    },
    [
      allQuestions,
      activeSubmission?.miniInternship?.reflectionQuestions,
      activeSubmission?.reflectionQuestions,
      miniInternship?.reflectionQuestions,
    ],
  );
  const canEditSubmission = Boolean(
    activeSubmission &&
      !['REVIEWED', 'REJECTED'].includes(String(activeSubmission.status || '').toUpperCase()) &&
      !activeSubmission.reviewedAt,
  );
  const canEditReflection = Boolean(
    activeSubmission &&
      !activeSubmission.reflectionSubmittedAt &&
      ['SUBMITTED', 'LATE'].includes(String(activeSubmission.status || '').toUpperCase()),
  );
  const taskQuestion =
    miniInternship?.taskInstructions?.trim() ||
    miniInternship?.description?.trim() ||
    t('miniInternships.noQuestionText');
  const configuredTimeLimitMinutes =
    activeSubmission?.timeLimitMinutesSnapshot ?? miniInternship?.timeLimitMinutes ?? null;
  const effectiveTimeLimitMinutes =
    typeof configuredTimeLimitMinutes === 'number' && configuredTimeLimitMinutes > 0
      ? configuredTimeLimitMinutes
      : null;
  const startedAtMs = activeSubmission?.startedAt ? Date.parse(activeSubmission.startedAt) : null;
  const deadlineAtMs =
    effectiveTimeLimitMinutes && startedAtMs !== null && !Number.isNaN(startedAtMs)
      ? startedAtMs + effectiveTimeLimitMinutes * 60_000
      : null;
  const remainingSeconds =
    deadlineAtMs !== null ? Math.max(0, Math.ceil((deadlineAtMs - now) / 1000)) : null;
  const submittedSpentSeconds =
    activeSubmission?.timeSpentSeconds ??
    (activeSubmission?.startedAt && activeSubmission?.submittedAt
      ? Math.max(
          0,
          Math.round(
            (Date.parse(activeSubmission.submittedAt) - Date.parse(activeSubmission.startedAt)) /
              1000,
          ),
        )
      : null);
  const showTimer = Boolean(effectiveTimeLimitMinutes && startedAtMs !== null);
  const timerIsExpired = Boolean(showTimer && canEditSubmission && remainingSeconds === 0);
  const shouldShowReflectionSection =
    reflectionQuestions.length > 0 &&
    (canEditReflection ||
      Boolean(activeSubmission?.reflectionSubmittedAt) ||
      ['SUBMITTED', 'LATE', 'REVIEWED', 'REJECTED'].includes(
        String(activeSubmission?.status || '').toUpperCase(),
      ));

  useEffect(() => {
    if (!isAllowed || !id) {
      return;
    }

    void loadMiniInternship(id);
  }, [id, isAllowed, loadMiniInternship]);

  useEffect(() => {
    if (!isAllowed || !id || !miniInternship?.vacancyId) {
      return;
    }

    void listApplications(currentUser?.role, {
      vacancyId: miniInternship.vacancyId,
      limit: 100,
      offset: 0,
    });
  }, [currentUser?.role, id, isAllowed, listApplications, miniInternship?.vacancyId]);

  useEffect(() => {
    if (!activeSubmission) {
      setAnswerText('');
      setExternalLinksText('');
      setTaskAnswerDrafts([]);
      setReflectionAnswerDrafts([]);
      return;
    }

    setAnswerText(activeSubmission.answerText || '');
    setExternalLinksText(getSubmissionLinks(activeSubmission.externalLinks).join('\n'));
    setTaskAnswerDrafts(
      taskQuestions.map((question) => {
        const existing = activeSubmission.questionAnswers?.find(
          (answer) => answer.questionId === question.id,
        );

        return {
          questionId: question.id,
          answerText: existing?.answerText || '',
          selectedOptionIds: existing?.selectedOptionIds || [],
        };
      }),
    );
    setReflectionAnswerDrafts(
      reflectionQuestions.map((question) => {
        const existing = activeSubmission.reflectionAnswers?.find(
          (answer) => answer.questionId === question.id,
        );

        return {
          questionId: question.id,
          answerText: existing?.answerText || '',
          selectedOptionIds: existing?.selectedOptionIds || [],
        };
      }),
    );
  }, [activeSubmission, reflectionQuestions, taskQuestions]);

  useEffect(() => {
    if (!activeSubmission?.id) {
      return;
    }

    void loadSubmission(activeSubmission.id);
  }, [activeSubmission?.id, loadSubmission]);

  useEffect(() => {
    if (!showTimer) {
      return;
    }

    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [showTimer]);

  const updateDraftAnswerText = (
    setter: typeof setTaskAnswerDrafts,
    questionId: string,
    value: string,
  ) => {
    setter((prev) =>
      prev.map((draft) =>
        draft.questionId === questionId ? { ...draft, answerText: value } : draft,
      ),
    );
  };

  const toggleDraftOption = (
    setter: typeof setTaskAnswerDrafts,
    questionId: string,
    optionId: string,
    multiple: boolean,
  ) => {
    setter((prev) =>
      prev.map((draft) => {
        if (draft.questionId !== questionId) {
          return draft;
        }

        if (!multiple) {
          return {
            ...draft,
            selectedOptionIds: [optionId],
          };
        }

        const exists = draft.selectedOptionIds.includes(optionId);
        return {
          ...draft,
          selectedOptionIds: exists
            ? draft.selectedOptionIds.filter((id) => id !== optionId)
            : [...draft.selectedOptionIds, optionId],
        };
      }),
    );
  };

  const handleStart = async () => {
    if (!id || !miniInternship) {
      return;
    }

    setActionError(null);

    try {
      await startMiniInternship(
        id,
        matchedApplication ? { applicationId: matchedApplication.id } : undefined,
      );
      setPageSuccess(t('miniInternships.startSuccess'));
    } catch (startError) {
      setActionError(startError instanceof Error ? startError.message : t('miniInternships.startFailed'));
    }
  };

  const handleSave = async () => {
    if (!activeSubmission || !canEditSubmission) {
      return;
    }

    setActionError(null);
    setPageSuccess(null);

    try {
      await updateSubmission(activeSubmission.id, {
        answerText: answerText.trim(),
        externalLinks: splitLines(externalLinksText),
        questionAnswers: normalizeAnswerDrafts(taskAnswerDrafts),
      });
      setPageSuccess(t('miniInternships.savedDraft'));
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : t('miniInternships.saveFailed'));
    }
  };

  const handleSubmit = async () => {
    if (!activeSubmission || !canEditSubmission) {
      return;
    }

    setActionError(null);
    setPageSuccess(null);

    try {
      await updateSubmission(activeSubmission.id, {
        answerText: answerText.trim(),
        externalLinks: splitLines(externalLinksText),
        questionAnswers: normalizeAnswerDrafts(taskAnswerDrafts),
      });
      await submitSubmission(activeSubmission.id);
      setPageSuccess(t('miniInternships.submitSuccess'));
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : t('miniInternships.submitFailed'));
    }
  };

  const handleSaveReflection = async () => {
    if (!activeSubmission || !canEditReflection) {
      return;
    }

    setActionError(null);
    setPageSuccess(null);

    try {
      await submitReflection(activeSubmission.id, {
        questionAnswers: normalizeAnswerDrafts(reflectionAnswerDrafts),
      });
      setPageSuccess(t('miniInternships.reflectionSaved'));
    } catch (reflectionError) {
      setActionError(
        reflectionError instanceof Error ? reflectionError.message : t('miniInternships.saveFailed'),
      );
    }
  };

  const handleUploadFile = async () => {
    if (!activeSubmission || !localSelectedFile || !canEditSubmission) {
      return;
    }

    setFileUploadError(null);
    setPageSuccess(null);

    try {
      await uploadAndAttach({
        file: localSelectedFile,
        target: 'TASK_SUBMISSION',
        submissionId: activeSubmission.id,
      });
      await loadSubmission(activeSubmission.id);
      setLocalSelectedFile(null);
      setPageSuccess(t('miniInternships.fileUploaded'));
    } catch (uploadError) {
      setFileUploadError(uploadError instanceof Error ? uploadError.message : t('miniInternships.uploadFailed'));
    }
  };

  const handleAddToPortfolio = async () => {
    if (!activeSubmission) {
      return;
    }

    setActionError(null);

    try {
      await addSubmissionToPortfolio(activeSubmission.id);
      setPageSuccess(t('miniInternships.addedToPortfolio'));
    } catch (portfolioError) {
      setActionError(
        portfolioError instanceof Error ? portfolioError.message : t('miniInternships.portfolioFailed'),
      );
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/app/login" replace />;
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <section className="app-section-card p-8 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
            <h1 className="app-title mt-4 text-3xl">{t('miniInternships.accessDeniedTitle')}</h1>
            <p className="app-text-muted mt-2">{t('miniInternships.accessDeniedDescription')}</p>
          </section>
        </main>
      </div>
    );
  }

  if (!miniInternship && !isLoading) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <section className="app-section-card p-8 text-center">
            <h1 className="app-title text-3xl">{t('miniInternships.notFoundTitle')}</h1>
            <p className="app-text-muted mt-2">{t('miniInternships.notFoundDescription')}</p>
            <div className="mt-6">
              <Link to="/app/mini-internships">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4" />
                  {t('miniInternships.backToCatalog')}
                </Button>
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />

      <main className="app-page-main">
        <Link
          to={`/app/mini-internships/${id}`}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--surface-text-muted)] transition-colors hover:text-[var(--surface-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('miniInternships.backToDetails')}
        </Link>

        <section className="app-section-card app-page-hero app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-chip mb-4">
                <FileUp className="h-3.5 w-3.5" />
                {t('miniInternships.submitTitle')}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">{miniInternship?.title}</h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {miniInternship?.taskInstructions || miniInternship?.description || t('miniInternships.noDescription')}
              </p>
            </div>

            <div className="app-kpi-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                {t('miniInternships.currentStatus')}
              </p>
              <p className="mt-2 text-xl font-extrabold text-[var(--surface-text-primary)]">
                {activeSubmission ? formatEnumLabel(activeSubmission.status) : t('miniInternships.notStarted')}
              </p>
            </div>
          </div>
        </section>

        {(error || actionError || fileUploadError || pageSuccess || isLoading || isMutating || isUploading) && (
          <div className="mt-4 space-y-2">
            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' }}>
                {error}
              </div>
            )}
            {actionError && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-warning-bg)', color: 'var(--tone-warning-text)' }}>
                {actionError}
              </div>
            )}
            {fileUploadError && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-warning-bg)', color: 'var(--tone-warning-text)' }}>
                {fileUploadError}
              </div>
            )}
            {pageSuccess && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-success-bg)', color: 'var(--tone-success-text)' }}>
                {pageSuccess}
              </div>
            )}
            {isLoading && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                {t('miniInternships.loading')}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            {!activeSubmission ? (
              <div className="app-section-card p-6">
                <h2 className="app-title text-2xl">{t('miniInternships.startPromptTitle')}</h2>
                <p className="app-text-muted mt-2">{t('miniInternships.startPromptDescription')}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="hero" onClick={() => void handleStart()}>
                    <PlayCircle className="h-4 w-4" />
                    {t('miniInternships.startAttempt')}
                  </Button>
                  <Link to="/app/mini-internships">
                    <Button variant="outline">{t('miniInternships.backToCatalog')}</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="app-section-card p-5 sm:p-6" style={cardStyle}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.attemptMeta')}
                      </p>
                      <h2 className="app-title mt-2 text-2xl">
                        {getPersonName(activeSubmission.student, t('common.candidate'))}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--surface-text-muted)]">
                      <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                        {formatEnumLabel(activeSubmission.status)}
                      </span>
                      <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                        {t('miniInternships.attemptNumber', { number: activeSubmission.attemptNumber })}
                      </span>
                      {activeSubmission.applicationId && (
                        <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                          {t('miniInternships.applicationLinked')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.startedAt')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                        {formatDateTime(activeSubmission.startedAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.submittedAt')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                        {formatDateTime(activeSubmission.submittedAt || undefined)}
                      </p>
                    </div>
                    {showTimer && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          backgroundColor: timerIsExpired
                            ? 'var(--tone-danger-bg)'
                            : 'var(--surface-soft)',
                        }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                          {canEditSubmission
                            ? t('miniInternships.timeRemaining')
                            : t('miniInternships.timeSpent')}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Clock3
                            className={`h-4 w-4 ${
                              timerIsExpired
                                ? 'text-[var(--tone-danger-text)]'
                                : 'text-[var(--surface-text-primary)]'
                            }`}
                          />
                          <p
                            className={`text-sm font-semibold ${
                              timerIsExpired
                                ? 'text-[var(--tone-danger-text)]'
                                : 'text-[var(--surface-text-primary)]'
                            }`}
                          >
                            {canEditSubmission
                              ? timerIsExpired
                                ? t('miniInternships.timeExpired')
                                : formatCountdown(remainingSeconds || 0)
                              : formatCountdown(submittedSpentSeconds || 0)}
                          </p>
                        </div>
                        {effectiveTimeLimitMinutes && (
                          <p className="mt-2 text-xs text-[var(--surface-text-muted)]">
                            {effectiveTimeLimitMinutes} {t('miniInternships.minutes')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="app-section-card p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[var(--tone-success-text)]" />
                    <h2 className="app-title text-xl">{t('miniInternships.answerTitle')}</h2>
                  </div>
                  <div className="mt-4 space-y-4">
                    {taskQuestions.length ? (
                      taskQuestions.map((question, index) => {
                        const draft =
                          taskAnswerDrafts.find((entry) => entry.questionId === question.id) ||
                          createAnswerDraft(question.id);
                        const hasOptions = Boolean(question.options?.length);
                        const multiple =
                          question.type === 'MULTIPLE_CHOICE' ||
                          (hasOptions && question.options.filter((option) => option.isCorrect).length > 1);
                        const single = !multiple;

                        return (
                          <div key={question.id} className="rounded-2xl border border-[#D6DED7] bg-[var(--surface-soft)] p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-[var(--surface-text-soft)]" />
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                                {t('miniInternships.taskQuestion')}
                              </p>
                              <span className="app-chip">
                                {t('miniInternships.questionNumber', { number: index + 1 })}
                              </span>
                              <span className="app-chip">{formatEnumLabel(question.type)}</span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--surface-text-primary)]">
                              {question.prompt}
                            </p>
                            {question.description && (
                              <p className="mt-2 text-xs text-[var(--surface-text-muted)]">
                                {question.description}
                              </p>
                            )}
                            {!hasOptions || question.type === 'OPEN_ANSWER' ? (
                              <Textarea
                                className="mt-4"
                                value={draft.answerText}
                                onChange={(event) =>
                                  updateDraftAnswerText(setTaskAnswerDrafts, question.id, event.target.value)
                                }
                                placeholder={t('miniInternships.answerTextPlaceholder')}
                                disabled={!canEditSubmission}
                              />
                            ) : (
                              <div className="mt-4 space-y-2">
                                {question.options.map((option) => {
                                  const checked = draft.selectedOptionIds.includes(option.id);
                                  return (
                                    <label
                                      key={option.id}
                                      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#D6DED7] bg-white px-4 py-3 text-sm text-[var(--surface-text-primary)] transition-colors hover:border-[rgba(46,117,82,0.24)] dark:border-[#314036] dark:bg-[#111814]"
                                    >
                                      <input
                                        type={single ? 'radio' : 'checkbox'}
                                        name={`question-${question.id}`}
                                        checked={checked}
                                        onChange={() =>
                                          toggleDraftOption(setTaskAnswerDrafts, question.id, option.id, multiple)
                                        }
                                        disabled={!canEditSubmission}
                                      />
                                      <span className="flex-1">{option.text}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            {miniInternship?.submissionRequirements && index === 0 && (
                              <p className="mt-3 text-xs text-[var(--surface-text-muted)]">
                                {miniInternship.submissionRequirements}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-[#D6DED7] bg-[var(--surface-soft)] p-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-[var(--surface-text-soft)]" />
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                            {t('miniInternships.taskQuestion')}
                          </p>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--surface-text-primary)]">
                          {taskQuestion}
                        </p>
                        {miniInternship?.submissionRequirements && (
                          <p className="mt-3 text-xs text-[var(--surface-text-muted)]">
                            {miniInternship.submissionRequirements}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                        {t('miniInternships.additionalAnswerLabel')}
                      </label>
                      <Textarea
                        value={answerText}
                        onChange={(event) => setAnswerText(event.target.value)}
                        placeholder={t('miniInternships.answerTextPlaceholder')}
                        disabled={!canEditSubmission}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                        {t('miniInternships.externalLinksLabel')}
                      </label>
                      <Textarea
                        value={externalLinksText}
                        onChange={(event) => setExternalLinksText(event.target.value)}
                        placeholder={t('miniInternships.externalLinksPlaceholder')}
                        disabled={!canEditSubmission}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => void handleSave()}
                        disabled={!canEditSubmission || isMutating}
                      >
                        {t('miniInternships.saveDraft')}
                      </Button>
                      <Button
                        variant="hero"
                        onClick={() => void handleSubmit()}
                        disabled={!canEditSubmission || isMutating}
                      >
                        <Send className="h-4 w-4" />
                        {t('miniInternships.submitAttempt')}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="app-section-card p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-[var(--tone-info-text)]" />
                    <h2 className="app-title text-xl">{t('miniInternships.submissionFiles')}</h2>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-[#D6DED7] bg-[var(--surface-soft)] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[#D6DED7] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(18,24,19,0.03)] dark:border-[#314036] dark:bg-[#111814]">
                          <Paperclip className="h-4 w-4 shrink-0 text-[var(--surface-text-soft)]" />
                          <Input
                            type="file"
                            onChange={(event) => setLocalSelectedFile(event.target.files?.[0] || null)}
                            disabled={!canEditSubmission}
                            className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => void handleUploadFile()}
                          disabled={!canEditSubmission || !localSelectedFile || isUploading}
                          className="shrink-0"
                        >
                          <FileUp className="h-4 w-4" />
                          {t('miniInternships.uploadFile')}
                        </Button>
                      </div>
                      {localSelectedFile && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-[var(--surface-text-muted)] shadow-[0_1px_2px_rgba(18,24,19,0.03)] dark:bg-[#111814]">
                          <FileUp className="h-4 w-4 text-[var(--surface-text-soft)]" />
                          <span>
                            {t('miniInternships.selectedFile')}: {localSelectedFile.name}
                          </span>
                        </div>
                      )}

                      <div className="grid gap-3">
                        {activeSubmission.files?.length ? (
                          activeSubmission.files.map((file) => (
                            <div key={file.id} className="rounded-2xl border border-[#D6DED7] p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-semibold text-[var(--surface-text-primary)]">
                                    {getFileLabel(file)}
                                  </p>
                                  <p className="text-sm text-[var(--surface-text-muted)]">
                                    {file.mimeType || t('miniInternships.fileAttached')}
                                  </p>
                                </div>
                                {file.downloadUrl ? (
                                  <a
                                    href={file.downloadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tone-info-text)] hover:underline"
                                  >
                                    {t('common.open')}
                                    <ArrowRight className="h-4 w-4" />
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--surface-text-muted)]">
                            {t('miniInternships.noSubmissionFiles')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {shouldShowReflectionSection && (
                  <div className="app-section-card p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-[var(--tone-info-text)]" />
                      <h2 className="app-title text-xl">{t('miniInternships.reflectionTitle')}</h2>
                    </div>
                    <p className="mt-2 text-sm text-[var(--surface-text-muted)]">
                      {t('miniInternships.reflectionDescription')}
                    </p>
                    <div className="mt-4 space-y-4">
                      {reflectionQuestions.map((question, index) => {
                        const draft =
                          reflectionAnswerDrafts.find((entry) => entry.questionId === question.id) ||
                          createAnswerDraft(question.id);
                        const hasOptions = Boolean(question.options?.length);
                        const multiple =
                          question.type === 'MULTIPLE_CHOICE' ||
                          (hasOptions && question.options.filter((option) => option.isCorrect).length > 1);
                        const single = !multiple;

                        return (
                          <div key={question.id} className="rounded-2xl border border-[#D6DED7] bg-[var(--surface-soft)] p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-[var(--surface-text-soft)]" />
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                                {t('miniInternships.reflectionQuestion')}
                              </p>
                              <span className="app-chip">
                                {t('miniInternships.questionNumber', { number: index + 1 })}
                              </span>
                              <span className="app-chip">{formatEnumLabel(question.type)}</span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--surface-text-primary)]">
                              {question.prompt}
                            </p>
                            {question.description && (
                              <p className="mt-2 text-xs text-[var(--surface-text-muted)]">
                                {question.description}
                              </p>
                            )}
                            {!hasOptions || question.type === 'OPEN_ANSWER' ? (
                              <Textarea
                                className="mt-4"
                                value={draft.answerText}
                                onChange={(event) =>
                                  updateDraftAnswerText(
                                    setReflectionAnswerDrafts,
                                    question.id,
                                    event.target.value,
                                  )
                                }
                                placeholder={t('miniInternships.answerTextPlaceholder')}
                                disabled={!canEditReflection}
                              />
                            ) : (
                              <div className="mt-4 space-y-2">
                                {question.options.map((option) => {
                                  const checked = draft.selectedOptionIds.includes(option.id);
                                  return (
                                    <label
                                      key={option.id}
                                      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#D6DED7] bg-white px-4 py-3 text-sm text-[var(--surface-text-primary)] transition-colors hover:border-[rgba(46,117,82,0.24)] dark:border-[#314036] dark:bg-[#111814]"
                                    >
                                      <input
                                        type={single ? 'radio' : 'checkbox'}
                                        name={`reflection-question-${question.id}`}
                                        checked={checked}
                                        onChange={() =>
                                          toggleDraftOption(
                                            setReflectionAnswerDrafts,
                                            question.id,
                                            option.id,
                                            multiple,
                                          )
                                        }
                                        disabled={!canEditReflection}
                                      />
                                      <span className="flex-1">{option.text}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => void handleSaveReflection()}
                        disabled={!canEditReflection || isMutating}
                      >
                        {t('miniInternships.saveReflection')}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="space-y-4">
            {activeSubmission && (
              <div className="app-section-card p-5 sm:p-6 sticky top-28">
                <h2 className="app-title text-xl">{t('miniInternships.reviewSnapshot')}</h2>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.score')}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">
                      {activeSubmission.weightedScore ?? activeSubmission.averageScore ?? activeSubmission.overallScore ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.decisionStatus')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatEnumLabel(normalizeDecisionStatus(activeSubmission.decisionStatus))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.portfolioEligibility')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {activeSubmission.allowCandidateToAddToPortfolio ? t('common.yes') : t('common.no')}
                    </p>
                  </div>
                </div>

                {activeSubmission.decisionStatus === 'reviewed' &&
                  activeSubmission.allowCandidateToAddToPortfolio &&
                  !activeSubmission.portfolioAchievement && (
                    <Button
                      variant="hero"
                      className="mt-5 w-full"
                      onClick={() => void handleAddToPortfolio()}
                    >
                      {t('miniInternships.addToPortfolio')}
                    </Button>
                  )}

                {activeSubmission.portfolioAchievement && (
                  <div className="mt-5 rounded-2xl bg-[var(--tone-success-bg)] p-4 text-[var(--tone-success-text)]">
                    {t('miniInternships.alreadyInPortfolio')}
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3">
                  <Link to={`/app/my-submissions/${activeSubmission.id}`}>
                    <Button variant="outline" className="w-full">
                      {t('miniInternships.openSubmission')}
                    </Button>
                  </Link>
                  <Link to="/app/my-submissions">
                    <Button variant="outline" className="w-full">
                      {t('miniInternships.mySubmissions')}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {miniInternship?.vacancyId && matchedApplication && (
              <div className="app-section-card p-5 sm:p-6">
                <h2 className="app-title text-xl">{t('miniInternships.linkedApplication')}</h2>
                <p className="app-text-muted mt-2 text-sm">
                  {t('miniInternships.linkedApplicationStatus', {
                    status: matchedApplication.status,
                  })}
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};
