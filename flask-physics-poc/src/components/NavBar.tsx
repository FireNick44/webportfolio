import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Flasks" },
  { to: "/me", label: "Me" },
  { to: "/settings", label: "Settings" },
] as const;

export default function NavBar() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        gap: 0,
        backgroundColor: "rgba(16,15,15,0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            padding: "12px 20px",
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            textDecoration: "none",
            color: isActive ? "#fff" : "rgba(255,255,255,0.35)",
            borderBottom: isActive ? "2px solid #fff" : "2px solid transparent",
            transition: "color 0.15s, border-color 0.15s",
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
