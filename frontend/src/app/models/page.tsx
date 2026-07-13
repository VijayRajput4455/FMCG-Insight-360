import ModelRegistryManager from "@/components/ModelRegistryManager";

export default function ModelsPage() {
  return (
    <div className="container">
      <header className="hero">
        <h1>Model Registry & Config</h1>
        <p>Register neural weight models, tune confidence filters, and map them to targeted retail audits.</p>
      </header>
      <ModelRegistryManager />
    </div>
  );
}
