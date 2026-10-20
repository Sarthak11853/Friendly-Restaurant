import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mt-8 space-y-3 text-center">
      <p className="text-lg font-semibold">Not found.</p>
      <Link href="/" className="btn-primary">
        Go home
      </Link>
    </div>
  );
}
