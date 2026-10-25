import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Clock, LogIn, LogOut, Mail, MapPin, Phone, Pin, StickyNote, Users } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Alert, Badge, Card, EmptyState, LoadingBlock, StatusBadge } from '../components/ui';
import AttendanceCharts from '../components/AttendanceCharts';
import { formatDateTime, formatTime, getCoordinates, getErrorMessage } from '../utils/helpers';

function ProfileCard() {
  const { user } = useAuth();
  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600" />
      <div className="px-5 pb-5">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="-mt-8 h-16 w-16 rounded-2xl border-4 border-white object-cover shadow dark:border-slate-800"
          />
        ) : (
          <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-indigo-100 text-2xl font-bold text-indigo-700 shadow dark:border-slate-800 dark:bg-indigo-950 dark:text-indigo-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{user.name}</h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Mail className="h-4 w-4" /> {user.email}
        </p>
        {user.phone && (
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Phone className="h-4 w-4" /> {user.phone}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="indigo">{user.division?.name || 'Tanpa divisi'}</Badge>
          <Badge tone={user.role === 'admin' ? 'rose' : 'slate'}>
            <span className="capitalize">{user.role}</span>
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function QuickAttendance() {
  const [now, setNow] = useState(new Date());
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await axiosClient.get('/attendances/today');
      setToday(res.data.data);
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckIn = async () => {
    setBusy(true);
    setFeedback(null);
    let coords = null;
    try {
      coords = await getCoordinates();
    } catch {
      coords = null;
    }

    try {
      const payload = coords ? { latitude: coords.latitude, longitude: coords.longitude } : {};
      const res = await axiosClient.post('/attendances/check-in', payload);
      let text = res.data.message;
      if (!coords) {
        text += ' (Lokasi GPS tidak diizinkan / tidak terdeteksi)';
      }
      setFeedback({ type: 'success', text });
      await load();
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await axiosClient.post('/attendances/check-out');
      setFeedback({ type: 'success', text: res.data.message });
      await load();
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const canCheckOut = today?.status === 'hadir' && today.check_in && !today.check_out;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Absen Cepat
        </h2>
        {!loading && (
          today ? (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={today.status} />
              {today.is_late && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
                  Terlambat
                </span>
              )}
            </div>
          ) : (
            <Badge tone="slate">Belum absen</Badge>
          )
        )}
      </div>

      <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
        {now.toLocaleTimeString('id-ID', { hour12: false })}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-850 dark:bg-slate-800/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">Check-in</p>
          <p className="font-semibold text-slate-900 dark:text-white">{formatTime(today?.check_in)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-850 dark:bg-slate-800/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">Check-out</p>
          <p className="font-semibold text-slate-900 dark:text-white">{formatTime(today?.check_out)}</p>
        </div>
      </div>

      {today?.maps_url && (
        <div className="mt-2 text-right">
          <a
            href={today.maps_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <MapPin className="h-3.5 w-3.5" /> 📍 Lokasi Check-In
          </a>
        </div>
      )}

      {feedback && <div className="mt-3"><Alert type={feedback.type} onClose={() => setFeedback(null)}>{feedback.text}</Alert></div>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={busy || loading || Boolean(today)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" /> Check-In
        </button>
        <button
          type="button"
          onClick={handleCheckOut}
          disabled={busy || loading || !canCheckOut}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" /> Check-Out
        </button>
      </div>
      <Link to="/attendance" className="mt-3 block text-center text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        Izin / Sakit? Ajukan di halaman Absensi
      </Link>
    </Card>
  );
}

function TodayColleagues() {
  const { user } = useAuth();
  const [colleagues, setColleagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'mine'

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/attendances/today-colleagues');
      setColleagues(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'mine' && user?.division_id) {
      return colleagues.filter((c) => c.user?.division_id === user.division_id);
    }
    return colleagues;
  }, [colleagues, filter, user?.division_id]);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Siapa yang Aktif Hari Ini?
          <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            {filtered.length}
          </span>
        </h2>

        {user?.division_id && (
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-2.5 py-1 transition ${
                filter === 'all'
                  ? 'bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Semua Divisi
            </button>
            <button
              type="button"
              onClick={() => setFilter('mine')}
              className={`rounded-md px-2.5 py-1 transition ${
                filter === 'mine'
                  ? 'bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Divisi Saya
            </button>
          </div>
        )}
      </div>

      {error && <div className="mt-3"><Alert>{error}</Alert></div>}

      {loading ? (
        <LoadingBlock text="Memeriksa kehadiran hari ini..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} text="Belum ada rekan yang absen hari ini." />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            >
              {item.user?.avatar_url ? (
                <img
                  src={item.user.avatar_url}
                  alt={item.user?.name}
                  className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
                  {item.user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.user?.name}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusBadge status={item.status} />
                    {item.is_late && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
                        Terlambat
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate">{item.user?.division?.name || 'Tanpa Divisi'}</span>
                  <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                    {item.maps_url && (
                      <a
                        href={item.maps_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Buka Lokasi GPS di Google Maps"
                        className="text-slate-400 transition hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {item.check_in && (
                      <span>In: {item.check_in.slice(0, 5)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function UpcomingSchedules() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    axiosClient
      .get('/schedules')
      .then((res) => {
        if (!active) return;
        const now = Date.now();
        setItems(res.data.data.filter((s) => new Date(s.end_time).getTime() >= now).slice(0, 5));
      })
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Jadwal Terdekat
        </h2>
        <Link to="/schedules" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Lihat semua
        </Link>
      </div>
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 && !error ? (
        <EmptyState icon={CalendarClock} text="Tidak ada jadwal mendatang." />
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((s) => (
            <li key={s.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-900 dark:text-white">{s.title}</p>
                <Badge tone={s.division ? 'violet' : 'slate'}>{s.division?.name || 'Semua'}</Badge>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" /> {formatDateTime(s.start_time)}
                <MapPin className="ml-2 h-3.5 w-3.5" /> {s.location}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PinnedNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    axiosClient
      .get('/notes', { params: { is_pinned: 1 } })
      .then((res) => active && setNotes(res.data.data.slice(0, 6)))
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Pin className="h-5 w-5 text-amber-500" /> Catatan Penting
        </h2>
        <Link to="/notes" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Buka board
        </Link>
      </div>
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      {loading ? (
        <LoadingBlock />
      ) : notes.length === 0 && !error ? (
        <EmptyState icon={StickyNote} text="Belum ada catatan yang disematkan." />
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30"
            >
              <p className="font-medium text-slate-900 dark:text-amber-200">{n.title}</p>
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-600 dark:text-amber-100/80">
                {n.content}
              </p>
              <p className="mt-2 text-xs text-slate-400 dark:text-amber-200/50">
                {n.division?.name || 'Umum'} • {n.user?.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Halo, {user.name} 👋</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Berikut ringkasan aktivitas Anda hari ini.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ProfileCard />
        <div className="lg:col-span-2">
          <QuickAttendance />
        </div>
      </div>

      {/* Visualisasi Grafik Statistik Kehadiran & Tren */}
      <AttendanceCharts />

      {/* Widget Siapa yang Aktif Hari Ini */}
      <TodayColleagues />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingSchedules />
        <PinnedNotes />
      </div>
    </div>
  );
}
