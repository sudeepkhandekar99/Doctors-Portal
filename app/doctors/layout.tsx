// app/doctors/layout.tsx
import { ReactNode } from "react";
import Navbar from "@/components/Navbar";

export default function DoctorsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Navbar />
      <main>{children}</main>
    </div>
  );
}