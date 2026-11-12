import { createFileRoute } from "@tanstack/react-router";
import { CatalogManager } from "@/components/rt/CatalogManager";
import { useDB } from "@/hooks/useDB";
import { locationTypeService } from "@/services/locationTypeService";

export const Route = createFileRoute("/admin/location-types")({
  head: () => ({ meta: [{ title: "Location Types — Inspector Tracking System" }, { name: "description", content: "Manage visit location types." }] }),
  component: LocationTypes,
});

function LocationTypes() {
  const db = useDB();
  return (
    <CatalogManager
      title="Location Types"
      subtitle={`${db.locationTypes.length} types · used when adding visit locations`}
      items={db.locationTypes}
      usage={(t) => db.locations.filter((l) => l.type === t.name).length}
      usageLabel="Locations"
      save={(input, id) => (id ? locationTypeService.update(id, input) : locationTypeService.create(input))}
      remove={(t) => locationTypeService.remove(t.id)}
      searchPlaceholder="Search location types…"
    />
  );
}
