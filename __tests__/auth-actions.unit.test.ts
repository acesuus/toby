import { describe, it, expect, vi, beforeEach } from "vitest";
import { validatePassword } from "@/lib/auth-actions";

// Mock the server-only modules so we can test signUp/signIn logic
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe("validatePassword", () => {
  it("returns valid for passwords with exactly 8 characters", () => {
    const result = validatePassword("12345678");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid for passwords longer than 8 characters", () => {
    const result = validatePassword("a-very-long-password-indeed");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns invalid for passwords with 7 characters", () => {
    const result = validatePassword("1234567");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Password must be at least 8 characters.");
  });

  it("returns invalid for empty string", () => {
    const result = validatePassword("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Password must be at least 8 characters.");
  });

  it("returns invalid for single character", () => {
    const result = validatePassword("x");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Password must be at least 8 characters.");
  });
});

describe("signUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when email is missing", async () => {
    const { signUp } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "");
    formData.set("password", "validpass123");

    const result = await signUp(formData);
    expect(result.error).toBe("Email and password are required.");
  });

  it("returns error when password is missing", async () => {
    const { signUp } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "");

    const result = await signUp(formData);
    expect(result.error).toBe("Email and password are required.");
  });

  it("returns error when password is too short", async () => {
    const { signUp } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "short");
    formData.set("displayName", "Test User");

    const result = await signUp(formData);
    expect(result.error).toBe("Password must be at least 8 characters.");
  });

  it("returns null error on successful signup", async () => {
    const { createServerSupabaseClient } = await import(
      "@/lib/supabase/server"
    );
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const { signUp } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "validpass123");
    formData.set("displayName", "Test User");

    const result = await signUp(formData);
    expect(result.error).toBeNull();
  });

  it("returns Supabase error message on signup failure", async () => {
    const { createServerSupabaseClient } = await import(
      "@/lib/supabase/server"
    );
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        signUp: vi
          .fn()
          .mockResolvedValue({ error: { message: "Email already registered" } }),
      },
    } as any);

    const { signUp } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "existing@example.com");
    formData.set("password", "validpass123");
    formData.set("displayName", "Test User");

    const result = await signUp(formData);
    expect(result.error).toBe("Email already registered");
  });
});

describe("signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when email is missing", async () => {
    const { signIn } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "");
    formData.set("password", "validpass123");

    const result = await signIn(formData);
    expect(result.error).toBe("Email and password are required.");
  });

  it("returns error when password is missing", async () => {
    const { signIn } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "");

    const result = await signIn(formData);
    expect(result.error).toBe("Email and password are required.");
  });

  it("returns generic error for invalid credentials regardless of Supabase error", async () => {
    const { createServerSupabaseClient } = await import(
      "@/lib/supabase/server"
    );
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ error: { message: "Invalid login credentials" } }),
      },
    } as any);

    const { signIn } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "wrong@example.com");
    formData.set("password", "wrongpass123");

    const result = await signIn(formData);
    expect(result.error).toBe("Invalid email or password.");
  });

  it("returns generic error even for email-not-confirmed errors", async () => {
    const { createServerSupabaseClient } = await import(
      "@/lib/supabase/server"
    );
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ error: { message: "Email not confirmed" } }),
      },
    } as any);

    const { signIn } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "validpass123");

    const result = await signIn(formData);
    expect(result.error).toBe("Invalid email or password.");
  });

  it("returns null error on successful sign in", async () => {
    const { createServerSupabaseClient } = await import(
      "@/lib/supabase/server"
    );
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const { signIn } = await import("@/lib/auth-actions");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "validpass123");

    const result = await signIn(formData);
    expect(result.error).toBeNull();
  });
});

describe("signOut", () => {
  it("calls supabase signOut and redirects to home", async () => {
    const { createServerSupabaseClient } = await import(
      "@/lib/supabase/server"
    );
    const { redirect } = await import("next/navigation");

    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { signOut: mockSignOut },
    } as any);

    const { signOut } = await import("@/lib/auth-actions");
    await signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
