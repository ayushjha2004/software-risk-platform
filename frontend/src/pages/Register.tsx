import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("DEVELOPER");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/register", { email, password, role });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("email", res.data.email);
      localStorage.setItem("role", res.data.role);
      navigate("/upload");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Registration failed");
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-center">Create account</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div>
          <label className="text-sm text-slate-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
          >
            <option value="DEVELOPER">Developer</option>
            <option value="ANALYST">Analyst</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 transition rounded-md py-2 font-medium">
          Register
        </button>
        <p className="text-sm text-slate-500 text-center">
          Already have an account? <Link to="/login" className="text-indigo-400 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
