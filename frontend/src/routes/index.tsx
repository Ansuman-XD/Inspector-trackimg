import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inspector Tracking System — Field Visit Management System" },
      { name: "description", content: "Employee location visit and task monitoring for railway field operations." },
      { property: "og:title", content: "Inspector Tracking System — Field Visit Management System" },
      { property: "og:description", content: "Assign field visits, verify GPS presence and photo evidence, and monitor completion in real time." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    const s = authService.current();
    navigate({ to: s ? authService.homeFor(s.role) : "/login", replace: true });
  }, [navigate]);
  return <div className="min-h-screen bg-background" />;
}
