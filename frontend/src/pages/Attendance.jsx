import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, LogIn, LogOut, MapPin, Paperclip, Send } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { Alert, Card, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '../components/ui';
import { btnPrimary, formatDate, formatTime, getCoordinates, getErrorMessage, inputClass, toDateInput } from '../utils/helpers';

const STATUS_OPTIONS = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
];

const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return { start: toDateInput(new Date(y, m - 1, 1)), end: toDateInput(new Date(y, m, 0)) };
};

export default function Attendance() {
  const [today, setToday] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);

  const [status, setStatus] = useState('hadir');
  const [notes, setNotes] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const attachmentInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [month, setMonth] = useState(() => toDateInput(new Date()).slice(0, 7));
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const loadToday = useCallback(async () => {
    try {
      const res = await axiosClient.get('/attendances/today');
      setToday(res.data.data);
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    const { start, end } = monthRange(month);
    try {
      const res = await axiosClient.get('/attendances/history', {
        params: { start_date: start, end_date: end, per_page: 100 },
      });
      setHistory(res.data.data.data);
    } catch (err) {
      setHistoryError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const run = async (request) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await request();
      setFeedback({ type: 'success', text: res.data.message });
      setNotes('');
      setAttachmentFile(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      await Promise.all([loadToday(), loadHistory()]);
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    let coords = null;
    try {
      coords = await getCoordinates();
    } catch {
      coords = null;
    }

    const payload = {
      notes: notes || null,
      ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
    };

    return run(async () => {
      const res = await axiosClient.post('/attendances/check-in', payload);
      if (!coords) {
        res.data.message += ' (Lokasi GPS tidak diizinkan / tidak terdeteksi)';
      }
      return res;
    });
  };

  const handleCheckOut = () =>
    run(() => axiosClient.post('/attendances/check-out'));

  const handleLeave = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('status', status);
    formData.append('notes', notes);
    if (attachmentFile) {
      formData.append('attachment', attachmentFile);
    }
    return run(() =>
      axiosClient.post('/attendances/leave', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  };

  const hasRecord = Boolean(today);
  const canCheckOut = today?.status === 'hadir' && today.check_in && !today.check_out;
  const isLeave = status !== 'hadir';
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const summary = history.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi"
        subtitle={new Date().toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      />

      {/* Card Absensi Hari Ini */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Absensi Hari Ini</h2>
          {!todayLoading &&
            (hasRecord ? (
              <div className="flex items-center gap-1.5">
                <StatusBadge status={today.status} />
                {today.is_late && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
                    Terlambat
                  </span>
                )}
              </div>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Belum absen
              </span>
            ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">Check-in</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{formatTime(today?.check_in)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">Check-out</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{formatTime(today?.check_out)}</p>
          </div>
        </div>

        {today?.maps_url && (
          <div className="mt-3">
            <a
              href={today.maps_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <MapPin className="h-4 w-4" /> 📍 Lihat Lokasi Check-In di Google Maps
            </a>
          </div>
        )}

        {feedback && (
          <div className="mt-4">
            <Alert type={feedback.type} onClose={() => setFeedback(null)}>
              {feedback.text}
            </Alert>
          </div>
        )}

        <form onSubmit={handleLeave} className="mt-5 space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Status Kehadiran</legend>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    status === opt.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={(e) => setStatus(e.target.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Catatan{' '}
              {isLeave ? <span className="text-rose-500">*</span> : <span className="text-slate-400 dark:text-slate-500">(opsional)</span>}
            </label>
            <textarea
              id="notes"
              rows={3}
              maxLength={1000}
              required={isLeave}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isLeave ? 'Tulis alasan izin / sakit...' : 'Catatan tambahan untuk check-in...'}
              className={inputClass}
            />
          </div>

          {/* Input Lampiran Bukti jika Izin atau Sakit */}
          {isLeave && (
            <div>
              <label htmlFor="attachment" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Lampiran Bukti / Surat Dokter <span className="text-slate-400 dark:text-slate-500">(opsional, maks. 5MB)</span>
              </label>
              <input
                ref={attachmentInputRef}
                id="attachment"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                className={inputClass}
              />
              {attachmentFile && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  <Paperclip className="h-3.5 w-3.5" /> Terpilih: {attachmentFile.name}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {isLeave ? (
              <button
                id="submit-leave"
                type="submit"
                disabled={submitting || hasRecord}
                className={btnPrimary}
              >
                <Send className="h-4 w-4" /> Ajukan {status === 'izin' ? 'Izin' : 'Sakit'}
              </button>
            ) : (
              <>
                <button
                  id="check-in"
                  type="button"
                  onClick={handleCheckIn}
                  disabled={submitting || hasRecord}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" /> Check-In
                </button>
                <button
                  id="check-out"
                  type="button"
                  onClick={handleCheckOut}
                  disabled={submitting || !canCheckOut}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" /> Check-Out
                </button>
              </>
            )}
          </div>

          {hasRecord && (
            <div className="space-y-1 text-xs text-slate-500">
              <p>
                Anda sudah memiliki catatan absensi hari ini
                {today.notes ? <> — “{today.notes}”</> : null}.
              </p>
              {today.attachment_url && (
                <p className="flex items-center gap-1">
                  Bukti terlampir:
                  <a
                    href={today.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-indigo-600 underline"
                  >
                    Lihat Dokumen
                  </a>
                </p>
              )}
            </div>
          )}
        </form>
      </Card>

      {/* Riwayat Bulanan */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Riwayat Bulanan
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-36 text-center text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
              {monthLabel}
            </span>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800 sm:px-6">
          {['hadir', 'izin', 'sakit', 'alpha'].map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <StatusBadge status={s} /> {summary[s] || 0}
            </span>
          ))}
        </div>

        {historyError && (
          <div className="p-4">
            <Alert>{historyError}</Alert>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold sm:px-6">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Check-in</th>
                <th className="px-4 py-3 font-semibold">Check-out</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Lokasi</th>
                <th className="px-4 py-3 font-semibold">Catatan</th>
                <th className="px-4 py-3 font-semibold">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!historyLoading &&
                history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200 sm:px-6">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatTime(row.check_in)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatTime(row.check_out)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={row.status} />
                        {row.is_late && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
                            Terlambat
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.maps_url ? (
                        <a
                          href={row.maps_url}
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
                      title={row.notes || ''}
                    >
                      {row.notes || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {row.attachment_url ? (
                        <a
                          href={row.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                        >
                          <Paperclip className="h-3 w-3" /> Bukti
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
        {historyLoading && <LoadingBlock />}
        {!historyLoading && !historyError && history.length === 0 && (
          <EmptyState icon={ClipboardList} text="Tidak ada catatan absensi pada bulan ini." />
        )}
      </Card>
    </div>
  );
}
