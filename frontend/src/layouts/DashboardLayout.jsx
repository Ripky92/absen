import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const icon = (d) => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  dashboard: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10',
  attendance: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z',
  schedule: 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  notes: 'M7 8h10M7 12h10M7 16h6M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0',
  users: 'M17 20h5v-2a4 4 0 00-5-3.87M9 20H2v-2a4 4 0 015-3.87m6-6.13a4 4 0 11-8 0 4 4 0 018 0zm8 0a3 3 0 11-6 0 3 3 0 016 0z',
  recap: 'M9 17v-6m4 6V7m4 10v-3M5 21h14a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v16a1 1 0 001 1z',
};

const commonMenu = [
  { to: '/dashboard', label: 'Dashboard', icon: ICONS.dashboard },
  { to: '/attendance', label: 'Absensi', icon: ICONS.attendance },
  { to: '/schedules', label: 'Jadwal Kegiatan', icon: ICONS.schedule },
  { to: '/notes', label: 'Notes Kolaborasi', icon: ICONS.notes },
  { to: '/profile', label: 'Profil', icon: ICONS.profile },
];

const adminMenu = [
  { to: '/admin/users', label: 'Kelola User & Divisi', icon: ICONS.users },
  { to: '/admin/recap', label: 'Rekap Absensi', icon: ICONS.recap },
];

function MenuLink({ item, onClick }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
        }`
      }
    >
      {icon(item.icon)}
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={close} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white p-4 transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center gap-3 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/20">
            A
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-slate-900 dark:text-white">Absensi</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">& Kolaborasi Divisi</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {commonMenu.map((item) => (
            <MenuLink key={item.to} item={item} onClick={close} />
          ))}

          {isAdmin && (
            <>
              <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Admin</p>
              {adminMenu.map((item) => (
                <MenuLink key={item.to} item={item} onClick={close} />
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* Konten */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Buka menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            {/* Toggle Dark Mode */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>

            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                {user?.role}
                {user?.division?.name ? ` • ${user.division.name}` : ''}
              </p>
            </div>
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user?.name}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-900"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
            >
              Keluar
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
