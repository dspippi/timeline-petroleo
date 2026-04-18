import { listEvents } from "@/lib/adminEvents";
import { EventsTable } from "./EventsTable";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const events = listEvents();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Eventos da Timeline</h1>
          <p className="text-sm text-gray-400 mt-0.5">{events.length} eventos em events.md</p>
        </div>
      </div>
      <EventsTable events={events} />
    </div>
  );
}
