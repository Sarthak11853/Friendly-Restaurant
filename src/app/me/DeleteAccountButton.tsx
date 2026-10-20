"use client";

import { useTransition } from "react";
import { deleteAccount } from "./actions";

export default function DeleteAccountButton() {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Delete your account? Your reviews and friends will be permanently removed.")) start(() => deleteAccount());
      }}
      className="text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete account"}
    </button>
  );
}
