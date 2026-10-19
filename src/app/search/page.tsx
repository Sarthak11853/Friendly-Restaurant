import PlaceSearch from "./PlaceSearch";

export default function SearchPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Find a place</h1>
        <p className="text-stone-600">Search for a restaurant to see what your friends think, or to leave your own review.</p>
      </div>
      <PlaceSearch />
    </div>
  );
}
