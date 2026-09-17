import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "../src/components/EmptyState";

describe("EmptyState", () => {
  it("renders the provided title and description", () => {
    render(
      <EmptyState title="No projects analyzed yet." description="Add a project to get started." />
    );

    expect(screen.getByText("No projects analyzed yet.")).toBeInTheDocument();
    expect(screen.getByText("Add a project to get started.")).toBeInTheDocument();
  });
});
