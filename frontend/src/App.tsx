import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import Findings from "./pages/Findings";
import Files from "./pages/Files";
import Report from "./pages/Report";

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/upload"
          element={
            <RequireAuth>
              <Upload />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:projectId/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:projectId/findings"
          element={
            <RequireAuth>
              <Findings />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:projectId/files"
          element={
            <RequireAuth>
              <Files />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:projectId/report"
          element={
            <RequireAuth>
              <Report />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </div>
  );
}
