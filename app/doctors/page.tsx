"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Doctor = {
  id: number;
  email: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  gender: string;
  dob: string;
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
    gender: "M",
    dob: "",
    password: "root",
  });
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);

  const fetchDoctors = async () => {
    setLoading(true);
    const res = await fetch("https://dev.clinibooth.com/doctors/doctors/");
    const data = await res.json();
    setDoctors(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleCreate = async () => {
    const res = await fetch("https://dev.clinibooth.com/doctors/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setOpen(false);
      await fetchDoctors();
      setFormData({
        email: "",
        phone: "",
        first_name: "",
        last_name: "",
        gender: "M",
        dob: "",
        password: "root",
      });
    } else {
      alert("Failed to create doctor");
    }
  };

  const deleteDoctor = async () => {
    if (!doctorToDelete) return;

    const res = await fetch(
      `https://dev.clinibooth.com/doctors/doctors/${doctorToDelete.id}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (res.ok) {
      await fetchDoctors();
      setDoctorToDelete(null);
    } else {
      alert("Failed to delete doctor.");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Doctors List</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create Doctor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Doctor</DialogTitle>
            </DialogHeader>
            <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
              <Input
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <Input
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              <Input
                placeholder="First Name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
              />
              <Input
                placeholder="Last Name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
              />
              <Input
                placeholder="Gender (M/F)"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
              />
              <Input
                placeholder="DOB (YYYY-MM-DD)"
                value={formData.dob}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
              />
              <Button className="w-full mt-4" onClick={handleCreate}>
                Save Doctor
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Phone</th>
              <th className="border px-4 py-2">First Name</th>
              <th className="border px-4 py-2">Last Name</th>
              <th className="border px-4 py-2">Gender</th>
              <th className="border px-4 py-2">DOB</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doc) => (
              <tr key={doc.id} className="text-center">
                <td className="border px-4 py-2">{doc.id}</td>
                <td className="border px-4 py-2">{doc.email}</td>
                <td className="border px-4 py-2">{doc.phone}</td>
                <td className="border px-4 py-2">
                  {doc.first_name || "-"}
                </td>
                <td className="border px-4 py-2">
                  {doc.last_name || "-"}
                </td>
                <td className="border px-4 py-2">{doc.gender}</td>
                <td className="border px-4 py-2">{doc.dob}</td>
                <td className="border px-4 py-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDoctorToDelete(doc)}
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you sure you want to delete{" "}
                          {doctorToDelete?.first_name || "this doctor"}?
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}