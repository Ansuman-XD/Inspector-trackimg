import { createFileRoute } from "@tanstack/react-router";
import { CatalogManager } from "@/components/rt/CatalogManager";
import { useDB } from "@/hooks/useDB";
import { departmentService } from "@/services/departmentService";

export const Route = createFileRoute("/admin/departments")({
  head: () => ({ meta: [{ title: "Departments — Inspector Tracking System" }, { name: "description", content: "Manage railway departments." }] }),
  component: Departments,
});

function Departments() {
  const db = useDB();
  return (
    <CatalogManager
      title="Departments"
      subtitle={`${db.departments.length} departments · used by employees, visits and reports`}
      items={db.departments}
      usage={(d) => db.employees.filter((e) => e.department === d.name).length}
      usageLabel="Employees"
      save={(input, id) => (id ? departmentService.update(id, input) : departmentService.create(input))}
      remove={(d) => departmentService.remove(d.id)}
      searchPlaceholder="Search departments…"
    />
  );
}
