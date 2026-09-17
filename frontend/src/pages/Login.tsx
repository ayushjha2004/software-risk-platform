import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("email", res.data.email);
      localStorage.setItem("role", res.data.role);
      navigate("/upload");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed");
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-center">Log in</h1>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
          />
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 transition rounded-md py-2 font-medium">
          Log in
        </button>
        <p className="text-sm text-slate-500 text-center">
          No account? <Link to="/register" className="text-indigo-400 hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
