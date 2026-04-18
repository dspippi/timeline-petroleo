import { listEvents } from "@/lib/adminEvents";
import { EventForm } from "../../EventForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  const events = listEvents();
  const existingCountries = Array.from(new Set(events.map((e) => e.country))).sort();
  const existingCompanies = Array.from(
    new Set(events.map((e) => e.company).filter(Boolean) as string[])
  ).sort();

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/admin" className="hover:text-gray-700">Eventos</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Novo Evento</span>
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Novo Evento</h1>
      <EventForm
        mode="create"
        existingCountries={existingCountries}
        existingCompanies={existingCompanies}
      />
    </div>
  );
}
