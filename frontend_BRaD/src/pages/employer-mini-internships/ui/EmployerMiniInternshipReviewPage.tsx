import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  ShieldAlert,
  Star,
} from "lucide-react";
import { AppHeader } from "@widgets/app-header";
import { Button, Input, Textarea } from "@shared/ui";
import { useUISettings } from "@shared/lib/ui-settings";
import { isEmployerRole, useUserStore } from "@entities/user";
import {
  useMiniInternshipStore,
  type MiniInternshipSkillCriterion,
  type ReviewTaskSubmissionScorePayload,
  type SubmissionSkillScore,
} from "@entities/mini-internship";
import {
  cardStyle,
  formatDateTime,
  formatEnumLabel,
  getFileLabel,
  getPersonName,
  getSubmissionLinks,
  normalizeDecisionStatus,
} from "@pages/mini-internships/ui/shared";

type ScoreDraft = ReviewTaskSubmissionScorePayload & {
  name: string;
  maxScore: number;
};

const makeScoreDraft = (
  criterion: MiniInternshipSkillCriterion,
  existing?: SubmissionSkillScore | null,
): ScoreDraft => ({
  skillCriterionId: criterion.id || criterion.name,
  score: existing?.score ?? 0,
  comment: existing?.comment ?? "",
  name: criterion.name,
  maxScore: criterion.maxScore,
});

const FEEDBACK_TEMPLATES = [
  "Strong technical solution",
  "Needs better documentation",
  "Improve testing",
  "Good communication",
  "Weak problem understanding",
];

export const EmployerMiniInternshipReviewPage = () => {
  const { t } = useUISettings();
  const { id } = useParams<{ id: string }>();
  const { currentUser, isAuthenticated } = useUserStore();
  const {
    selectedSubmission,
    miniInternshipSubmissions,
    loadSubmission,
    loadSubmissionsForMiniInternship,
    reviewSubmission,
    isLoading,
    isMutating,
    error,
  } = useMiniInternshipStore();
  const [decisionStatus, setDecisionStatus] = useState<
    "reviewed" | "accepted" | "rejected" | "shortlisted"
  >("reviewed");
  const [overallComment, setOverallComment] = useState("");
  const [allowCandidateToAddToPortfolio, setAllowCandidateToAddToPortfolio] =
    useState(false);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDraft[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const isAllowed = isAuthenticated && isEmployerRole(currentUser?.role);
  const submission = selectedSubmission?.id === id ? selectedSubmission : null;
  const criteria = submission?.miniInternship?.skillCriteria || [];

  useEffect(() => {
    if (!isAllowed || !id) {
      return;
    }

    void loadSubmission(id);
  }, [id, isAllowed, loadSubmission]);

  useEffect(() => {
    if (!submission?.miniInternshipId || !isAllowed) {
      return;
    }

    void loadSubmissionsForMiniInternship(submission.miniInternshipId);
  }, [
    isAllowed,
    loadSubmissionsForMiniInternship,
    submission?.miniInternshipId,
  ]);

  useEffect(() => {
    if (!submission) {
      return;
    }

    setDecisionStatus(normalizeDecisionStatus(submission.decisionStatus));
    setOverallComment(submission.overallComment || "");
    setAllowCandidateToAddToPortfolio(
      Boolean(submission.allowCandidateToAddToPortfolio),
    );

    const existingScores = new Map<string, SubmissionSkillScore>(
      (submission.skillScores || []).map((score) => [
        score.skillCriterionId,
        score,
      ]),
    );

    const nextDrafts =
      criteria.length > 0
        ? criteria.map((criterion) =>
            makeScoreDraft(
              criterion,
              existingScores.get(criterion.id || criterion.name),
            ),
          )
        : (submission.skillScores || []).map((score, index) => ({
            skillCriterionId: score.skillCriterionId,
            score: score.score,
            comment: score.comment || "",
            name:
              score.skillCriterion?.name ||
              score.skillCriterionId ||
              t("employerMiniInternships.criterionFallback", {
                index: index + 1,
              }),
            maxScore: score.skillCriterion?.maxScore || 10,
          }));

    setScoreDrafts(nextDrafts);
  }, [criteria, submission, t]);

  const aiLinks = useMemo(
    () => getSubmissionLinks(submission?.externalLinks),
    [submission?.externalLinks],
  );
  const analytics = useMemo(() => {
    const items = miniInternshipSubmissions || [];
    const submittedItems = items.filter((item) =>
      ["SUBMITTED", "LATE", "REVIEWED", "REJECTED"].includes(
        String(item.status || "").toUpperCase(),
      ),
    );
    const reviewedItems = items.filter((item) => Boolean(item.reviewedAt));
    const averageScore =
      reviewedItems.length > 0
        ? reviewedItems.reduce(
            (sum, item) =>
              sum +
              (item.weightedScore ??
                item.averageScore ??
                item.overallScore ??
                0),
            0,
          ) / reviewedItems.length
        : 0;
    const averageTime =
      submittedItems.length > 0
        ? submittedItems.reduce(
            (sum, item) => sum + (item.timeSpentSeconds || 0),
            0,
          ) / submittedItems.length
        : 0;
    return {
      total: items.length,
      submitted: submittedItems.length,
      reviewed: reviewedItems.length,
      averageScore,
      averageTime,
      dropOffRate:
        items.length > 0
          ? Math.max(
              0,
              100 - Math.round((submittedItems.length / items.length) * 100),
            )
          : 0,
    };
  }, [miniInternshipSubmissions]);

  const candidateComparison = useMemo(() => {
    const scored = (miniInternshipSubmissions || [])
      .map((item) => ({
        submission: item,
        score:
          item.weightedScore ?? item.averageScore ?? item.overallScore ?? 0,
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 2);

    return scored;
  }, [miniInternshipSubmissions]);

  const updateScoreDraft = (
    index: number,
    field: keyof Pick<ScoreDraft, "score" | "comment">,
    value: string,
  ) => {
    setScoreDrafts((prev) =>
      prev.map((entry, itemIndex) =>
        itemIndex === index
          ? {
              ...entry,
              [field]: field === "score" ? Number(value) : value,
            }
          : entry,
      ),
    );
  };

  const applyFeedbackTemplate = (template: string) => {
    setOverallComment((prev) => (prev ? `${prev}\n${template}` : template));
  };

  const handleSubmit = async () => {
    if (!submission) {
      return;
    }

    setPageError(null);
    setPageSuccess(null);

    try {
      await reviewSubmission(submission.id, {
        decisionStatus,
        overallComment: overallComment.trim(),
        allowCandidateToAddToPortfolio,
        scores: scoreDrafts.map(({ skillCriterionId, score, comment }) => ({
          skillCriterionId,
          score: Number(score || 0),
          comment: comment?.trim() || undefined,
        })),
      });
      setPageSuccess(t("employerMiniInternships.reviewSaved"));
    } catch (reviewError) {
      setPageError(
        reviewError instanceof Error
          ? reviewError.message
          : t("employerMiniInternships.reviewFailed"),
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
            <h1 className="app-title mt-4 text-3xl">
              {t("employerMiniInternships.accessDeniedTitle")}
            </h1>
            <p className="app-text-muted mt-2">
              {t("employerMiniInternships.accessDeniedDescription")}
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (!submission && !isLoading) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <section className="app-section-card p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
            <h1 className="app-title mt-4 text-3xl">
              {t("miniInternships.notFoundTitle")}
            </h1>
            <p className="app-text-muted mt-2">
              {t("employerMiniInternships.submissionNotFoundDescription")}
            </p>
            <div className="mt-6">
              <Link to="/app/employer/mini-internships">
                <Button variant="outline">
                  {t("employerMiniInternships.backToList")}
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
          to={`/app/employer/mini-internships/${submission?.miniInternshipId}/submissions`}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--surface-text-muted)] transition-colors hover:text-[var(--surface-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("employerMiniInternships.backToSubmissions")}
        </Link>

        <section className="app-section-card app-page-hero app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-chip mb-4">
                <CheckCheck className="h-3.5 w-3.5" />
                {t("employerMiniInternships.reviewBadge")}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">
                {submission?.miniInternship?.title ||
                  t("miniInternships.untitledTask")}
              </h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {getPersonName(submission?.student, t("common.candidate"))}
              </p>
            </div>

            <div className="app-kpi-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                {t("miniInternships.score")}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">
                {submission?.weightedScore ??
                  submission?.averageScore ??
                  submission?.overallScore ??
                  0}
              </p>
            </div>
          </div>
        </section>

        {(error || pageError || pageSuccess || isLoading || isMutating) && (
          <div className="mt-4 space-y-2">
            {error && (
              <div
                className="rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "var(--tone-danger-bg)",
                  color: "var(--tone-danger-text)",
                }}
              >
                {error}
              </div>
            )}
            {pageError && (
              <div
                className="rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "var(--tone-warning-bg)",
                  color: "var(--tone-warning-text)",
                }}
              >
                {pageError}
              </div>
            )}
            {pageSuccess && (
              <div
                className="rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "var(--tone-success-bg)",
                  color: "var(--tone-success-text)",
                }}
              >
                {pageSuccess}
              </div>
            )}
            {isLoading && (
              <div
                className="rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "var(--surface-soft)",
                  color: "var(--surface-text-primary)",
                }}
              >
                {t("employerMiniInternships.loading")}
              </div>
            )}
          </div>
        )}

        {submission && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6">
              <div className="app-section-card p-5 sm:p-6" style={cardStyle}>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t("miniInternships.status")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatEnumLabel(submission.status)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t("miniInternships.decisionStatus")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatEnumLabel(decisionStatus)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t("miniInternships.submittedAt")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatDateTime(submission.submittedAt || undefined)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="app-section-card p-5 sm:p-6">
                <h2 className="app-title text-xl">
                  {t("employerMiniInternships.reviewFormTitle")}
                </h2>
                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                      {t("employerMiniInternships.decisionStatus")}
                    </label>
                    <select
                      value={decisionStatus}
                      onChange={(event) =>
                        setDecisionStatus(
                          event.target.value as typeof decisionStatus,
                        )
                      }
                      className="flex h-11 w-full rounded-2xl border border-[#D6DED7] bg-white px-4 py-2 text-sm text-[#1D261F] dark:border-[#314036] dark:bg-[#111814] dark:text-[#E7EFE8]"
                    >
                      <option value="reviewed">
                        {t("miniInternships.decision.reviewed")}
                      </option>
                      <option value="accepted">
                        {t("miniInternships.decision.accepted")}
                      </option>
                      <option value="rejected">
                        {t("miniInternships.decision.rejected")}
                      </option>
                      <option value="shortlisted">
                        {t("miniInternships.decision.shortlisted")}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                      {t("employerMiniInternships.overallComment")}
                    </label>
                    <Textarea
                      value={overallComment}
                      onChange={(event) =>
                        setOverallComment(event.target.value)
                      }
                      placeholder={t(
                        "employerMiniInternships.overallCommentPlaceholder",
                      )}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {FEEDBACK_TEMPLATES.map((template) => (
                        <button
                          key={template}
                          type="button"
                          onClick={() => applyFeedbackTemplate(template)}
                          className="rounded-full border border-[#D6DED7] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--surface-text-primary)] transition-colors hover:border-[rgba(46,117,82,0.24)]"
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--surface-text-primary)]">
                    <input
                      type="checkbox"
                      checked={allowCandidateToAddToPortfolio}
                      onChange={(event) =>
                        setAllowCandidateToAddToPortfolio(event.target.checked)
                      }
                    />
                    {t("employerMiniInternships.allowPortfolio")}
                  </label>
                </div>
              </div>

              <div className="app-section-card p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-[var(--tone-info-text)]" />
                  <h2 className="app-title text-xl">
                    {t("employerMiniInternships.criteriaScoring")}
                  </h2>
                </div>
                <div className="mt-4 space-y-4">
                  {scoreDrafts.length ? (
                    scoreDrafts.map((scoreDraft, index) => (
                      <div
                        key={scoreDraft.skillCriterionId}
                        className="rounded-2xl border border-[#D6DED7] p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--surface-text-primary)]">
                              {scoreDraft.name}
                            </p>
                            <p className="text-xs text-[var(--surface-text-muted)]">
                              {t("employerMiniInternships.maxScore")}:{" "}
                              {scoreDraft.maxScore}
                            </p>
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                              {t("employerMiniInternships.score")}
                            </label>
                            <Input
                              type="number"
                              min={0}
                              max={scoreDraft.maxScore}
                              value={scoreDraft.score}
                              onChange={(event) =>
                                updateScoreDraft(
                                  index,
                                  "score",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                            {t("employerMiniInternships.scoreComment")}
                          </label>
                          <Textarea
                            value={scoreDraft.comment || ""}
                            onChange={(event) =>
                              updateScoreDraft(
                                index,
                                "comment",
                                event.target.value,
                              )
                            }
                            placeholder={t(
                              "employerMiniInternships.scoreCommentPlaceholder",
                            )}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--surface-text-muted)]">
                      {t("employerMiniInternships.noCriteriaToScore")}
                    </p>
                  )}
                </div>

                <Button
                  variant="hero"
                  className="mt-5"
                  onClick={() => void handleSubmit()}
                  disabled={isMutating}
                >
                  {t("employerMiniInternships.saveReview")}
                </Button>
              </div>

              {submission.files?.length ? (
                <div className="app-section-card p-5 sm:p-6">
                  <h2 className="app-title text-xl">
                    {t("miniInternships.submissionFiles")}
                  </h2>
                  <div className="mt-4 grid gap-3">
                    {submission.files.map((file) => (
                      <div
                        key={file.id}
                        className="rounded-2xl border border-[#D6DED7] p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-[var(--surface-text-primary)]">
                              {getFileLabel(file)}
                            </p>
                            <p className="text-sm text-[var(--surface-text-muted)]">
                              {file.mimeType ||
                                t("miniInternships.fileAttached")}
                            </p>
                          </div>
                          {file.downloadUrl ? (
                            <a
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tone-info-text)] hover:underline"
                            >
                              {t("common.open")}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="space-y-4">
              <div className="app-section-card p-5 sm:p-6 sticky top-28">
                <h2 className="app-title text-xl">
                  {t("employerMiniInternships.submissionSummary")}
                </h2>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t("common.candidate")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {getPersonName(submission.student, t("common.candidate"))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t("miniInternships.score")}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">
                      {submission.weightedScore ??
                        submission.averageScore ??
                        submission.overallScore ??
                        0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t("miniInternships.portfolioEligibility")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {submission.allowCandidateToAddToPortfolio
                        ? t("common.yes")
                        : t("common.no")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#D6DED7] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                    {t("employerMiniInternships.analyticsBadge")}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                        {t("employerMiniInternships.submissionCount")}
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-[var(--surface-text-primary)]">
                        {analytics.total}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                        {t("employerMiniInternships.reviewedCount")}
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-[var(--surface-text-primary)]">
                        {analytics.reviewed}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                        {t("employerMiniInternships.averageScore")}
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-[var(--surface-text-primary)]">
                        {analytics.averageScore.toFixed(1)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                        {t("employerMiniInternships.averageTime")}
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-[var(--surface-text-primary)]">
                        {Math.round(analytics.averageTime / 60)}m
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[var(--surface-text-muted)]">
                    {t("employerMiniInternships.dropOffHint", {
                      value: analytics.dropOffRate,
                    })}
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-[#D6DED7] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                    {t("employerMiniInternships.compareCandidates")}
                  </p>
                  <div className="mt-3 space-y-3">
                    {candidateComparison.length ? (
                      candidateComparison.map(
                        ({ submission: candidateSubmission, score }, index) => (
                          <div
                            key={candidateSubmission.id}
                            className="rounded-2xl bg-[var(--surface-soft)] p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[var(--surface-text-primary)]">
                                  {index === 0
                                    ? t("employerMiniInternships.candidateA")
                                    : t("employerMiniInternships.candidateB")}
                                </p>
                                <p className="text-sm text-[var(--surface-text-muted)]">
                                  {getPersonName(
                                    candidateSubmission.student,
                                    t("common.candidate"),
                                  )}
                                </p>
                              </div>
                              <p className="text-lg font-extrabold text-[var(--surface-text-primary)]">
                                {score.toFixed(1)}
                              </p>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--surface-text-muted)]">
                              {(candidateSubmission.skillScores || []).map(
                                (skillScore) => (
                                  <span
                                    key={skillScore.skillCriterionId}
                                    className="rounded-full border border-[#D6DED7] px-2.5 py-1"
                                  >
                                    {skillScore.skillCriterion?.name ||
                                      skillScore.skillCriterionId}
                                    : {skillScore.score}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        ),
                      )
                    ) : (
                      <p className="text-sm text-[var(--surface-text-muted)]">
                        {t("employerMiniInternships.compareEmpty")}
                      </p>
                    )}
                  </div>
                </div>

                {submission.integrityIndicators?.length ? (
                  <div className="mt-5 space-y-3">
                    {submission.integrityIndicators.map((indicator, index) => (
                      <div
                        key={
                          indicator.id ||
                          `${indicator.code || "indicator"}-${index}`
                        }
                        className="rounded-2xl border border-[#D6DED7] p-4"
                      >
                        <p className="text-sm font-semibold text-[var(--surface-text-primary)]">
                          {indicator.reason}
                        </p>
                        <p className="mt-1 text-xs text-[var(--surface-text-muted)]">
                          {indicator.severity}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3">
                  {submission.externalLinks?.length ? (
                    <div className="rounded-2xl border border-[#D6DED7] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t("miniInternships.externalLinksLabel")}
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        {aiLinks.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-[var(--tone-info-text)] hover:underline"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <Link
                    to={`/app/mini-internships/${submission.miniInternshipId}/submit`}
                  >
                    <Button variant="outline" className="w-full">
                      {t("employerMiniInternships.openCandidateFlow")}
                    </Button>
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};
