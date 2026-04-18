import { notFound } from "next/navigation";
import { listEvents, oilEventToInput } from "@/lib/adminEvents";
import { EventForm } from "../../EventForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default function EditEventPage({ params }: Props) {
  const id = decodeURIComponent(params.id);
  const events = listEvents();
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const initial = oilEventToInput(event);
  const existingCountries = Array.from(new Set(events.map((e) => e.country))).sort();
  const existingCompanies = Array.from(
    new Set(events.map((e) => e.company).filter(Boolean) as string[])
  ).sort();

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/admin" className="hover:text-gray-700">Eventos</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{event.title}</span>
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Editar Evento</h1>
      <EventForm
        mode="edit"
        initial={initial}
        existingCountries={existingCountries}
        existingCompanies={existingCompanies}
      />
    </div>
  );
}
