export const metadata = {
  title: "Mapa Offshore Brasil | Timeline do Petróleo",
};

export default function MapaPlataformasPage() {
  return (
    <iframe
      src="/world-oil-map/index.html"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
      title="Mapa de Plataformas Offshore"
    />
  );
}
