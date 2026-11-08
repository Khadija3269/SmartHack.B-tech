import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Keep the page chrome and real network/auth logic out of these tests.
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual("@/lib/auth");
  return { ...actual, login: vi.fn() };
});

import { login } from "@/lib/auth";
import LoginPage from "./Login";

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/participant-dashboard" element={<div>PARTICIPANT DASHBOARD</div>} />
        <Route path="/admin-dashboard" element={<div>ADMIN DASHBOARD</div>} />
        <Route path="/register" element={<div>REGISTER PAGE</div>} />
        <Route path="/recover-password" element={<div>RECOVER PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );

const emailInput = () => screen.getByPlaceholderText("Enter your email");
const passwordInput = () => screen.getByPlaceholderText("Enter your password");
const submitForm = () => fireEvent.submit(emailInput().closest("form"));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Login page", () => {
  it("renders heading, fields and login button", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(emailInput()).toBeInTheDocument();
    expect(passwordInput()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("allows typing email and password", () => {
    renderLogin();
    fireEvent.change(emailInput(), { target: { value: "admin@gmail.com" } });
    fireEvent.change(passwordInput(), { target: { value: "123456" } });
    expect(emailInput()).toHaveValue("admin@gmail.com");
    expect(passwordInput()).toHaveValue("123456");
  });

  it("shows an error when fields are empty and does not call login", async () => {
    renderLogin();
    submitForm();
    expect(await screen.findByText(/Email and password are required/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("shows an error for an invalid email format", async () => {
    renderLogin();
    fireEvent.change(emailInput(), { target: { value: "not-an-email" } });
    fireEvent.change(passwordInput(), { target: { value: "123456" } });
    submitForm();
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("trims and lower-cases the email before logging in", async () => {
    login.mockResolvedValue({ role: "participant" });
    renderLogin();
    fireEvent.change(emailInput(), { target: { value: "  User@Gmail.COM " } });
    fireEvent.change(passwordInput(), { target: { value: "Pass@1234" } });
    submitForm();
    await waitFor(() => expect(login).toHaveBeenCalledWith("user@gmail.com", "Pass@1234"));
  });

  it("redirects a participant to the participant dashboard on success", async () => {
    login.mockResolvedValue({ role: "participant" });
    renderLogin();
    fireEvent.change(emailInput(), { target: { value: "user@gmail.com" } });
    fireEvent.change(passwordInput(), { target: { value: "Pass@1234" } });
    submitForm();
    expect(await screen.findByText("PARTICIPANT DASHBOARD")).toBeInTheDocument();
  });

  it("redirects an admin to the admin dashboard on success", async () => {
    login.mockResolvedValue({ role: "admin" });
    renderLogin();
    fireEvent.change(emailInput(), { target: { value: "admin@gmail.com" } });
    fireEvent.change(passwordInput(), { target: { value: "Admin@1234" } });
    submitForm();
    expect(await screen.findByText("ADMIN DASHBOARD")).toBeInTheDocument();
  });

  it("shows the server error message when login fails", async () => {
    login.mockRejectedValue(new Error("Invalid email or password"));
    renderLogin();
    fireEvent.change(emailInput(), { target: { value: "user@gmail.com" } });
    fireEvent.change(passwordInput(), { target: { value: "wrong" } });
    submitForm();
    expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument();
  });

  it("links to the register and recover-password pages", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /Register now/i })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: /Forget Password/i })).toHaveAttribute("href", "/recover-password");
  });
});
