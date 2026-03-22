"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">
          Something went wrong
        </h1>
        <p className="mt-2 text-emerald-900/70 dark:text-emerald-200/70">
          An unexpected error occurred. Try refreshing or starting over.
        </p>
        {error.message && (
          <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {error.message}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-lg bg-emerald-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="flex-1 rounded-lg bg-emerald-900/20 px-4 py-2 font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/30 dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
          >
            Home
          </button>
        </div>
      </div>
    </main>
  );
}
