"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mt-8 space-y-3 text-center">
      <p className="text-lg font-semibold">Something went wrong.</p>
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
