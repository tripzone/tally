import type { Activity, DaysMap } from '../types';

interface ExportModalProps {
  activities: Activity[];
  days: DaysMap;
  onClose: () => void;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(activities: Activity[], days: DaysMap, year: number | 'all'): string {
  const dateStrs = Object.keys(days)
    .filter((dateStr) => year === 'all' || dateStr.startsWith(`${year}-`))
    .sort();

  const header = ['Date', ...activities.map((a) => a.name)];
  const rows = dateStrs.map((dateStr) => {
    const dayScores = days[dateStr] ?? {};
    return [
      dateStr,
      ...activities.map((a) => {
        const value = dayScores[a.id];
        return value == null ? '' : String(value);
      }),
    ];
  });

  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExportModal({ activities, days, onClose }: ExportModalProps) {
  const years = [...new Set(Object.keys(days).map((dateStr) => Number(dateStr.slice(0, 4))))].sort(
    (a, b) => b - a
  );

  function handleExport(year: number | 'all') {
    const csv = buildCsv(activities, days, year);
    const filename = year === 'all' ? 'tally-export-all.csv' : `tally-export-${year}.csv`;
    downloadCsv(filename, csv);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal export-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export data</h2>
        <p className="settings-hint">Choose a year to download as CSV.</p>

        {years.length === 0 ? (
          <p className="metric-chart-empty">No data recorded yet.</p>
        ) : (
          <div className="settings-list">
            {years.map((year) => (
              <button type="button" key={year} className="export-year-row" onClick={() => handleExport(year)}>
                {year}
              </button>
            ))}
            <button type="button" className="export-year-row" onClick={() => handleExport('all')}>
              All years
            </button>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
