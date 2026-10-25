import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, AlertTriangle, FileText, Activity, Building2, TrendingUp, RefreshCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { Card, EmptyState, LoadingBlock, Alert, Badge } from './ui';
import { getErrorMessage } from '../utils/helpers';

export default function AttendanceCharts() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/attendances/stats');
      setStats(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <Card className="p-5">
        <LoadingBlock text="Memuat statistik & grafik kehadiran..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5">
        <Alert onClose={() => setError('')}>{error}</Alert>
      </Card>
    );
  }

  if (!stats) return null;

  const { summary, trend, divisions, is_admin } = stats;
  const total = summary.total || 0;

  // Status breakdown configuration
  const statusItems = [
    {
      key: 'hadir',
      label: 'Tepat Waktu',
      count: summary.hadir,
      color: '#10b981', // emerald-500
      bgClass: 'bg-emerald-500',
      lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      borderClass: 'border-emerald-200 dark:border-emerald-900/60',
      icon: CheckCircle2,
    },
    {
      key: 'terlambat',
      label: 'Terlambat',
      count: summary.terlambat,
      color: '#f59e0b', // amber-500
      bgClass: 'bg-amber-500',
      lightBg: 'bg-amber-50 dark:bg-amber-950/40',
      textClass: 'text-amber-700 dark:text-amber-400',
      borderClass: 'border-amber-200 dark:border-amber-900/60',
      icon: Clock,
    },
    {
      key: 'izin',
      label: 'Izin',
      count: summary.izin,
      color: '#0ea5e9', // sky-500
      bgClass: 'bg-sky-500',
      lightBg: 'bg-sky-50 dark:bg-sky-950/40',
      textClass: 'text-sky-700 dark:text-sky-400',
      borderClass: 'border-sky-200 dark:border-sky-900/60',
      icon: FileText,
    },
    {
      key: 'sakit',
      label: 'Sakit',
      count: summary.sakit,
      color: '#8b5cf6', // violet-500
      bgClass: 'bg-violet-500',
      lightBg: 'bg-violet-50 dark:bg-violet-950/40',
      textClass: 'text-violet-700 dark:text-violet-400',
      borderClass: 'border-violet-200 dark:border-violet-900/60',
      icon: Activity,
    },
  ];

  // Donut chart stroke calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  // Max value for 7-day trend chart scaling
  const maxTrend = Math.max(...trend.map((t) => t.total || 0), 4);

  return (
    <div className="space-y-6">
      {/* Header & Quick Stat Cards */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Statistik Kehadiran ({summary.month_label})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {is_admin ? 'Data agregat kehadiran seluruh anggota organisasi' : 'Ringkasan absensi pribadi Anda bulan ini'}
          </p>
        </div>
        <button
          type="button"
          onClick={loadStats}
          aria-label="Segarkan statistik"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Segarkan
        </button>
      </div>

      {/* 4 Status Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statusItems.map((st) => {
          const Icon = st.icon;
          const pct = total > 0 ? Math.round((st.count / total) * 100) : 0;
          return (
            <div
              key={st.key}
              className={`rounded-2xl border p-4 transition ${st.lightBg} ${st.borderClass}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {st.label}
                </span>
                <Icon className={`h-4 w-4 ${st.textClass}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {st.count}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Charts Grid: Donut Breakdown + 7-Day Trend */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Donut Chart: Perbandingan Status Kehadiran Bulan Ini */}
        <Card className="p-5 lg:col-span-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Perbandingan Status Kehadiran</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Distribusi proporsi kehadiran bulan berjalan</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:items-center">
            {/* SVG Donut */}
            <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="12"
                  fill="none"
                />

                {total === 0 ? (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-slate-200 dark:stroke-slate-700"
                    strokeWidth="12"
                    fill="none"
                  />
                ) : (
                  statusItems.map((st) => {
                    if (st.count === 0) return null;
                    const strokeDash = (st.count / total) * circumference;
                    const currentOffset = accumulatedOffset;
                    accumulatedOffset += strokeDash;
                    return (
                      <circle
                        key={st.key}
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke={st.color}
                        strokeWidth="12"
                        strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                        strokeDashoffset={-currentOffset}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-700 ease-out"
                      />
                    );
                  })
                )}
              </svg>

              {/* Center Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {total}
                </span>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Total Absen
                </span>
              </div>
            </div>

            {/* Legend & Breakdown Bars */}
            <div className="w-full flex-1 space-y-2.5">
              {statusItems.map((st) => {
                const pct = total > 0 ? ((st.count / total) * 100).toFixed(1) : '0';
                return (
                  <div key={st.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <span className={`h-2.5 w-2.5 rounded-full ${st.bgClass}`} />
                        {st.label}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {st.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${st.bgClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* 7-Day Trend Chart */}
        <Card className="p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Tren Kehadiran 7 Hari Terakhir
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Riwayat volume aktivitas harian</p>
            </div>
            {/* Quick mini-legend */}
            <div className="hidden flex-wrap items-center gap-3 text-xs sm:flex">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Tepat Waktu
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Terlambat
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> Izin / Sakit
              </span>
            </div>
          </div>

          <div className="mt-6 flex h-48 items-end gap-2 sm:gap-4">
            {trend.map((day) => {
              const dayTotal = day.total || 0;
              const heightPct = Math.max(Math.round((dayTotal / maxTrend) * 100), dayTotal > 0 ? 12 : 4);
              const hadirPct = dayTotal > 0 ? (day.hadir / dayTotal) * 100 : 0;
              const terlambatPct = dayTotal > 0 ? (day.terlambat / dayTotal) * 100 : 0;
              const leavePct = dayTotal > 0 ? ((day.izin + day.sakit) / dayTotal) * 100 : 0;

              return (
                <div key={day.date} className="group relative flex flex-1 flex-col items-center">
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-14 z-20 hidden -translate-y-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-xl group-hover:block dark:bg-slate-800">
                    <p className="font-semibold text-slate-200">{day.day}, {day.short_date}</p>
                    <p className="text-emerald-400">Hadir: {day.hadir}</p>
                    {day.terlambat > 0 && <p className="text-amber-400">Terlambat: {day.terlambat}</p>}
                    {day.izin > 0 && <p className="text-sky-400">Izin: {day.izin}</p>}
                    {day.sakit > 0 && <p className="text-violet-400">Sakit: {day.sakit}</p>}
                    <p className="border-t border-slate-700 pt-0.5 text-slate-400">Total: {dayTotal}</p>
                  </div>

                  {/* Vertical bar container */}
                  <div className="flex h-36 w-full max-w-10 flex-col justify-end overflow-hidden rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800/80">
                    {dayTotal > 0 ? (
                      <div
                        className="flex w-full flex-col overflow-hidden rounded-lg transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      >
                        {hadirPct > 0 && (
                          <div style={{ height: `${hadirPct}%` }} className="bg-emerald-500" />
                        )}
                        {terlambatPct > 0 && (
                          <div style={{ height: `${terlambatPct}%` }} className="bg-amber-500" />
                        )}
                        {leavePct > 0 && (
                          <div style={{ height: `${leavePct}%` }} className="bg-sky-500" />
                        )}
                      </div>
                    ) : (
                      <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
                    )}
                  </div>

                  {/* Day label */}
                  <span className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {day.day}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {day.short_date}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Admin Only: Perbandingan Kehadiran Antar Divisi */}
      {is_admin && divisions && divisions.length > 0 && (
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Tingkat Kehadiran Antar Divisi (Bulan Berjalan)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perbandingan performa absensi seluruh divisi dalam organisasi
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Tepat Waktu
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Terlambat
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Izin
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Sakit
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {divisions.map((div) => {
              const divTotal = div.total || 0;
              const hadirPct = divTotal > 0 ? (div.hadir / divTotal) * 100 : 0;
              const latePct = divTotal > 0 ? (div.terlambat / divTotal) * 100 : 0;
              const izinPct = divTotal > 0 ? (div.izin / divTotal) * 100 : 0;
              const sakitPct = divTotal > 0 ? (div.sakit / divTotal) * 100 : 0;

              return (
                <div
                  key={div.division_id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {div.division_name}
                      </span>
                      <Badge tone="violet">{div.total_members} Anggota</Badge>
                    </div>
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                      Total: <span className="font-bold text-slate-800 dark:text-slate-100">{divTotal}</span> absensi
                    </div>
                  </div>

                  {/* Horizontal Stacked Progress Bar */}
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    {divTotal > 0 ? (
                      <div className="flex h-full w-full">
                        {hadirPct > 0 && (
                          <div
                            style={{ width: `${hadirPct}%` }}
                            className="bg-emerald-500 transition-all duration-500"
                            title={`Tepat Waktu: ${div.hadir}`}
                          />
                        )}
                        {latePct > 0 && (
                          <div
                            style={{ width: `${latePct}%` }}
                            className="bg-amber-500 transition-all duration-500"
                            title={`Terlambat: ${div.terlambat}`}
                          />
                        )}
                        {izinPct > 0 && (
                          <div
                            style={{ width: `${izinPct}%` }}
                            className="bg-sky-500 transition-all duration-500"
                            title={`Izin: ${div.izin}`}
                          />
                        )}
                        {sakitPct > 0 && (
                          <div
                            style={{ width: `${sakitPct}%` }}
                            className="bg-violet-500 transition-all duration-500"
                            title={`Sakit: ${div.sakit}`}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="h-full w-full bg-slate-200 dark:bg-slate-800" />
                    )}
                  </div>

                  {/* Sub-breakdown counts */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      Hadir: <strong className="text-emerald-600 dark:text-emerald-400">{div.hadir}</strong>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Terlambat: <strong className="text-amber-600 dark:text-amber-400">{div.terlambat}</strong>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Izin: <strong className="text-sky-600 dark:text-sky-400">{div.izin}</strong>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Sakit: <strong className="text-violet-600 dark:text-violet-400">{div.sakit}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
