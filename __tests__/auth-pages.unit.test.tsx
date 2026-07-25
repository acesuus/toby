/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock supabase client with controllable mock functions
const mockSignIn = vi.fn().mockResolvedValue({ error: null });
const mockSignUp = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: any[]) => mockSignIn(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
    },
  }),
}));

// Import after mocks
import LoginPage from "@/app/login/page";
import SignUpPage from "@/app/signup/page";

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an email input, password input, and submit button", () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");

    const submitButton = screen.getByRole("button", { name: /sign in/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
  });
});

describe("Sign-up page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email, display name, password fields and submit button", () => {
    render(<SignUpPage />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");

    const displayNameInput = screen.getByLabelText(/display name/i);
    expect(displayNameInput).toBeInTheDocument();
    expect(displayNameInput).toHaveAttribute("type", "text");

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");

    const submitButton = screen.getByRole("button", { name: /create account/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
  });
});

describe("Error messages with aria-describedby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("login form inputs have aria-describedby pointing to the error element when error is shown", async () => {
    // Make the sign-in return an error
    mockSignIn.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });

    const { fireEvent, waitFor } = await import("@testing-library/react");

    render(<LoginPage />);

    // Fill in the form and submit to trigger error state
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrong-password" } });
    fireEvent.click(submitButton);

    // Wait for error to appear
    const errorElement = await screen.findByRole("alert");
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveAttribute("id", "form-error");

    // Verify inputs reference the error via aria-describedby
    const emailAfterError = screen.getByLabelText(/email/i);
    const passwordAfterError = screen.getByLabelText(/password/i);
    expect(emailAfterError).toHaveAttribute("aria-describedby", "form-error");
    expect(passwordAfterError).toHaveAttribute("aria-describedby", "form-error");
  });

  it("signup form inputs have aria-describedby pointing to the error element when error is shown", () => {
    render(<SignUpPage />);

    // Trigger the client-side validation error (password < 8 chars)
    const { fireEvent } = require("@testing-library/react");
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const displayNameInput = screen.getByLabelText(/display name/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(displayNameInput, { target: { value: "Test User" } });
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.click(submitButton);

    // The password validation error should appear synchronously
    const errorElement = screen.getByRole("alert");
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveAttribute("id", "form-error");

    // Verify email and password reference the error via aria-describedby
    const emailAfterError = screen.getByLabelText(/email/i);
    const passwordAfterError = screen.getByLabelText(/password/i);
    expect(emailAfterError).toHaveAttribute("aria-describedby", "form-error");
    expect(passwordAfterError).toHaveAttribute("aria-describedby", "form-error");
  });
});
