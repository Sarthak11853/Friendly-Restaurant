import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/search", label: "Review", icon: "➕" },
  { href: "/friends", label: "Friends", icon: "👥" },
  { href: "/me", label: "Me", icon: "🙂" },
];

export default function Nav({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <header className="sticky top-0 z-[1000] border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <img src="/icon.svg" alt="" className="h-7 w-7" />
            <span>
              Friendly<span className="text-brand-500">Restaurant</span>
            </span>
          </Link>
          {signedIn ? (
            <nav className="hidden gap-1 sm:flex">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-stone-100">
                  {l.label}
                </Link>
              ))}
            </nav>
          ) : (
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </header>
      {signedIn && (
        <nav className="fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-4 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="flex flex-col items-center py-2 text-xs font-medium text-stone-600">
              <span className="text-lg leading-none">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
