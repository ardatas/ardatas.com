import LoadingState from "@/components/ui/loading-state";

export default function BuildingStatus() {
  return (
    <div className="mt-5 border-t border-[var(--notebook-border)] pt-4">
      <LoadingState label="You have been here for" variant="Orbit" size="large" />
    </div>
  );
}
