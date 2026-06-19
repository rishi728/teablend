"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const links = [
  { href: "/", label: "📊 Dashboard" },
  { grp: "Recipes" },
  { href: "/blends/standard", label: "🫖 Standard blends" },
  { href: "/blends/customer", label: "👥 Customer blends" },
  { href: "/teas", label: "🌿 Tea types" },
  { grp: "Operations" },
  { href: "/customers", label: "📇 Customers" },
  { href: "/logs", label: "📋 Recipe logs" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <nav className="side">
      <div className="brand">🍃 Assam Tea Co<small>BLEND ERP</small></div>
      <div className="nav">
        {links.map((l, i) =>
          "grp" in l ? (
            <div className="grp" key={i}>{l.grp}</div>
          ) : (
            <Link key={i} href={l.href!} className={path === l.href ? "on" : ""}>
              {l.label}
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
