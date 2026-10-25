# 🚀 Sistem Absensi & Kolaborasi Divisi

Aplikasi web modern untuk manajemen kehadiran kerja (absensi), agenda kegiatan, dan ruang kolaborasi catatan antar divisi secara real-time. Dilengkapi fitur validasi GPS Geolocation, deteksi keterlambatan otomatis, visualisasi grafik interaktif, lampiran bukti izin/sakit, serta dukungan Dark Mode.

---

## 🌟 Fitur Utama

### 1. ⏱️ Absensi Cerdas & Geolocation
- **Check-In & Check-Out Real-Time**: Pencatatan waktu masuk dan pulang yang akurat.
- **Validasi Lokasi GPS**: Mendeteksi koordinat latitude & longitude pengguna saat check-in dan menyediakan tautan langsung ke Google Maps.
- **Deteksi Keterlambatan Otomatis**: Sistem otomatis menandai status *Terlambat* jika check-in melewati jam masuk standar (08:00:00).
- **Pengajuan Izin & Sakit**: Formulir izin/sakit mandiri yang dilengkapi fitur upload bukti surat dokter/dokumen pendukung.

### 2. 📊 Visualisasi Grafik & Statistik Kehadiran
- **Breakdown Donut Chart**: Proporsi status kehadiran bulan berjalan (Tepat Waktu, Terlambat, Izin, Sakit).
- **Tren Kehadiran 7 Hari Terakhir**: Grafik batang vertikal dinamis dengan rincian tooltip interaktif.
- **Perbandingan Antar Divisi (Admin)**: Visualisasi tingkat kehadiran seluruh divisi organisasi.

### 3. 👥 Kolaborasi & Koordinasi Divisi
- **Siapa yang Aktif Hari Ini? (Who's In Today)**: Widget dashboard untuk memantau rekan satu divisi atau seluruh divisi yang telah hadir hari ini.
- **Notes Kolaborasi (Google Keep Style)**: Board catatan bersama dengan filter divisi, sematkan catatan penting (*pin*), dan kolom diskusi/komentar real-time.
- **Jadwal Kegiatan**: Agenda kegiatan bersama dengan filter "Semua Divisi" dan "Divisi Saya".

### 4. 🛠️ Panel Khusus Admin
- **Rekap Absensi**: Filter data kehadiran berdasarkan rentang tanggal, divisi, dan status.
- **Export Laporan ke CSV**: Mengunduh seluruh rekapitulasi data absensi (termasuk koordinat lokasi dan status keterlambatan) dengan satu klik.
- **Kelola User & Divisi**: Manajemen penuh data anggota (tambah, edit, hapus, penetapan divisi, dan role).

### 5. 🎨 UI/UX Modern & Dark Mode
- Antarmuka responsif dan estetik berbasis Tailwind CSS dan Lucide Icons.
- Dukungan **Dark Mode** dan **Light Mode** yang tersinkronisasi otomatis dengan preferensi pengguna.
- Manajemen Profil mandiri: update informasi akun, ganti kata sandi, serta upload/hapus foto avatar.

---

## 🛠️ Tech Stack

- **Backend**: [Laravel 11](https://laravel.com/) (PHP 8.2+) dengan [Laravel Sanctum](https://laravel.com/docs/sanctum) untuk autentikasi API berbasis token.
- **Frontend**: [React 19](https://react.dev/), [Vite](https://vite.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/).
- **Database**: SQLite / MySQL.

---

## 🚀 Panduan Menjalankan Projek

### 1. Prasyarat
Pastikan sistem Anda telah terinstal:
- PHP >= 8.2
- Composer
- Node.js >= 18 & NPM

---

### 2. Setup Backend (Laravel)

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```

2. Instal dependensi PHP:
   ```bash
   composer install
   ```

3. Salin konfigurasi environment:
   ```bash
   cp .env.example .env
   ```

4. Generate Application Key:
   ```bash
   php artisan key:generate
   ```

5. Jalankan migrasi database dan pengisian data awal (seeder):
   ```bash
   php artisan migrate --seed
   ```

6. Buat tautan simbolis ke folder storage publik:
   ```bash
   php artisan storage:link
   ```

7. Jalankan server backend:
   ```bash
   php artisan serve
   ```
   Backend berjalan di: `http://localhost:8000`

---

### 3. Setup Frontend (React + Vite)

1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```

2. Instal dependensi JavaScript:
   ```bash
   npm install
   ```

3. Jalankan development server frontend:
   ```bash
   npm run dev
   ```
   Frontend berjalan di: `http://localhost:5173`

---

## 🔑 Akun Demo (Default Seeder)

Setelah menjalankan `php artisan migrate --seed`, Anda dapat langsung login menggunakan akun berikut:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@mail.com` | `password` |
| **User (IT)** | `budi@mail.com` | `password` |
| **User (HRD)** | `siti@mail.com` | `password` |
| **User (Umum)** | `user@mail.com` | `password` |

---

## 📁 Struktur Direktori

```text
absen/
├── backend/                  # Source code Laravel 11 API
│   ├── app/Http/Controllers/ # Controller endpoint API (Absensi, Notes, Jadwal, dll)
│   ├── app/Models/           # Eloquent Models & Relasi
│   ├── database/migrations/  # Skema tabel database
│   ├── routes/api.php        # Definisi rute REST API
│   └── .env.example          # Template konfigurasi environment
├── frontend/                 # Source code React + Vite
│   ├── src/components/       # Komponen UI Reusable (Modal, Badge, Charts, dll)
│   ├── src/context/          # AuthContext & ThemeContext (Dark Mode)
│   ├── src/layouts/          # Dashboard Layout & Sidebar Navigasi
│   ├── src/pages/            # Halaman Dashboard, Absensi, Notes, Jadwal, Profil
│   └── src/utils/            # Helper utilitas waktu, format, dan Geolocation
└── README.md                 # Dokumentasi projek utama
```

---

## 📄 Lisensi
Projek ini dibuat untuk keperluan manajemen internal dan kolaborasi divisi. Bebas dikembangkan sesuai kebutuhan tim.
