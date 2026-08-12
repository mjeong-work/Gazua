interface AdminStatCardProps {
  label: string;
  value: string | number;
  caption?: string;
}

export default function AdminStatCard({ label, value, caption }: AdminStatCardProps) {
  return (
    <div className="p-4 bg-white border border-neutral-200 rounded-md">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {caption && <p className="text-[11px] text-neutral-400 mt-1">{caption}</p>}
    </div>
  );
}
