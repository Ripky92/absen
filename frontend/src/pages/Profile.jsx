import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, KeyRound, Lock, Mail, Phone, Trash2, User, UserCheck } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Alert, Badge, Card, Field, LoadingBlock, PageHeader } from '../components/ui';
import { btnGhost, btnPrimary, getErrorMessage, inputClass, toDateInput } from '../utils/helpers';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  // Form Profil
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Form Password
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  // Avatar State
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState(null);

  // Statistik Kehadiran Bulan Ini
  const [stats, setStats] = useState({ hadir: 0, izin: 0, sakit: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Sync profileForm if user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Load statistik kehadiran bulan berjalan
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const now = new Date();
    const start = toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    try {
      const res = await axiosClient.get('/attendances/history', {
        params: { start_date: start, end_date: end, per_page: 100 },
      });
      const data = res.data.data.data || [];
      const summary = data.reduce(
        (acc, item) => {
          if (acc[item.status] !== undefined) acc[item.status] += 1;
          return acc;
        },
        { hadir: 0, izin: 0, sakit: 0 },
      );
      setStats(summary);
    } catch {
      // Abaikan jika gagal memuat statistik
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Update Profil
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback(null);
    try {
      const res = await axiosClient.put('/profile', profileForm);
      const updatedUser = res.data.data;
      updateUser(updatedUser);
      setProfileFeedback({ type: 'success', text: 'Informasi profil berhasil diperbarui.' });
    } catch (err) {
      setProfileFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setProfileSaving(false);
    }
  };

  // Upload Avatar
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran max 2MB di client
    if (file.size > 2 * 1024 * 1024) {
      setAvatarFeedback({ type: 'error', text: 'Ukuran foto maksimal 2MB.' });
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setAvatarUploading(true);
    setAvatarFeedback(null);
    try {
      const res = await axiosClient.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedUser = res.data.data;
      updateUser(updatedUser);
      setAvatarFeedback({ type: 'success', text: 'Foto profil berhasil diperbarui.' });
    } catch (err) {
      setAvatarFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  // Hapus Avatar
  const handleAvatarDelete = async () => {
    if (!window.confirm('Hapus foto profil Anda?')) return;
    setAvatarUploading(true);
    setAvatarFeedback(null);
    try {
      const res = await axiosClient.delete('/profile/avatar');
      const updatedUser = res.data.data;
      updateUser(updatedUser);
      setAvatarFeedback({ type: 'success', text: 'Foto profil berhasil dihapus.' });
    } catch (err) {
      setAvatarFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Update Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      setPasswordFeedback({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setPasswordSaving(true);
    setPasswordFeedback(null);
    try {
      const res = await axiosClient.put('/profile/password', passwordForm);
      setPasswordFeedback({ type: 'success', text: res.data.message || 'Password berhasil diperbarui.' });
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) {
      setPasswordFeedback({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setPasswordSaving(false);
    }
  };

  const monthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil Pengguna"
        subtitle="Kelola informasi pribadi, foto avatar, dan keamanan akun Anda."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Kartu Identitas & Statistik Kehadiran */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600" />
            <div className="px-5 pb-6">
              {/* Foto Profil & Tombol Aksi */}
              <div className="relative -mt-12 flex flex-col items-center">
                <div className="relative group">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user?.name}
                      className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-slate-800"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-bold text-white shadow-lg dark:border-slate-800">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Tombol Kamera Overlay */}
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Ubah foto profil"
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />

                <h2 className="mt-4 text-center text-lg font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5" /> {user?.email}
                </p>

                {/* Badges */}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Badge tone="indigo">{user?.division?.name || 'Tanpa Divisi'}</Badge>
                  <Badge tone={user?.role === 'admin' ? 'rose' : 'slate'}>
                    <span className="capitalize">{user?.role}</span>
                  </Badge>
                </div>

                {/* Tombol Hapus Avatar */}
                {user?.avatar_url && (
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={handleAvatarDelete}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 transition hover:text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus Foto Profil
                  </button>
                )}

                {avatarFeedback && (
                  <div className="mt-3 w-full">
                    <Alert type={avatarFeedback.type} onClose={() => setAvatarFeedback(null)}>
                      {avatarFeedback.text}
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Ringkasan Kehadiran Bulan Ini */}
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Kehadiran ({monthName})
            </h3>
            {statsLoading ? (
              <LoadingBlock text="Memuat statistik..." />
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.hadir}</p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Hadir</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{stats.izin}</p>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Izin</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 dark:border-sky-900/60 dark:bg-sky-950/40">
                  <p className="text-xl font-bold text-sky-700 dark:text-sky-300">{stats.sakit}</p>
                  <p className="text-xs font-medium text-sky-600 dark:text-sky-400">Sakit</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Kolom Kanan: Form Informasi Pribadi & Keamanan Akun */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card 1: Informasi Pribadi */}
          <Card className="p-5 sm:p-6">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Informasi Pribadi
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Perbarui nama lengkap, alamat email, dan nomor telepon aktif Anda.
              </p>
            </div>

            {profileFeedback && (
              <div className="mt-4">
                <Alert type={profileFeedback.type} onClose={() => setProfileFeedback(null)}>
                  {profileFeedback.text}
                </Alert>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama Lengkap" htmlFor="name" required>
                  <input
                    id="name"
                    name="name"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Alamat Email" htmlFor="email" required>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nomor Telepon" htmlFor="phone">
                  <input
                    id="phone"
                    name="phone"
                    placeholder="Contoh: 08123456789"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Divisi (Read-Only)">
                  <input
                    disabled
                    value={user?.division?.name || 'Belum Ditentukan'}
                    className={`${inputClass} cursor-not-allowed`}
                  />
                </Field>
              </div>

              <Field label="Peran Akun / Role (Read-Only)">
                <input
                  disabled
                  value={user?.role?.toUpperCase() || 'USER'}
                  className={`${inputClass} cursor-not-allowed`}
                />
              </Field>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className={btnPrimary}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </Card>

          {/* Card 2: Keamanan Akun (Ganti Password) */}
          <Card className="p-5 sm:p-6">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Keamanan Akun
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Pastikan akun Anda tetap aman dengan menggunakan password minimal 8 karakter.
              </p>
            </div>

            {passwordFeedback && (
              <div className="mt-4">
                <Alert type={passwordFeedback.type} onClose={() => setPasswordFeedback(null)}>
                  {passwordFeedback.text}
                </Alert>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <Field label="Password Saat Ini" htmlFor="current_password" required>
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Password Baru" htmlFor="new_password" required>
                  <input
                    id="new_password"
                    name="new_password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Konfirmasi Password Baru" htmlFor="new_password_confirmation" required>
                  <input
                    id="new_password_confirmation"
                    name="new_password_confirmation"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Ulangi password baru"
                    value={passwordForm.new_password_confirmation}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-600 dark:shadow-indigo-600/30 dark:hover:bg-indigo-700"
                >
                  <KeyRound className="h-4 w-4" />
                  {passwordSaving ? 'Memproses...' : 'Ubah Password'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
