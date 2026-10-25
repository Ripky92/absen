import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Pencil, Pin, PinOff, Plus, Send, StickyNote, Trash2, User } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Alert, Badge, Card, EmptyState, Field, LoadingBlock, Modal, PageHeader } from '../components/ui';
import { btnGhost, btnPrimary, formatDateTime, getErrorMessage, inputClass } from '../utils/helpers';

/** Modal Buat / Edit Catatan */
function NoteModal({ note, divisions, onClose, onSaved }) {
  const { user, isAdmin } = useAuth();
  const [form, setForm] = useState({
    title: note?.title ?? '',
    content: note?.content ?? '',
    division_id: note ? (note.division_id ?? '') : (user.division_id ?? ''),
    is_pinned: note?.is_pinned ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = { title: form.title, content: form.content, is_pinned: form.is_pinned };
    if (isAdmin) payload.division_id = form.division_id || null;
    try {
      if (note) await axiosClient.put(`/notes/${note.id}`, payload);
      else await axiosClient.post('/notes', payload);
      onSaved(note ? 'Catatan berhasil diperbarui' : 'Catatan berhasil dibuat');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={note ? 'Edit Catatan' : 'Catatan Baru'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="Judul" htmlFor="note-title" required>
          <input
            id="note-title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Isi Catatan" htmlFor="note-content" required>
          <textarea
            id="note-content"
            rows={6}
            required
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className={inputClass}
          />
        </Field>
        {isAdmin ? (
          <Field label="Divisi" htmlFor="note-division">
            <select
              id="note-division"
              value={form.division_id}
              onChange={(e) => setForm({ ...form, division_id: e.target.value })}
              className={inputClass}
            >
              <option value="">Umum (semua divisi)</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="text-xs text-slate-500">
            Catatan akan dibagikan ke divisi Anda ({user.division?.name || '-'}).
          </p>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.is_pinned}
            onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-700 dark:bg-slate-800"
          />
          Sematkan catatan ini di atas
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Batal</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Modal Detail Catatan & Diskusi Komentar Real-Time */
function NoteDetailModal({ note, onClose, onRefresh }) {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadComments = useCallback(async () => {
    try {
      const res = await axiosClient.get(`/notes/${note.id}/comments`);
      setComments(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingComments(false);
    }
  }, [note.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await axiosClient.post(`/notes/${note.id}/comments`, { comment: newComment });
      setComments((prev) => [...prev, res.data.data]);
      setNewComment('');
      onRefresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      await axiosClient.delete(`/notes/${note.id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onRefresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal title={note.title} onClose={onClose}>
      <div className="space-y-5">
        {/* Header Catatan */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Badge tone={note.division ? 'violet' : 'slate'}>
              {note.division?.name || 'Umum'}
            </Badge>
            {note.is_pinned && <Badge tone="rose">Disematkan</Badge>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <User className="h-3.5 w-3.5" />
            <span className="dark:text-slate-300">{note.user?.name}</span>
            <span>•</span>
            <span>{formatDateTime(note.created_at)}</span>
          </div>
        </div>

        {/* Konten Catatan */}
        <div className="max-h-60 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-800/80 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-line border border-slate-100 dark:border-slate-800/60">
          {note.content}
        </div>

        {/* Bagian Diskusi & Komentar */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Diskusi & Komentar
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {comments.length}
              </span>
            </h4>
          </div>

          <Alert onClose={() => setError('')}>{error}</Alert>

          {/* List Komentar */}
          <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
            {loadingComments ? (
              <LoadingBlock text="Memuat komentar..." />
            ) : comments.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                Belum ada komentar. Mulai diskusi pertama untuk catatan ini!
              </p>
            ) : (
              comments.map((c) => {
                const canDelete = isAdmin || c.user_id === user.id;
                return (
                  <div key={c.id} className="flex items-start gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/60 p-3 shadow-xs">
                    {c.user?.avatar_url ? (
                      <img
                        src={c.user.avatar_url}
                        alt={c.user.name}
                        className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {c.user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{c.user?.name}</span>
                          {c.user?.division?.name && (
                            <span className="rounded bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.2 text-[10px] text-slate-500 dark:text-slate-400">
                              {c.user.division.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                          <span>{formatDateTime(c.created_at)}</span>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              aria-label="Hapus komentar"
                              className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                        {c.comment}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Komentar Baru */}
          <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Tulis tanggapan atau komentar..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default function Notes() {
  const { user, isAdmin } = useAuth();
  const [notes, setNotes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [filter, setFilter] = useState('all'); // all | general | <division id>
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [modal, setModal] = useState(null); // { note } untuk edit/tambah
  const [selectedNote, setSelectedNote] = useState(null); // note untuk modal detail & diskusi

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [n, d] = await Promise.all([axiosClient.get('/notes'), axiosClient.get('/divisions')]);
      setNotes(n.data.data);
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

  const visible = useMemo(() => {
    if (filter === 'all') return notes;
    if (filter === 'general') return notes.filter((n) => n.division_id === null);
    return notes.filter((n) => String(n.division_id) === filter);
  }, [notes, filter]);

  const canModify = (n) => isAdmin || n.user_id === user.id;

  const togglePin = async (e, n) => {
    e.stopPropagation();
    try {
      await axiosClient.patch(`/notes/${n.id}/pin`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const remove = async (e, n) => {
    e.stopPropagation();
    if (!window.confirm(`Hapus catatan "${n.title}"?`)) return;
    try {
      await axiosClient.delete(`/notes/${n.id}`);
      setMessage('Catatan berhasil dihapus');
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSaved = (text) => {
    setModal(null);
    setMessage(text);
    load();
  };

  const chip = (active) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
      active
        ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-600'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="space-y-6">
      <PageHeader title="Notes Kolaborasi" subtitle="Papan catatan bersama & ruang diskusi divisi.">
        <button type="button" onClick={() => setModal({ note: null })} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Catatan Baru
        </button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(filter === 'all')} onClick={() => setFilter('all')}>Semua</button>
        <button type="button" className={chip(filter === 'general')} onClick={() => setFilter('general')}>Umum</button>
        {divisions
          .filter((d) => isAdmin || d.id === user.division_id)
          .map((d) => (
            <button
              key={d.id}
              type="button"
              className={chip(filter === String(d.id))}
              onClick={() => setFilter(String(d.id))}
            >
              {d.name}
            </button>
          ))}
      </div>

      <Alert type="success" onClose={() => setMessage('')}>{message}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <LoadingBlock />
      ) : visible.length === 0 ? (
        <Card><EmptyState icon={StickyNote} text="Belum ada catatan." /></Card>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {visible.map((n) => (
            <article
              key={n.id}
              onClick={() => setSelectedNote(n)}
              className={`group mb-4 cursor-pointer break-inside-avoid rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                n.is_pinned
                  ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{n.title}</h3>
                {canModify(n) && (
                  <button
                    type="button"
                    onClick={(e) => togglePin(e, n)}
                    aria-label={n.is_pinned ? 'Lepas pin' : 'Sematkan'}
                    className={`rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10 ${
                      n.is_pinned ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {n.is_pinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
                  </button>
                )}
              </div>

              <p className="mt-2 line-clamp-4 whitespace-pre-line break-words text-sm text-slate-600 dark:text-slate-300">
                {n.content}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100/80 dark:border-slate-800/80 pt-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <Badge tone={n.division ? 'violet' : 'slate'}>{n.division?.name || 'Umum'}</Badge>
                  <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                    {n.comments_count || 0}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {canModify(n) && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ note: n });
                        }}
                        aria-label="Edit catatan"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => remove(e, n)}
                        aria-label="Hapus catatan"
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Catatan */}
      {modal && (
        <NoteModal
          note={modal.note}
          divisions={divisions}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal Detail Catatan & Diskusi Komentar */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
