import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Download, Loader2, MapPin, Paperclip } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { Alert, Badge, Card, EmptyState, Field, LoadingBlock, PageHeader, Pagination, StatusBadge } from '../../components/ui';
import { btnPrimary, formatDate, formatTime, getErrorMessage, inputClass, toDateInput } from '../../utils/helpers';

const monthStart = () => {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
};

export default function AttendanceRecap() {
  const [filters, setFilters] = useState({
    start_date: monthStart(),
    end_date: toDateInput(new Date()),
    division_id: '',
    status: '',
  });
  const [divisions, setDivisions] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient
      .get('/divisions')
      .then((res) => setDivisions(res.data.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/attendances/recap', {
        params: {
          page,
          per_page: 15,
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
          division_id: filters.division_id || undefined,
          status: filters.status || undefined,
        },
      });
      const p = res.data.data;
      setRows(p.data);
      setMeta({ current_page: p.current_page, last_page: p.last_page, total: p.total });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await axiosClient.get('/attendances/export', {
        params: {
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
          division_id: filters.division_id || undefined,
          status: filters.status || undefined,
        },
        responseType: 'blob',
      });

      // Buat blob dan trigger download otomatis
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `rekap_absensi_${filters.start_date || 'awal'}_sd_${filters.end_date || 'akhir'}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekap Absensi"
        subtitle="Rekapitulasi absensi seluruh anggota divisi."
      >
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className={btnPrimary}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? 'Mengunduh CSV...' : 'Export CSV'}
        </button>
      </PageHeader>

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Dari Tanggal" htmlFor="start_date">
            <input
              id="start_date"
              name="start_date"
              type="date"
              value={filters.start_date}
              max={filters.end_date || undefined}
              onChange={set}
              className={inputClass}
            />
          </Field>
          <Field label="Sampai Tanggal" htmlFor="end_date">
            <input
              id="end_date"
              name="end_date"
              type="date"
              value={filters.end_date}
              min={filters.start_date || undefined}
              onChange={set}
              className={inputClass}
            />
          </Field>
          <Field label="Divisi" htmlFor="division_id">
            <select
              id="division_id"
              name="division_id"
              value={filters.division_id}
              onChange={set}
              className={inputClass}
            >
              <option value="">Semua divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={set}
              className={inputClass}
            >
              <option value="">Semua status</option>
              <option value="hadir">Hadir</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpha">Alpha</option>
            </select>
          </Field>
        </div>
      </Card>

      <Alert onClose={() => setError('')}>{error}</Alert>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Divisi</th>
                <th className="px-4 py-3 font-semibold">Check-in</th>
                <th className="px-4 py-3 font-semibold">Check-out</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Lokasi</th>
                <th className="px-4 py-3 font-semibold">Catatan</th>
                <th className="px-4 py-3 font-semibold">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.user?.name}</td>
                    <td className="px-4 py-3">
                      {r.user?.division ? (
                        <Badge tone="violet">{r.user.division.name}</Badge>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatTime(r.check_in)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatTime(r.check_out)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={r.status} />
                        {r.is_late && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
                            Terlambat
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.maps_url ? (
                        <a
                          href={r.maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                        >
                          <MapPin className="h-3 w-3" /> 📍 Lihat Lokasi
                        </a>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td
                      className="max-w-xs truncate px-4 py-3 text-slate-500 dark:text-slate-400"
                      title={r.notes || ''}
                    >
                      {r.notes || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {r.attachment_url ? (
                        <a
                          href={r.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                        >
                          <Paperclip className="h-3 w-3" /> Lihat Bukti
                        </a>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {loading && <LoadingBlock />}
        {!loading && rows.length === 0 && !error && (
          <EmptyState icon={ClipboardList} text="Tidak ada data absensi untuk filter ini." />
        )}
        <Pagination meta={meta} loading={loading} onPage={setPage} />
      </Card>
    </div>
  );
}
