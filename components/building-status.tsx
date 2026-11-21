import LoadingState from "@/components/ui/loading-state";

export default function BuildingStatus() {
  return (
    <div className="mb-3 font-mono">
      <LoadingState label="You have been here for" variant="Orbit" size="large" />
    </div>
  );
}
