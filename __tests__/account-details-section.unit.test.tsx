/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountDetailsSection } from "@/components/account/AccountDetailsSection";
import type { AuthUser } from "@/lib/auth-context";

describe("AccountDetailsSection", () => {
  it("displays loading skeleton when user is null", () => {
    const { container } = render(<AccountDetailsSection user={null} />);

    expect(screen.getByText("Account Details")).toBeInTheDocument();

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(2);
  });

  it("displays user email when user is provided", () => {
    const user: AuthUser = {
      id: "user-1",
      email: "alice@example.com",
      displayName: null,
      avatarUrl: null,
    };

    render(<AccountDetailsSection user={user} />);

    expect(screen.getByText("Account Details")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("displays display name when provided", () => {
    const user: AuthUser = {
      id: "user-2",
      email: "bob@example.com",
      displayName: "Bob Chess",
      avatarUrl: null,
    };

    render(<AccountDetailsSection user={user} />);

    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob Chess")).toBeInTheDocument();
  });

  it("does not render display name paragraph when displayName is null", () => {
    const user: AuthUser = {
      id: "user-3",
      email: "carol@example.com",
      displayName: null,
      avatarUrl: null,
    };

    const { container } = render(<AccountDetailsSection user={user} />);

    expect(screen.getByText("carol@example.com")).toBeInTheDocument();

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(1);
  });
});
