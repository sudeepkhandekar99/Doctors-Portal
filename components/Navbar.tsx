"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 border-b" style={{ backgroundColor: "#003943" }}>
      <h1 className="text-xl font-semibold text-white">Admin Clinibooth</h1>
      <Button variant="outline" onClick={handleLogout} className="text-black border-white hover:bg-white hover:text-[#003943]">
        Logout
      </Button>
    </nav>
  );
}