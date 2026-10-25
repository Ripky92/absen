import { useCallback, useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { Alert, Badge, Card, EmptyState, Field, LoadingBlock, Modal, PageHeader, Pagination } from '../../components/ui';
import { btnGhost, btnPrimary, getErrorMessage, inputClass } from '../../utils/helpers';

function UserModal({ target, divisions, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: target?.name ?? '',
    email: target?.email ?? '',
    password: '',
    role: target?.role ?? 'user',
    division_id: target?.division_id ?? '',
    phone: target?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = { ...form, division_id: form.division_id || null, phone: form.phone || null };
    if (target && !payload.password) delete payload.password;
    try {
      if (target) await axiosClient.put(`/users/${target.id}`, payload);
      else await axiosClient.post('/users', payload);
      onSaved(target ? 'User berhasil diperbarui' : 'User berhasil dibuat');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={target ? 'Edit User' : 'Tambah User'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="Nama" htmlFor="u-name" required>
          <input id="u-name" name="name" required value={form.name} onChange={set} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="u-email" required>
          <input id="u-email" name="email" type="email" required value={form.email} onChange={set} className={inputClass} />
        </Field>
        <Field label={target ? 'Password (kosongkan jika tidak diubah)' : 'Password'} htmlFor="u-password" required={!target}>
          <input id="u-password" name="password" type="password" minLength={8} required={!target} autoComplete="new-password" value={form.password} onChange={set} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" htmlFor="u-role" required>
            <select id="u-role" name="role" value={form.role} onChange={set} className={inputClass}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Divisi" htmlFor="u-division">
            <select id="u-division" name="division_id" value={form.division_id} onChange={set} className={inputClass}>
              <option value="">Tanpa divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="No. Telepon" htmlFor="u-phone">
          <input id="u-phone" name="phone" value={form.phone} onChange={set} className={inputClass} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Batal</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </form>
    </Modal>
  );
}

function DivisionModal({ target, onClose, onSaved }) {
  const [form, setForm] = useState({ name: target?.name ?? '', description: target?.description ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (target) await axiosClient.put(`/divisions/${target.id}`, form);
      else await axiosClient.post('/divisions', form);
      onSaved(target ? 'Divisi berhasil diperbarui' : 'Divisi berhasil dibuat');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={target ? 'Edit Divisi' : 'Tambah Divisi'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="Nama Divisi" htmlFor="d-name" required>
          <input id="d-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Deskripsi" htmlFor="d-desc">
          <textarea id="d-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Batal</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ManageUsers() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('users');
  const [divisions, setDivisions] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [userModal, setUserModal] = useState(null);
  const [divisionModal, setDivisionModal] = useState(null);

  const loadDivisions = useCallback(async () => {
    try {
      const res = await axiosClient.get('/divisions');
      setDivisions(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/users', {
        params: { page, per_page: 10, search: debounced || undefined, division_id: divisionFilter || undefined },
      });
      const p = res.data.data;
      setUsers(p.data);
      setMeta({ current_page: p.current_page, last_page: p.last_page, total: p.total });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, debounced, divisionFilter]);

  useEffect(() => {
    loadDivisions();
  }, [loadDivisions]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const afterSave = (text) => {
    setUserModal(null);
    setDivisionModal(null);
    setMessage(text);
    loadDivisions();
    loadUsers();
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Hapus user "${u.name}"?`)) return;
    try {
      await axiosClient.delete(`/users/${u.id}`);
      setMessage('User berhasil dihapus');
      loadUsers();
      loadDivisions();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const removeDivision = async (d) => {
    if (!window.confirm(`Hapus divisi "${d.name}"? Jadwal dan catatan divisi ini ikut terhapus.`)) return;
    try {
      await axiosClient.delete(`/divisions/${d.id}`);
      setMessage('Divisi berhasil dihapus');
      loadDivisions();
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const tabClass = (active) =>
    `flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
      active
        ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  return (
    <div className="space-y-6">
      <PageHeader title="Kelola User & Divisi" subtitle="Tambah, ubah, dan hapus data user serta divisi.">
        {tab === 'users' ? (
          <button type="button" onClick={() => setUserModal({ target: null })} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Tambah User
          </button>
        ) : (
          <button type="button" onClick={() => setDivisionModal({ target: null })} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Tambah Divisi
          </button>
        )}
      </PageHeader>

      <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button type="button" className={tabClass(tab === 'users')} onClick={() => setTab('users')}><Users className="h-4 w-4" /> User</button>
        <button type="button" className={tabClass(tab === 'divisions')} onClick={() => setTab('divisions')}><Building2 className="h-4 w-4" /> Divisi</button>
      </div>

      <Alert type="success" onClose={() => setMessage('')}>{message}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {tab === 'users' ? (
        <Card>
          <div className="flex flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
            <select
              aria-label="Filter divisi"
              value={divisionFilter}
              onChange={(e) => { setDivisionFilter(e.target.value); setPage(1); }}
              className={`${inputClass} sm:w-52`}
            >
              <option value="">Semua divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Divisi</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {!loading &&
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="px-4 py-3">{u.division ? <Badge tone="violet">{u.division.name}</Badge> : <span className="text-slate-400 dark:text-slate-500">-</span>}</td>
                      <td className="px-4 py-3"><Badge tone={u.role === 'admin' ? 'rose' : 'slate'}><span className="capitalize">{u.role}</span></Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setUserModal({ target: u })} aria-label="Edit user" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" disabled={u.id === me.id} onClick={() => removeUser(u)} aria-label="Hapus user" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 disabled:opacity-30">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {loading && <LoadingBlock />}
          {!loading && users.length === 0 && <EmptyState icon={Users} text="Tidak ada user ditemukan." />}
          <Pagination meta={meta} loading={loading} onPage={setPage} />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Divisi</th>
                  <th className="px-4 py-3 font-semibold">Deskripsi</th>
                  <th className="px-4 py-3 font-semibold">Anggota</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {divisions.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{d.name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500 dark:text-slate-400">{d.description || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.users_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setDivisionModal({ target: d })} aria-label="Edit divisi" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => removeDivision(d)} aria-label="Hapus divisi" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {divisions.length === 0 && <EmptyState icon={Building2} text="Belum ada divisi." />}
        </Card>
      )}

      {userModal && <UserModal target={userModal.target} divisions={divisions} onClose={() => setUserModal(null)} onSaved={afterSave} />}
      {divisionModal && <DivisionModal target={divisionModal.target} onClose={() => setDivisionModal(null)} onSaved={afterSave} />}
    </div>
  );
}
