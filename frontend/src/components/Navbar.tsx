import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    navigate("/login");
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-slate-100">
          🛡️ Software Risk Assessment Platform
        </Link>
        {email && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">{email}</span>
            <button onClick={logout} className="text-slate-400 hover:text-red-400 transition">
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
