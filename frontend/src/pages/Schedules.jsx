import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, MapPin, Pencil, Plus, Trash2, User } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Alert, Badge, Card, EmptyState, Field, LoadingBlock, Modal, PageHeader } from '../components/ui';
import { btnGhost, btnPrimary, formatDateTime, getErrorMessage, inputClass, toLocalInput } from '../utils/helpers';

const emptyForm = { title: '', description: '', division_id: '', start_time: '', end_time: '', location: '' };

function ScheduleModal({ schedule, divisions, onClose, onSaved }) {
  const [form, setForm] = useState(
    schedule
      ? {
          title: schedule.title,
          description: schedule.description,
          division_id: schedule.division_id ?? '',
          start_time: toLocalInput(schedule.start_time),
          end_time: toLocalInput(schedule.end_time),
          location: schedule.location,
        }
      : emptyForm,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = { ...form, division_id: form.division_id || null };
    try {
      if (schedule) await axiosClient.put(`/schedules/${schedule.id}`, payload);
      else await axiosClient.post('/schedules', payload);
      onSaved(schedule ? 'Jadwal berhasil diperbarui' : 'Jadwal berhasil dibuat');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={schedule ? 'Edit Jadwal' : 'Tambah Jadwal'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="Judul" htmlFor="title" required>
          <input id="title" name="title" required value={form.title} onChange={set} className={inputClass} />
        </Field>
        <Field label="Deskripsi" htmlFor="description" required>
          <textarea id="description" name="description" rows={3} required value={form.description} onChange={set} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mulai" htmlFor="start_time" required>
            <input id="start_time" name="start_time" type="datetime-local" required value={form.start_time} onChange={set} className={inputClass} />
          </Field>
          <Field label="Selesai" htmlFor="end_time" required>
            <input id="end_time" name="end_time" type="datetime-local" required value={form.end_time} onChange={set} className={inputClass} />
          </Field>
        </div>
        <Field label="Lokasi" htmlFor="location" required>
          <input id="location" name="location" required value={form.location} onChange={set} className={inputClass} />
        </Field>
        <Field label="Untuk Divisi" htmlFor="division_id">
          <select id="division_id" name="division_id" value={form.division_id} onChange={set} className={inputClass}>
            <option value="">Semua Divisi</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Batal</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Schedules() {
  const { user, isAdmin } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [filter, setFilter] = useState('all'); // all | mine
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null); // null | { schedule }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, d] = await Promise.all([axiosClient.get('/schedules'), axiosClient.get('/divisions')]);
      setSchedules(s.data.data);
      setDivisions(d.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (filter === 'mine' ? schedules.filter((s) => s.division_id === user.division_id) : schedules),
    [schedules, filter, user.division_id],
  );

  const handleSaved = (text) => {
    setModal(null);
    setMessage(text);
    load();
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Hapus jadwal "${s.title}"?`)) return;
    try {
      await axiosClient.delete(`/schedules/${s.id}`);
      setMessage('Jadwal berhasil dihapus');
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const tabClass = (active) =>
    `rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
      active
        ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  return (
    <div className="space-y-6">
      <PageHeader title="Jadwal Kegiatan" subtitle="Agenda divisi dan kegiatan untuk seluruh divisi.">
        {isAdmin && (
          <button type="button" onClick={() => setModal({ schedule: null })} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Tambah Jadwal
          </button>
        )}
      </PageHeader>

      <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button type="button" className={tabClass(filter === 'all')} onClick={() => setFilter('all')}>Semua Divisi</button>
        <button type="button" className={tabClass(filter === 'mine')} onClick={() => setFilter('mine')}>Divisi Saya</button>
      </div>

      <Alert type="success" onClose={() => setMessage('')}>{message}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <LoadingBlock />
      ) : visible.length === 0 ? (
        <Card><EmptyState icon={CalendarClock} text="Belum ada jadwal kegiatan." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => {
            const past = new Date(s.end_time).getTime() < Date.now();
            return (
              <Card key={s.id} className={`p-5 transition hover:shadow-md ${past ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                  <Badge tone={s.division ? 'violet' : 'slate'}>{s.division?.name || 'Semua Divisi'}</Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{s.description}</p>
                <div className="mt-4 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" /> {formatDateTime(s.start_time)} – {formatDateTime(s.end_time)}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" /> {s.location}</p>
                  <p className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400 dark:text-slate-500" /> {s.creator?.name}</p>
                </div>
                {isAdmin && (
                  <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <button type="button" onClick={() => setModal({ schedule: s })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Edit jadwal">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(s)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40" aria-label="Hapus jadwal">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {modal && <ScheduleModal schedule={modal.schedule} divisions={divisions} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  );
}
