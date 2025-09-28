// app/doctor/schedule/page.tsx
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Gender = 'M' | 'F' | 'X';

type DoctorAdditionalInfo = {
  id: number;
  doctor_id: number;
  profile_photo?: string | null;
  title: string;
  speciality: string;
  work_experience: number;
  npi_number?: string | null;
  qualification?: string | null;
} | null;

type DoctorStateRow = {
  id: number;
  doctor_id: number;
  state_code: string;
};

type Weekday =
  | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

type AvailabilityItem = {
  availability_id: number;   // <-- NEW
  day_of_week: Weekday;
  start_time: string;        // "HH:MM:SS" or "HH:MM:SS.ssssss"
  end_time: string;          // same format
  buffer_time: number;
};

type DoctorRow = {
  id: number;
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  gender?: Gender | null;
  dob?: string | null;
  additional_info?: DoctorAdditionalInfo;
  states: DoctorStateRow[];
  availability: AvailabilityItem[];
};

const API_LIST = 'https://dev.clinibooth.com/doctors/doctors/';
const API_ADD_AVAIL = (doctorId: number) => `https://dev.clinibooth.com/doctor-availability/${doctorId}`;
const API_DEL_AVAIL = (doctorId: number, availabilityId: number) =>
  `https://dev.clinibooth.com/doctors/${doctorId}/${availabilityId}`;

const WEEKDAYS: Weekday[] = [
  'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
];

const weekdayIndex: Record<Weekday, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6
};

function hhmmToHHMMSS(hhmm: string): string {
  // from <input type="time"> like "09:30" -> "09:30:00"
  if (!hhmm) return '';
  return /^\d{2}:\d{2}(:\d{2})?$/.test(hhmm) ? (hhmm.length === 5 ? `${hhmm}:00` : hhmm) : hhmm;
}

export default function DoctorAvailabilityPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [doctors, setDoctors] = React.useState<DoctorRow[]>([]);

  // simple UI filters
  const [q, setQ] = React.useState('');
  const [stateFilter, setStateFilter] = React.useState(''); // "VA", "DC", etc.

  // per-doctor "new availability" form state
  const [drafts, setDrafts] = React.useState<Record<number, {
    day_of_week: Weekday | '';
    start_hhmm: string; // from <input type="time">
    end_hhmm: string;   // from <input type="time">
    buffer_time: string;
  }>>({});

  const [submitting, setSubmitting] = React.useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = React.useState<Record<string, boolean>>({});
  const [toast, setToast] = React.useState<string | null>(null);

  async function fetchDoctors() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_LIST, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as DoctorRow[];
      setDoctors(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void fetchDoctors();
  }, []);

  function fullName(d: DoctorRow) {
    const f = d.first_name?.trim() || '';
    const l = d.last_name?.trim() || '';
    const name = `${f} ${l}`.trim();
    return name || d.email;
  }

  function matchesFilters(d: DoctorRow) {
    const needle = q.trim().toLowerCase();
    if (needle) {
      const hay =
        [
          d.email,
          d.first_name ?? '',
          d.last_name ?? '',
          d.additional_info?.title ?? '',
          d.additional_info?.speciality ?? '',
        ]
          .join(' ')
          .toLowerCase();
      if (!hay.includes(needle)) return false;
    }

    if (stateFilter.trim()) {
      const want = stateFilter.trim().toUpperCase();
      const has = (d.states || []).some(s => s.state_code.toUpperCase() === want);
      if (!has) return false;
    }

    return true;
  }

  const filtered = doctors.filter(matchesFilters);

  function sortSlots(a: AvailabilityItem, b: AvailabilityItem) {
    const da = weekdayIndex[a.day_of_week];
    const db = weekdayIndex[b.day_of_week];
    if (da !== db) return da - db;
    return (a.start_time || '').localeCompare(b.start_time || '');
  }

  function getDraft(doctorId: number) {
    return drafts[doctorId] ?? { day_of_week: '', start_hhmm: '', end_hhmm: '', buffer_time: '' };
  }

  function setDraft(doctorId: number, next: Partial<ReturnType<typeof getDraft>>) {
    setDrafts(prev => ({ ...prev, [doctorId]: { ...getDraft(doctorId), ...next } }));
  }

  async function addAvailability(d: DoctorRow) {
    const draft = getDraft(d.id);

    // basic client validation
    if (!draft.day_of_week) {
      setToast('Please select a day of week.');
      return;
    }
    if (!draft.start_hhmm || !draft.end_hhmm) {
      setToast('Please provide both start and end time.');
      return;
    }
    const start = hhmmToHHMMSS(draft.start_hhmm);
    const end = hhmmToHHMMSS(draft.end_hhmm);
    if (start >= end) {
      setToast('End time must be after start time.');
      return;
    }

    const buf = draft.buffer_time.trim() ? Number(draft.buffer_time) : 0;
    if (Number.isNaN(buf) || buf < 0) {
      setToast('Buffer time must be a non-negative number.');
      return;
    }

    const payload = {
      day_of_week: draft.day_of_week as Weekday,
      start_time: start, // "HH:MM:SS"
      end_time: end,     // "HH:MM:SS"
      buffer_time: buf,
    };

    try {
      setSubmitting(prev => ({ ...prev, [d.id]: true }));
      const res = await fetch(API_ADD_AVAIL(d.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Add availability failed (${res.status})`);
      }
      setDrafts(prev => ({ ...prev, [d.id]: { day_of_week: '', start_hhmm: '', end_hhmm: '', buffer_time: '' } }));
      setToast('Availability added.');
      await fetchDoctors();
    } catch (e: unknown) {
      setToast((e as Error).message || 'Failed to add availability');
    } finally {
      setSubmitting(prev => ({ ...prev, [d.id]: false }));
    }
  }

  async function deleteAvailability(doctorId: number, availabilityId: number) {
    const key = `${doctorId}:${availabilityId}`;
    const ok = confirm('Delete this availability slot?');
    if (!ok) return;

    try {
      setDeleting(prev => ({ ...prev, [key]: true }));
      const res = await fetch(API_DEL_AVAIL(doctorId, availabilityId), {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      // Expect 204 No Content
      if (!res.ok && res.status !== 204) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Delete failed (${res.status})`);
      }
      setToast('Availability deleted.');
      await fetchDoctors();
    } catch (e: unknown) {
      setToast((e as Error).message || 'Failed to delete availability');
    } finally {
      setDeleting(prev => ({ ...prev, [key]: false }));
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold">Doctor Availability</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <Input
            placeholder="Search name, email, speciality…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-72"
          />
          <Input
            placeholder="State (e.g., VA)"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full sm:w-32 uppercase"
          />
          <Button variant="outline" onClick={() => { setQ(''); setStateFilter(''); }}>
            Clear
          </Button>
          <Button onClick={fetchDoctors}>Refresh</Button>
        </div>
      </div>

      {toast ? (
        <div
          className="text-sm rounded border px-3 py-2 bg-emerald-50 border-emerald-200 text-emerald-800"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No doctors found.</p>
      ) : (
        <div className="space-y-6">
          {filtered.map((d) => {
            const slots = [...(d.availability || [])].sort(sortSlots);
            const draft = getDraft(d.id);
            const isSubmitting = !!submitting[d.id];

            return (
              <div key={d.id} className="rounded-xl border p-4">
                {/* Doctor header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold">{fullName(d)}</div>
                    <div className="text-sm text-muted-foreground">
                      {d.additional_info?.title ? `${d.additional_info.title} · ` : ''}
                      {d.additional_info?.speciality || '—'}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="mr-3">{d.email}</span>
                    {d.phone ? <span>· {d.phone}</span> : null}
                  </div>
                </div>

                {/* States */}
                <div className="mt-2 text-xs">
                  <span className="font-medium">States:</span>{' '}
                  {(d.states || []).map(s => s.state_code).join(', ') || '—'}
                </div>

                {/* Availability table */}
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Availability by Day</div>
                  {slots.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No availability yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 border">Day</th>
                            <th className="text-left px-3 py-2 border">Start</th>
                            <th className="text-left px-3 py-2 border">End</th>
                            <th className="text-left px-3 py-2 border">Buffer (min)</th>
                            <th className="text-left px-3 py-2 border">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slots.map((a) => {
                            const key = `${d.id}:${a.availability_id}`;
                            const isDel = !!deleting[key];
                            return (
                              <tr key={a.availability_id} className="border-t">
                                <td className="px-3 py-2 border">{a.day_of_week}</td>
                                <td className="px-3 py-2 border">{a.start_time}</td>
                                <td className="px-3 py-2 border">{a.end_time}</td>
                                <td className="px-3 py-2 border">{a.buffer_time}</td>
                                <td className="px-3 py-2 border">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteAvailability(d.id, a.availability_id)}
                                    disabled={isDel}
                                  >
                                    {isDel ? 'Deleting…' : 'Delete'}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add Availability form (per doctor) */}
                <div className="mt-4 rounded-lg border p-3">
                  <div className="text-sm font-medium mb-3">Add Availability Slot</div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <select
                      className="border rounded px-2 py-2 text-sm"
                      value={draft.day_of_week}
                      onChange={(e) => setDraft(d.id, { day_of_week: e.target.value as Weekday })}
                    >
                      <option value="">Day *</option>
                      {WEEKDAYS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>

                    <div>
                      <label className="block text-xs mb-1">Start *</label>
                      <Input
                        type="time"
                        value={draft.start_hhmm}
                        onChange={(e) => setDraft(d.id, { start_hhmm: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-1">End *</label>
                      <Input
                        type="time"
                        value={draft.end_hhmm}
                        onChange={(e) => setDraft(d.id, { end_hhmm: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-1">Buffer (min)</label>
                      <Input
                        type="number"
                        min={0}
                        value={draft.buffer_time}
                        onChange={(e) => setDraft(d.id, { buffer_time: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button onClick={() => addAvailability(d)} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving…' : 'Add Slot'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Times are saved in <code>HH:MM:SS</code> format.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}