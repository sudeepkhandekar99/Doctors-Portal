// [src/]app/admin/doctors/page.tsx
'use client';

import * as React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogCancel, AlertDialogAction, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const BASE = 'https://dev.clinibooth.com';
const API = `${BASE}/admin/doctors`;
const AUTH_KEY = '__clinibooth_tokens__';

type Gender = 'M' | 'F' | 'X';

type DoctorOut = {
  id: number;
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  gender?: Gender | null;
  dob?: string | null; // "YYYY-MM-DD"
  additional_info?: {
    id: number;
    doctor_id: number;
    profile_photo?: string | null;
    title: string;
    speciality: string;
    work_experience: number;
    npi_number?: string | null;
    qualification?: string | null;
  } | null;
  states: { id: number; doctor_id: number; state_code: string }[];
};

type DoctorCreatePayload = {
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  gender?: Gender | null;
  dob?: string | null;      // "YYYY-MM-DD"
  password: string;
  additional_info?: {
    profile_photo?: string | null;
    title: string;
    speciality: string;
    work_experience: number;
    npi_number?: string | null;
    qualification?: string | null;
  };
  states?: { state_code: string }[];
};

type DoctorUpdatePayload = Partial<Omit<DoctorCreatePayload, 'password'>> & {
  states?: { state_code: string }[];
};

function authHeaders() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return {};
    const tok = JSON.parse(raw) as { access_token?: string; token_type?: string };
    if (!tok?.access_token) return {};
    return {
      Authorization: `${tok.token_type || 'Bearer'} ${tok.access_token}`,
    };
  } catch {
    return {};
  }
}

function parseStatesCSV(csv: string): { state_code: string }[] | undefined {
  const items = csv
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  if (items.length === 0) return undefined;
  return Array.from(new Set(items)).map(code => ({ state_code: code }));
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = React.useState<DoctorOut[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    gender: 'M' as Gender,
    dob: '',
    password: 'password',
    // optional extras:
    statesCSV: '',
    title: '',
    speciality: '',
    work_experience: '', // keep as string in UI; cast before send
    npi_number: '',
    qualification: '',
    profile_photo: '',
  });

  // Edit dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DoctorOut | null>(null);
  const [editForm, setEditForm] = React.useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    gender: 'M' as Gender,
    dob: '',
    statesCSV: '',
    title: '',
    speciality: '',
    work_experience: '',
    npi_number: '',
    qualification: '',
    profile_photo: '',
  });

  // Delete dialog
  const [doctorToDelete, setDoctorToDelete] = React.useState<DoctorOut | null>(null);

  async function fetchDoctors() {
    setLoading(true);
    try {
      const res = await fetch(`${API}?limit=200`, {
        headers: {
          accept: 'application/json',
          ...authHeaders(),
        },
      });
      if (!res.ok) throw new Error(`List failed ${res.status}`);
      const data = (await res.json()) as DoctorOut[];
      setDoctors(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      alert((e as Error).message || 'Failed to load doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void fetchDoctors();
  }, []);

  function buildCreatePayload(): DoctorCreatePayload {
    const states = parseStatesCSV(createForm.statesCSV);
    const hasAI =
      createForm.title.trim() &&
      createForm.speciality.trim() &&
      createForm.work_experience.trim();

    const payload: DoctorCreatePayload = {
      email: createForm.email.trim(),
      phone: createForm.phone.trim() || undefined,
      first_name: createForm.first_name.trim() || undefined,
      last_name: createForm.last_name.trim() || undefined,
      gender: (createForm.gender as Gender) || undefined,
      dob: createForm.dob || undefined,
      password: createForm.password || 'root',
      ...(states ? { states } : {}),
    };

    if (hasAI) {
      payload.additional_info = {
        title: createForm.title.trim(),
        speciality: createForm.speciality.trim(),
        work_experience: Number(createForm.work_experience),
        npi_number: createForm.npi_number.trim() || undefined,
        qualification: createForm.qualification.trim() || undefined,
        profile_photo: createForm.profile_photo.trim() || undefined,
      };
    }

    return payload;
  }

  async function handleCreate() {
    try {
      const body = buildCreatePayload();
      // Basic client check:
      if (!body.email) {
        alert('Email is required');
        return;
      }
      if (body.additional_info && Number.isNaN(body.additional_info.work_experience)) {
        alert('Work experience must be a number');
        return;
      }

      const res = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Create failed (${res.status})`);
      }

      setCreateOpen(false);
      // reset
      setCreateForm({
        email: '',
        phone: '',
        first_name: '',
        last_name: '',
        gender: 'M',
        dob: '',
        password: 'root',
        statesCSV: '',
        title: '',
        speciality: '',
        work_experience: '',
        npi_number: '',
        qualification: '',
        profile_photo: '',
      });
      await fetchDoctors();
    } catch (e: unknown) {
      alert((e as Error).message || 'Failed to create doctor');
    }
  }

  function openEdit(d: DoctorOut) {
    setEditing(d);
    setEditForm({
      email: d.email || '',
      phone: d.phone || '',
      first_name: d.first_name || '',
      last_name: d.last_name || '',
      gender: (d.gender as Gender) || 'M',
      dob: d.dob || '',
      statesCSV: (d.states || []).map(s => s.state_code).join(','),
      title: d.additional_info?.title || '',
      speciality: d.additional_info?.speciality || '',
      work_experience: d.additional_info?.work_experience != null ? String(d.additional_info.work_experience) : '',
      npi_number: d.additional_info?.npi_number || '',
      qualification: d.additional_info?.qualification || '',
      profile_photo: d.additional_info?.profile_photo || '',
    });
    setEditOpen(true);
  }

  function buildUpdatePayload(): DoctorUpdatePayload {
    const states = parseStatesCSV(editForm.statesCSV);
    const hasAI =
      editForm.title.trim() &&
      editForm.speciality.trim() &&
      editForm.work_experience.trim();

    const payload: DoctorUpdatePayload = {
      email: editForm.email.trim(),
      phone: editForm.phone.trim() || undefined,
      first_name: editForm.first_name.trim() || undefined,
      last_name: editForm.last_name.trim() || undefined,
      gender: (editForm.gender as Gender) || undefined,
      dob: editForm.dob || undefined,
      ...(states ? { states } : {}),
    };

    if (hasAI) {
      payload.additional_info = {
        title: editForm.title.trim(),
        speciality: editForm.speciality.trim(),
        work_experience: Number(editForm.work_experience),
        npi_number: editForm.npi_number.trim() || undefined,
        qualification: editForm.qualification.trim() || undefined,
        profile_photo: editForm.profile_photo.trim() || undefined,
      };
    }

    return payload;
  }

  async function handleUpdate() {
    if (!editing) return;
    try {
      const body = buildUpdatePayload();
      if (body.additional_info && Number.isNaN(body.additional_info.work_experience)) {
        alert('Work experience must be a number');
        return;
      }

      const res = await fetch(`${API}/${editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Update failed (${res.status})`);
      }
      setEditOpen(false);
      setEditing(null);
      await fetchDoctors();
    } catch (e: unknown) {
      alert((e as Error).message || 'Failed to update doctor');
    }
  }

  async function deleteDoctor() {
    if (!doctorToDelete) return;
    try {
      const res = await fetch(`${API}/${doctorToDelete.id}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          ...authHeaders(),
        },
      });
      if (!res.ok && res.status !== 204) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Delete failed (${res.status})`);
      }
      setDoctorToDelete(null);
      await fetchDoctors();
    } catch (e: unknown) {
      alert((e as Error).message || 'Failed to delete doctor');
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doctors</h1>

        {/* CREATE */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Doctor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create New Doctor</DialogTitle>
            </DialogHeader>

            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Email *"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
                <Input placeholder="Phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First Name"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                />
                <Input placeholder="Last Name"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Gender (M/F/X)"
                  value={createForm.gender}
                  onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value as Gender })}
                />
                <Input placeholder="DOB (YYYY-MM-DD)"
                  value={createForm.dob}
                  onChange={(e) => setCreateForm({ ...createForm, dob: e.target.value })}
                />
              </div>

              <Input placeholder="Password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />

              <Input placeholder="States CSV (e.g., VA, MD, DC)"
                value={createForm.statesCSV}
                onChange={(e) => setCreateForm({ ...createForm, statesCSV: e.target.value })}
              />

              {/* Optional Additional Info */}
              <div className="mt-2 border-t pt-2 text-sm font-medium">Additional Info (optional)</div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Title (e.g., MD, NP)"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
                <Input placeholder="Speciality"
                  value={createForm.speciality}
                  onChange={(e) => setCreateForm({ ...createForm, speciality: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Work experience (years)"
                  value={createForm.work_experience}
                  onChange={(e) => setCreateForm({ ...createForm, work_experience: e.target.value })}
                />
                <Input placeholder="NPI number"
                  value={createForm.npi_number}
                  onChange={(e) => setCreateForm({ ...createForm, npi_number: e.target.value })}
                />
              </div>
              <Input placeholder="Qualification"
                value={createForm.qualification}
                onChange={(e) => setCreateForm({ ...createForm, qualification: e.target.value })}
              />
              <Input placeholder="Profile photo URL"
                value={createForm.profile_photo}
                onChange={(e) => setCreateForm({ ...createForm, profile_photo: e.target.value })}
              />

              <Button className="mt-3" onClick={handleCreate}>Save Doctor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-3 py-2">ID</th>
                <th className="border px-3 py-2">Email</th>
                <th className="border px-3 py-2">Phone</th>
                <th className="border px-3 py-2">First</th>
                <th className="border px-3 py-2">Last</th>
                <th className="border px-3 py-2">Gender</th>
                <th className="border px-3 py-2">DOB</th>
                <th className="border px-3 py-2">States</th>
                <th className="border px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.id} className="text-center">
                  <td className="border px-3 py-2">{d.id}</td>
                  <td className="border px-3 py-2">{d.email}</td>
                  <td className="border px-3 py-2">{d.phone || '-'}</td>
                  <td className="border px-3 py-2">{d.first_name || '-'}</td>
                  <td className="border px-3 py-2">{d.last_name || '-'}</td>
                  <td className="border px-3 py-2">{d.gender || '-'}</td>
                  <td className="border px-3 py-2">{d.dob || '-'}</td>
                  <td className="border px-3 py-2">
                    {(d.states || []).map(s => s.state_code).join(', ') || '-'}
                  </td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => openEdit(d)}>Edit</Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDoctorToDelete(d)}
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete {doctorToDelete?.first_name || doctorToDelete?.email}?
                            </AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteDoctor}>
                              Confirm Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Email *"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <Input placeholder="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="First Name"
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              />
              <Input placeholder="Last Name"
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Gender (M/F/X)"
                value={editForm.gender}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as Gender })}
              />
              <Input placeholder="DOB (YYYY-MM-DD)"
                value={editForm.dob}
                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
              />
            </div>

            <Input placeholder="States CSV (e.g., VA, MD, DC)"
              value={editForm.statesCSV}
              onChange={(e) => setEditForm({ ...editForm, statesCSV: e.target.value })}
            />

            {/* Optional Additional Info */}
            <div className="mt-2 border-t pt-2 text-sm font-medium">Additional Info (optional)</div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <Input placeholder="Speciality"
                value={editForm.speciality}
                onChange={(e) => setEditForm({ ...editForm, speciality: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Work experience (years)"
                value={editForm.work_experience}
                onChange={(e) => setEditForm({ ...editForm, work_experience: e.target.value })}
              />
              <Input placeholder="NPI number"
                value={editForm.npi_number}
                onChange={(e) => setEditForm({ ...editForm, npi_number: e.target.value })}
              />
            </div>
            <Input placeholder="Qualification"
              value={editForm.qualification}
              onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
            />
            <Input placeholder="Profile photo URL"
              value={editForm.profile_photo}
              onChange={(e) => setEditForm({ ...editForm, profile_photo: e.target.value })}
            />

            <div className="flex gap-2 justify-end mt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
