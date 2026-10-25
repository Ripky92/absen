/** Halaman sementara — akan diganti saat fitur masing-masing dibangun. */
export default function PagePlaceholder({ title, description }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        {description || 'Halaman ini sedang dalam pengembangan.'}
      </div>
    </div>
  );
}
