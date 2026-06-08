import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Download,
  AlertTriangle,
  FileText,
  Filter,
  RefreshCcw,
  ShieldAlert,
  Users,
  Building2,
  Briefcase,
  ListFilter,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Area,
  AreaChart as ReAreaChart,
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppHeader } from '@widgets/app-header';
import { Button, Input } from '@shared/ui';
import { useUISettings, type Locale } from '@shared/lib/ui-settings';
import { analyticsApi, type AnalyticsEnvelope, type AnalyticsRange, type AnalyticsTab } from '@entities/analytics';
import { isAdminRole, isHrRole, isUniversityRole, useUserStore } from '@entities/user';

type ChartDatum = { label: string; value: number; color?: string };
type TableRow = Record<string, unknown> & { id?: string };

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '12m', label: '12M' },
  { value: 'all', label: 'All' },
];

const TABS: Array<{ id: AnalyticsTab; labelKey: string }> = [
  { id: 'overview', labelKey: 'statistics.tabs.overview' },
  { id: 'users', labelKey: 'statistics.tabs.users' },
  { id: 'vacancies', labelKey: 'statistics.tabs.vacancies' },
  { id: 'applications', labelKey: 'statistics.tabs.applications' },
  { id: 'employers', labelKey: 'statistics.tabs.employers' },
  { id: 'candidates', labelKey: 'statistics.tabs.candidates' },
  { id: 'universities', labelKey: 'statistics.tabs.universities' },
  { id: 'pipeline', labelKey: 'statistics.tabs.pipeline' },
  { id: 'compliance', labelKey: 'statistics.tabs.compliance' },
  { id: 'reports', labelKey: 'statistics.tabs.reports' },
];

const tabToLoader: Record<AnalyticsTab, (range: AnalyticsRange) => Promise<AnalyticsEnvelope>> = {
  overview: (range) => analyticsApi.getAnalyticsOverview({ range }),
  users: (range) => analyticsApi.getUsersAnalytics({ range }),
  vacancies: (range) => analyticsApi.getVacanciesAnalytics({ range }),
  applications: (range) => analyticsApi.getApplicationsAnalytics({ range }),
  employers: (range) => analyticsApi.getEmployersAnalytics({ range }),
  candidates: (range) => analyticsApi.getCandidatesAnalytics({ range }),
  universities: (range) => analyticsApi.getUniversitiesAnalytics({ range }),
  pipeline: (range) => analyticsApi.getPipelineAnalytics({ range }),
  compliance: (range) => analyticsApi.getComplianceAnalytics({ range }),
  reports: (range) => analyticsApi.getReportsAnalytics({ range }),
};

const MINI_INTERNSHIP_TEXT: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    tasksCreated: string;
    submissions: string;
    successful: string;
    rejected: string;
    late: string;
    averageScore: string;
    portfolioAdds: string;
    integrityWarnings: string;
    decisionMix: string;
    decisionMixSubtitle: string;
    submissionStatus: string;
    submissionStatusSubtitle: string;
    topCandidates: string;
    topCandidatesSubtitle: string;
    topTasks: string;
    topTasksSubtitle: string;
    candidateLeaderboard: string;
    taskLeaderboard: string;
  }
> = {
  en: {
    title: 'Mini-internship performance',
    subtitle: 'Real task activity: submissions, review results, late attempts, portfolio adds, and task leaders.',
    tasksCreated: 'Tasks created',
    submissions: 'Submissions',
    successful: 'Successful',
    rejected: 'Rejected',
    late: 'Late',
    averageScore: 'Average score',
    portfolioAdds: 'Portfolio adds',
    integrityWarnings: 'Integrity warnings',
    decisionMix: 'Submission decision mix',
    decisionMixSubtitle: 'Accepted, shortlisted, reviewed, rejected',
    submissionStatus: 'Submission status',
    submissionStatusSubtitle: 'Draft, active, late, submitted, reviewed',
    topCandidates: 'Top candidates',
    topCandidatesSubtitle: 'Who completed the most mini-internship submissions',
    topTasks: 'Top mini-internships',
    topTasksSubtitle: 'Tasks with the most submissions',
    candidateLeaderboard: 'Candidate task leaderboard',
    taskLeaderboard: 'Task leaderboard',
  },
  ru: {
    title: 'Эффективность мини-стажировок',
    subtitle: 'Реальная активность по заданиям: отправки, результаты проверки, просрочки, портфолио и лидеры.',
    tasksCreated: 'Заданий создано',
    submissions: 'Отправок',
    successful: 'Успешные',
    rejected: 'Отклонённые',
    late: 'Просроченные',
    averageScore: 'Средний балл',
    portfolioAdds: 'Добавлений в портфолио',
    integrityWarnings: 'Предупреждения integrity',
    decisionMix: 'Распределение решений',
    decisionMixSubtitle: 'Принятые, shortlist, проверенные, отклонённые',
    submissionStatus: 'Статусы отправок',
    submissionStatusSubtitle: 'Черновик, в работе, просрочено, отправлено, проверено',
    topCandidates: 'Топ кандидатов',
    topCandidatesSubtitle: 'Кто выполнил больше всего мини-стажировок',
    topTasks: 'Топ мини-стажировок',
    topTasksSubtitle: 'Задания с наибольшим числом отправок',
    candidateLeaderboard: 'Рейтинг кандидатов по заданиям',
    taskLeaderboard: 'Рейтинг заданий',
  },
  kk: {
    title: 'Mini-internship көрсеткіштері',
    subtitle: 'Тапсырмалар бойынша нақты белсенділік: жіберулер, тексеру нәтижелері, кешігу және көшбасшылар.',
    tasksCreated: 'Жасалған тапсырмалар',
    submissions: 'Жіберулер',
    successful: 'Сәтті',
    rejected: 'Қабылданбаған',
    late: 'Кешігу',
    averageScore: 'Орташа балл',
    portfolioAdds: 'Портфолиоға қосу',
    integrityWarnings: 'Integrity ескертулері',
    decisionMix: 'Шешімдер құрамы',
    decisionMixSubtitle: 'Қабылданған, shortlist, тексерілген, қабылданбаған',
    submissionStatus: 'Жіберу күйлері',
    submissionStatusSubtitle: 'Жоба, орындауда, кешігіп, жіберілген, тексерілген',
    topCandidates: 'Үздік кандидаттар',
    topCandidatesSubtitle: 'Ең көп mini-internship тапсырмасын орындағандар',
    topTasks: 'Үздік mini-internship',
    topTasksSubtitle: 'Жіберулері ең көп тапсырмалар',
    candidateLeaderboard: 'Кандидаттар рейтингі',
    taskLeaderboard: 'Тапсырмалар рейтингі',
  },
};

const cardShell = {
  backgroundColor: 'var(--surface-base)',
  boxShadow: '0 12px 24px rgba(16, 24, 18, 0.06)',
};

const getRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const getString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const getNumber = (value: unknown): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0) || 0;
};

const getArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const formatNumber = (value: number | undefined | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat().format(value);
};

const formatPercent = (value: number | undefined | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return `${Math.round(value * 10) / 10}%`;
};

const exportJson = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportCsv = (filename: string, rows: TableRow[]) => {
  if (!rows.length) {
    return;
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const escape = (value: unknown): string => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.split('"').join('""')}"`;
    }
    return text;
  };

  const csv = [headers.join(',')]
    .concat(rows.map((row) => headers.map((header) => escape(row[header])).join(',')))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const toChartData = (value: unknown): ChartDatum[] => {
  return getArray(value)
    .map((entry) => getRecord(entry))
    .filter(Boolean)
    .map((entry) => ({
      label: getString(entry?.label) || getString(entry?.name) || getString(entry?.title) || 'Unknown',
      value: getNumber(entry?.value),
      color: getString(entry?.color) || undefined,
    }));
};

const formatDetailValue = (value: unknown): ReactNode => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return '—';
    }

    return value.map((item, index) => (
      <span key={`${index}-${String(item)}`} className="rounded-full bg-[var(--surface-chip)] px-2 py-1">
        {String(item)}
      </span>
    ));
  }

  if (typeof value === 'object') {
    return (
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[var(--surface-base)] p-3 text-xs text-[var(--surface-text-primary)]">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return String(value);
};

const flattenTableRows = (tables: Record<string, unknown>): TableRow[] => {
  const firstArray = Object.values(tables).find((entry) => Array.isArray(entry));
  return Array.isArray(firstArray)
    ? (firstArray as TableRow[])
    : [];
};

const MetricCard = ({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
}) => {
  const clickable = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all ${clickable ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''}`}
      style={cardShell}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex rounded-xl bg-[var(--surface-chip)] p-2 text-[var(--surface-text-primary)]">
          <Icon className="h-4 w-4" />
        </div>
        {clickable && <ArrowUpRight className="mt-1 h-4 w-4 text-[var(--surface-text-soft)]" />}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--surface-text-primary)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--surface-text-muted)]">{hint}</p>}
    </button>
  );
};

const ChartCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <section className="rounded-[24px] border p-5" style={cardShell}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-[var(--surface-text-primary)]">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-[var(--surface-text-muted)]">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const EmptyState = ({ title, description }: { title: string; description?: string }) => (
  <div className="rounded-[24px] border border-dashed px-5 py-10 text-center" style={cardShell}>
    <FileText className="mx-auto h-10 w-10 text-[var(--surface-text-soft)]" />
    <h3 className="mt-4 text-lg font-bold text-[var(--surface-text-primary)]">{title}</h3>
    {description && <p className="mt-2 text-sm text-[var(--surface-text-muted)]">{description}</p>}
  </div>
);

const LoadingSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <div
        key={index}
        className="h-[120px] animate-pulse rounded-2xl border bg-[var(--surface-base)]"
        style={cardShell}
      />
    ))}
  </div>
);

const DonutChart = ({
  data,
  onItemClick,
}: {
  data: ChartDatum[];
  onItemClick?: (item: ChartDatum) => void;
}) => {
  const palette = data.length ? data : [{ label: 'Empty', value: 1, color: '#e5e7eb' }];
  const total = palette.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr] lg:items-center">
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
              contentStyle={{
                borderRadius: '16px',
                border: '1px solid var(--surface-border-soft)',
                background: 'var(--surface-base)',
                boxShadow: '0 12px 24px rgba(16, 24, 18, 0.12)',
              }}
            />
            <Pie
              data={palette}
              dataKey="value"
              nameKey="label"
              innerRadius={72}
              outerRadius={100}
              paddingAngle={2}
              stroke="transparent"
            >
              {palette.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={entry.color || ['#0ea5e9', '#16a34a', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]}
                  cursor="pointer"
                  onClick={() => onItemClick?.(entry)}
                />
              ))}
            </Pie>
          </RePieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none -mt-[160px] flex h-0 flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold text-[var(--surface-text-primary)]">{formatNumber(total)}</div>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">Total</div>
        </div>
      </div>
      <div className="space-y-2">
        {palette.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors hover:bg-[var(--surface-base-soft)]"
          >
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || '#0ea5e9' }} />
              <span className="text-sm font-medium text-[var(--surface-text-primary)]">{item.label}</span>
            </span>
            <span className="text-sm font-semibold text-[var(--surface-text-primary)]">{formatNumber(item.value)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const BarChart = ({
  data,
  onItemClick,
}: {
  data: ChartDatum[];
  onItemClick?: (item: ChartDatum) => void;
}) => {
  const palette = data.length ? data : [{ label: 'Empty', value: 1, color: '#e5e7eb' }];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={palette} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border-soft)" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--surface-text-muted)', fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
              contentStyle={{
                borderRadius: '16px',
                border: '1px solid var(--surface-border-soft)',
                background: 'var(--surface-base)',
                boxShadow: '0 12px 24px rgba(16, 24, 18, 0.12)',
              }}
            />
            <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={18}>
              {palette.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={entry.color || ['#0ea5e9', '#16a34a', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]}
                  cursor="pointer"
                  onClick={() => onItemClick?.(entry)}
                />
              ))}
              <LabelList dataKey="value" position="right" fill="var(--surface-text-primary)" fontSize={12} />
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {palette.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors hover:bg-[var(--surface-base-soft)]"
          >
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || '#0ea5e9' }} />
              <span className="text-sm font-medium text-[var(--surface-text-primary)]">{item.label}</span>
            </span>
            <span className="text-sm font-semibold text-[var(--surface-text-primary)]">{formatNumber(item.value)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const LineChart = ({
  data,
  onItemClick,
}: {
  data: Array<{ label: string; value: number }>;
  onItemClick?: (item: { label: string; value: number }) => void;
}) => {
  const palette = data.length ? data : [{ label: 'No data', value: 0 }];

  return (
    <div className="space-y-4">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReAreaChart data={palette} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="statsLineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2b6a4d" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2b6a4d" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border-soft)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--surface-text-muted)', fontSize: 12 }}
              minTickGap={18}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--surface-text-muted)', fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
              contentStyle={{
                borderRadius: '16px',
                border: '1px solid var(--surface-border-soft)',
                background: 'var(--surface-base)',
                boxShadow: '0 12px 24px rgba(16, 24, 18, 0.12)',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2b6a4d"
              strokeWidth={2.5}
              fill="url(#statsLineFill)"
              activeDot={{ r: 5 }}
            />
          </ReAreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {palette.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="rounded-2xl border bg-[var(--surface-base-soft)] px-3 py-3 text-center transition-colors hover:bg-[var(--surface-chip)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">{item.label}</div>
            <div className="mt-1 text-sm font-bold text-[var(--surface-text-primary)]">{formatNumber(item.value)}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

const FunnelChart = ({
  data,
  onItemClick,
}: {
  data: ChartDatum[];
  onItemClick?: (item: ChartDatum) => void;
}) => {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const ratio = Math.round((item.value / max) * 100);
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="w-full rounded-2xl border bg-[var(--surface-base-soft)] p-4 text-left transition-colors hover:bg-[var(--surface-chip)]"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || '#0ea5e9' }} />
                <span className="text-sm font-medium text-[var(--surface-text-primary)]">{item.label}</span>
              </div>
              <div className="text-sm font-semibold text-[var(--surface-text-primary)]">{formatNumber(item.value)}</div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-chip)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${ratio}%`,
                  backgroundColor: item.color || '#0ea5e9',
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--surface-text-soft)]">
              <span>Stage {index + 1}</span>
              <span>{ratio}% of peak</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const AnalyticsModal = ({
  item,
  onClose,
}: {
  item: { title: string; body: Record<string, unknown> } | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (!item) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [item, onClose]);

  if (!item) {
    return null;
  }

  const entries = Object.entries(item.body);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,18,0.38)] px-4 py-6 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-[28px] border bg-white shadow-[0_30px_80px_rgba(16,24,18,0.25)] dark:bg-[#111814]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-border-soft)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--surface-text-soft)]">Detail</p>
            <h3 className="mt-1 text-2xl font-bold text-[var(--surface-text-primary)]">{item.title}</h3>
            <p className="mt-2 text-sm text-[var(--surface-text-muted)]">
              Real record snapshot from the selected metric, chart item, or table row.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              {entries.slice(0, 8).map(([key, value]) => (
                <div key={key} className="rounded-2xl border bg-[var(--surface-base-soft)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">{key}</div>
                  <div className="mt-2 text-sm text-[var(--surface-text-primary)]">{formatDetailValue(value)}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border bg-[var(--surface-base-soft)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">Raw payload</div>
              <pre className="mt-3 max-h-[42vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-xs text-[var(--surface-text-primary)] dark:bg-[#0d120f]">
                {JSON.stringify(item.body, null, 2)}
              </pre>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border bg-[var(--surface-base-soft)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">Quick facts</div>
              <div className="mt-3 grid gap-3">
                {entries.slice(0, 6).map(([key, value]) => (
                  <div key={key} className="rounded-2xl bg-white px-3 py-3 dark:bg-[#0d120f]">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{key}</div>
                    <div className="mt-1 text-sm font-medium text-[var(--surface-text-primary)]">{String(value ?? '—')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StatisticsPage = () => {
  const { t, locale } = useUISettings();
  const miniText = MINI_INTERNSHIP_TEXT[locale];
  const { currentUser, isAuthenticated } = useUserStore();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<AnalyticsEnvelope | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<{ title: string; body: Record<string, unknown> } | null>(null);

  const canView = isAuthenticated && (isAdminRole(currentUser?.role) || isHrRole(currentUser?.role) || isUniversityRole(currentUser?.role));

  const load = async (tab: AnalyticsTab = activeTab, nextRange: AnalyticsRange = range) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await tabToLoader[tab](nextRange);
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('statistics.loadFailed'));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) {
      return;
    }

    void load(activeTab, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, range, canView]);

  const summaryCards = useMemo(() => {
    const summary = data?.summary || {};
    const cards: Array<{ label: string; value: string; hint?: string; icon: ComponentType<{ className?: string }>; key: string }> = [];

    if (activeTab === 'overview') {
      cards.push(
        { key: 'users', label: t('statistics.kpis.users'), value: formatNumber(getNumber(summary.totalUsers)), icon: Users },
        { key: 'vacancies', label: t('statistics.kpis.vacancies'), value: formatNumber(getNumber(summary.totalVacancies)), icon: Briefcase },
        { key: 'applications', label: t('statistics.kpis.applications'), value: formatNumber(getNumber(summary.totalApplications)), icon: FileText },
        { key: 'employers', label: t('statistics.kpis.employers'), value: formatNumber(getNumber(summary.employersCount)), icon: Building2 },
      );
    } else if (activeTab === 'users') {
      cards.push(
        { key: 'totalUsers', label: t('statistics.kpis.totalUsers'), value: formatNumber(getNumber(summary.totalUsers)), icon: Users },
        { key: 'newUsers', label: t('statistics.kpis.newUsers'), value: formatNumber(getNumber(summary.newUsers)), icon: ArrowUpRight },
        { key: 'verifiedUsers', label: t('statistics.kpis.verifiedUsers'), value: formatNumber(getNumber(summary.verifiedUsers)), icon: CheckCircle2 },
        { key: 'deletedUsers', label: t('statistics.kpis.deletedUsers'), value: formatNumber(getNumber(summary.deletedUsers)), icon: ShieldAlert },
      );
    } else if (activeTab === 'vacancies') {
      cards.push(
        { key: 'totalVacancies', label: t('statistics.kpis.totalVacancies'), value: formatNumber(getNumber(summary.totalVacancies)), icon: Briefcase },
        { key: 'cities', label: t('statistics.kpis.cities'), value: formatNumber(getArray(summary.vacanciesByCity).length), icon: Building2 },
        { key: 'types', label: t('statistics.kpis.types'), value: formatNumber(getArray(summary.vacanciesByEmploymentType).length), icon: ListFilter },
        { key: 'salaryRanges', label: t('statistics.kpis.salaryRanges'), value: formatNumber(getArray(summary.salaryRange).length), icon: CircleDollarSign },
      );
    } else if (activeTab === 'applications') {
      cards.push(
        { key: 'totalApplications', label: t('statistics.kpis.totalApplications'), value: formatNumber(getNumber(summary.totalApplications)), icon: FileText },
        { key: 'positiveRate', label: t('statistics.kpis.positiveRate'), value: formatPercent(getNumber(summary.positiveOutcomeRate)), icon: Sparkles },
        { key: 'rejectionRate', label: t('statistics.kpis.rejectionRate'), value: formatPercent(getNumber(summary.rejectionRate)), icon: ShieldAlert },
        { key: 'reviewMinutes', label: t('statistics.kpis.reviewMinutes'), value: `${formatNumber(getNumber(summary.averageReviewMinutes))}m`, icon: RefreshCcw },
      );
    } else if (activeTab === 'compliance') {
      cards.push(
        { key: 'openItems', label: t('statistics.kpis.openItems'), value: formatNumber(getNumber(summary.openItems)), icon: ShieldAlert },
        { key: 'verifications', label: t('statistics.kpis.verifications'), value: formatNumber(getNumber(summary.verificationSubmissions)), icon: CheckCircle2 },
        { key: 'complaints', label: t('statistics.kpis.complaints'), value: formatNumber(getNumber(summary.complaints)), icon: AlertTriangle },
        { key: 'deletions', label: t('statistics.kpis.deletions'), value: formatNumber(getNumber(summary.deletionRequests)), icon: Trash2 },
      );
    }

    return cards;
  }, [activeTab, data?.summary, t]);

  const mainRows = useMemo(() => flattenTableRows(data?.tables || {}), [data?.tables]);
  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return mainRows;
    }

    return mainRows.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(needle)),
    );
  }, [mainRows, search]);

  const miniInternshipSummary = getRecord(data?.summary?.miniInternships) || {};
  const miniInternshipMetrics = useMemo(
    () => [
      {
        key: 'tasksCreated',
        label: miniText.tasksCreated,
        value: formatNumber(getNumber(miniInternshipSummary.totalMiniInternships)),
        icon: Briefcase,
      },
      {
        key: 'submissions',
        label: miniText.submissions,
        value: formatNumber(getNumber(miniInternshipSummary.totalSubmissions)),
        icon: FileText,
      },
      {
        key: 'successful',
        label: miniText.successful,
        value: formatNumber(getNumber(miniInternshipSummary.successfulSubmissions)),
        icon: CheckCircle2,
      },
      {
        key: 'rejected',
        label: miniText.rejected,
        value: formatNumber(getNumber(miniInternshipSummary.rejectedSubmissions)),
        icon: ShieldAlert,
      },
      {
        key: 'late',
        label: miniText.late,
        value: formatNumber(getNumber(miniInternshipSummary.lateSubmissions)),
        icon: AlertTriangle,
      },
      {
        key: 'avgScore',
        label: miniText.averageScore,
        value: formatNumber(getNumber(miniInternshipSummary.averageScore)),
        icon: Sparkles,
      },
      {
        key: 'portfolio',
        label: miniText.portfolioAdds,
        value: formatNumber(getNumber(miniInternshipSummary.portfolioAdditions)),
        icon: BarChart3,
      },
      {
        key: 'integrity',
        label: miniText.integrityWarnings,
        value: formatNumber(getNumber(miniInternshipSummary.integrityWarnings)),
        icon: Trash2,
      },
    ],
    [miniInternshipSummary, miniText],
  );
  const miniInternshipDecisionMix = toChartData(data?.charts?.miniInternshipDecisionMix || data?.charts?.taskDecisionMix);
  const miniInternshipSubmissionMix = toChartData(
    data?.charts?.miniInternshipSubmissionStatusMix || data?.charts?.taskSubmissionStatusMix,
  );
  const miniInternshipCandidatePerformance = toChartData(
    data?.charts?.miniInternshipCandidatePerformance || data?.charts?.taskPerformance,
  );
  const miniInternshipCandidates = getArray(data?.tables?.miniInternshipCandidates) as TableRow[];
  const miniInternshipTasks = getArray(data?.tables?.miniInternships) as TableRow[];
  const miniInternshipTaskChart = useMemo(
    () =>
      miniInternshipTasks.map((item) => ({
        label: String(item.title || item.name || item.label || item.id || 'Task'),
        value: getNumber(item.submissionsCount || item.submissions || item.value || item.total),
        color: '#8b5cf6',
      })),
    [miniInternshipTasks],
  );
  const hasMiniInternshipData =
    getNumber(miniInternshipSummary.totalMiniInternships) > 0 || getNumber(miniInternshipSummary.totalSubmissions) > 0;

  if (!isAuthenticated) {
    return <Navigate to="/app/login" replace />;
  }

  if (!canView) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <EmptyState title={t('statistics.accessDeniedTitle')} description={t('statistics.accessDeniedDescription')} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="app-page-main">
        <section className="app-section-card app-page-hero p-6 sm:p-8" style={cardShell}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="app-chip mb-4">
                <BarChart3 className="h-3.5 w-3.5" />
                {t('statistics.badge')}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">{t('statistics.title')}</h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {t('statistics.subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2 rounded-2xl border bg-white p-2 dark:bg-[#111814]">
                {RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={range === option.value ? 'hero' : 'outline'}
                    size="sm"
                    onClick={() => setRange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => void load(activeTab, range)} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                {t('statistics.refresh')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportJson(`statistics-${activeTab}-${range}.json`, data || {})} disabled={!data}>
                <Download className="h-4 w-4" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportCsv(`statistics-${activeTab}-${range}.csv`, filteredRows)} disabled={!filteredRows.length}>
                <ArrowDownToLine className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border bg-white p-3 shadow-sm dark:bg-[#111814]" style={cardShell}>
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#2B6A4D] bg-[#F3F7F4] text-[#1F3325]'
                    : 'border-transparent bg-transparent text-[var(--surface-text-muted)] hover:bg-[var(--surface-chip)]'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="mt-5">
            <LoadingSkeleton />
          </div>
        )}

        {!isLoading && data && !data.available && (
          <div className="mt-5">
            <EmptyState title={data.message || t('statistics.emptyTitle')} description={t('statistics.emptyDescription')} />
          </div>
        )}

        {!isLoading && data?.available && (
          <>
            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <MetricCard
                  key={card.key}
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  onClick={() => setSelectedDetail({ title: card.label, body: { value: card.value, ...data.summary } })}
                />
              ))}
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-2">
              {data.charts && toChartData(data.charts.usersByRole).length > 0 && (
                <ChartCard title={t('statistics.chart.usersByRole')}>
                  <DonutChart
                    data={toChartData(data.charts.usersByRole)}
                    onItemClick={(item) => setSelectedDetail({ title: item.label, body: item as Record<string, unknown> })}
                  />
                </ChartCard>
              )}
              {data.charts && toChartData(data.charts.vacancyLifecycle).length > 0 && (
                <ChartCard title={t('statistics.chart.vacancyLifecycle')}>
                  <BarChart
                    data={toChartData(data.charts.vacancyLifecycle)}
                    onItemClick={(item) => setSelectedDetail({ title: item.label, body: item as Record<string, unknown> })}
                  />
                </ChartCard>
              )}
              {Array.isArray(data.charts.applicationGrowth) && (
                <ChartCard title={t('statistics.chart.growth')}>
                  <LineChart
                    data={data.charts.applicationGrowth as Array<{ label: string; value: number }>}
                    onItemClick={(item) => setSelectedDetail({ title: item.label, body: item as Record<string, unknown> })}
                  />
                </ChartCard>
              )}
              {toChartData(data.charts.applicationFunnel).length > 0 && (
                <ChartCard title={t('statistics.chart.funnel')}>
                  <FunnelChart
                    data={toChartData(data.charts.applicationFunnel)}
                    onItemClick={(item) => setSelectedDetail({ title: item.label, body: item as Record<string, unknown> })}
                  />
                </ChartCard>
              )}
            </section>

            {hasMiniInternshipData && (
              <section className="mt-6 space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[var(--surface-text-primary)]">{miniText.title}</h2>
                    <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                      {miniText.subtitle}
                    </p>
                  </div>
                  <div className="rounded-full border bg-[var(--surface-chip)] px-3 py-1 text-xs font-semibold text-[var(--surface-text-primary)]">
                    {formatNumber(getNumber(miniInternshipSummary.totalSubmissions))} {miniText.submissions}
                  </div>
                </div>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {miniInternshipMetrics.map((card) => (
                    <MetricCard
                      key={card.key}
                      label={card.label}
                      value={card.value}
                      icon={card.icon}
                      onClick={() =>
                        setSelectedDetail({
                          title: card.label,
                          body: {
                            ...miniInternshipSummary,
                            selectedMetric: card.label,
                            selectedValue: card.value,
                          },
                        })
                      }
                    />
                  ))}
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                  <ChartCard title={miniText.decisionMix} subtitle={miniText.decisionMixSubtitle}>
                    {miniInternshipDecisionMix.length ? (
                      <DonutChart
                        data={miniInternshipDecisionMix}
                        onItemClick={(item) => setSelectedDetail({ title: item.label, body: item as Record<string, unknown> })}
                      />
                    ) : (
                      <EmptyState title="No submission decisions yet" description="Decision-level review data will appear here." />
                    )}
                  </ChartCard>
                  <ChartCard title={miniText.submissionStatus} subtitle={miniText.submissionStatusSubtitle}>
                    {miniInternshipSubmissionMix.length ? (
                      <BarChart
                        data={miniInternshipSubmissionMix}
                        onItemClick={(item) => setSelectedDetail({ title: item.label, body: item as Record<string, unknown> })}
                      />
                    ) : (
                      <EmptyState title="No submissions yet" description="Submission states will appear once candidates start tasks." />
                    )}
                  </ChartCard>
                  <ChartCard title={miniText.topCandidates} subtitle={miniText.topCandidatesSubtitle}>
                    {miniInternshipCandidatePerformance.length ? (
                      <LineChart
                        data={miniInternshipCandidatePerformance as Array<{ label: string; value: number }>}
                        onItemClick={(item) => setSelectedDetail({ title: item.label, body: item as Record<string, unknown> })}
                      />
                    ) : (
                      <EmptyState title="No candidate activity yet" description="Top candidates will appear after submissions are received." />
                    )}
                  </ChartCard>
                  <ChartCard title={miniText.topTasks} subtitle={miniText.topTasksSubtitle}>
                    {miniInternshipTaskChart.length ? (
                      <BarChart
                        data={miniInternshipTaskChart}
                        onItemClick={(item) => setSelectedDetail({ title: item.label, body: item as Record<string, unknown> })}
                      />
                    ) : (
                      <EmptyState title="No task leaders yet" description="Mini-internships with submissions will appear here." />
                    )}
                  </ChartCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                  <ChartCard title={miniText.candidateLeaderboard}>
                    <div className="overflow-hidden rounded-2xl border">
                      <table className="min-w-full divide-y divide-[var(--surface-border-soft)] text-sm">
                        <thead className="bg-[var(--surface-base-soft)]">
                          <tr>
                            {['Candidate', 'Submitted', 'Successful', 'Rejected', 'Average score'].map((header) => (
                              <th
                                key={header}
                                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--surface-border-soft)] bg-white">
                          {miniInternshipCandidates.slice(0, 8).map((row) => (
                            <tr
                              key={String(row.id || row.email || row.name)}
                              className="cursor-pointer hover:bg-[var(--surface-base-soft)]"
                              onClick={() => setSelectedDetail({ title: String(row.name || row.email || 'Candidate'), body: row })}
                            >
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.name || row.email || '—')}</td>
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.submissionsCount ?? '—')}</td>
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.successfulCount ?? '—')}</td>
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.rejectedCount ?? '—')}</td>
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.averageScore ?? '—')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>

                  <ChartCard title={miniText.taskLeaderboard}>
                    <div className="overflow-hidden rounded-2xl border">
                      <table className="min-w-full divide-y divide-[var(--surface-border-soft)] text-sm">
                        <thead className="bg-[var(--surface-base-soft)]">
                          <tr>
                            {['Task', 'Company', 'Submitted', 'Successful', 'Rejected'].map((header) => (
                              <th
                                key={header}
                                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--surface-border-soft)] bg-white">
                          {miniInternshipTasks.slice(0, 8).map((row) => (
                            <tr
                              key={String(row.id || row.title || row.name)}
                              className="cursor-pointer hover:bg-[var(--surface-base-soft)]"
                              onClick={() => setSelectedDetail({ title: String(row.title || row.name || 'Task'), body: row })}
                            >
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.title || row.name || '—')}</td>
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.company || '—')}</td>
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.submissionsCount ?? '—')}</td>
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.successfulCount ?? '—')}</td>
                              <td className="px-4 py-3 text-[var(--surface-text-primary)]">{String(row.rejectedCount ?? '—')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                </section>
              </section>
            )}

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <ChartCard title={t('statistics.tables.title')}>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="relative w-full max-w-md">
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('statistics.search')} className="pl-10" />
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
                  </div>
                  <div className="rounded-full bg-[var(--surface-chip)] px-3 py-1 text-xs font-semibold text-[var(--surface-text-primary)]">
                    {filteredRows.length} {t('statistics.rows')}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border">
                  <table className="min-w-full divide-y divide-[var(--surface-border-soft)] text-sm">
                    <thead className="bg-[var(--surface-base-soft)]">
                      <tr>
                        {Object.keys(filteredRows[0] || { name: 1, status: 1, value: 1 }).slice(0, 4).map((header) => (
                          <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-border-soft)] bg-white">
                      {filteredRows.slice(0, 12).map((row, index) => (
                        <tr
                          key={`${String(row.id || index)}`}
                          className="cursor-pointer hover:bg-[var(--surface-base-soft)]"
                          onClick={() => setSelectedDetail({ title: String(row.id || row.title || row.name || t('statistics.detail')), body: row })}
                        >
                          {Object.keys(filteredRows[0] || { name: 1, status: 1, value: 1 }).slice(0, 4).map((header) => (
                            <td key={header} className="px-4 py-3 text-[var(--surface-text-primary)]">
                              {String(row[header] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>

              <ChartCard title={t('statistics.detailTitle')}>
                {selectedDetail ? (
                  <div className="space-y-3">
                    {Object.entries(selectedDetail.body).slice(0, 12).map(([key, value]) => (
                      <div key={key} className="rounded-2xl border bg-[var(--surface-base-soft)] p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{key}</div>
                        <div className="mt-1 text-sm text-[var(--surface-text-primary)]">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t('statistics.detailEmptyTitle')} description={t('statistics.detailEmptyDescription')} />
                )}
              </ChartCard>
            </section>
          </>
        )}
      </main>

      <AnalyticsModal
        item={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
};
