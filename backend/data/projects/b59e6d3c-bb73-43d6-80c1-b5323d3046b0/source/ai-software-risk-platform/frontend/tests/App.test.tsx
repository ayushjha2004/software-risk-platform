import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import App from "../src/App";

// Prevent real network calls from the health-check hook during this test.
vi.mock("../src/services/api", () => ({
  fetchHealth: vi.fn().mockRejectedValue(new Error("network disabled in test")),
}));

describe("App", () => {
  it("renders the Dashboard route by default with the sidebar navigation", () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Risk Platform")).toBeInTheDocument();
  });
});
