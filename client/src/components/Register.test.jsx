import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual("@/lib/auth");
  return { ...actual, saveUser: vi.fn() };
});

import { saveUser } from "@/lib/auth";
import RegisterPage from "./Register";

const renderRegister = () =>
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );

// Labels in Register.jsx aren't linked to inputs (no htmlFor), so find the
// field that sits next to its label text.
const field = (label, selector = "input") => {
  let el = screen.getByText(label).parentElement;
  while (el && !el.querySelector(selector)) el = el.parentElement;
  return el.querySelector(selector);
};
const nameInput = () => field("Full Name");
const emailInput = () => field("Email Address");
const passwordInput = () => field("Password");
const confirmInput = () => field("Confirm Password");
const roleSelect = () => field("Role", "select");
const submitForm = () => fireEvent.submit(nameInput().closest("form"));

const fillValid = (over = {}) => {
  fireEvent.change(nameInput(), { target: { value: over.name ?? "Khadija" } });
  fireEvent.change(emailInput(), { target: { value: over.email ?? "khadija@gmail.com" } });
  fireEvent.change(passwordInput(), { target: { value: over.password ?? "Pass@1234" } });
  fireEvent.change(confirmInput(), { target: { value: over.confirm ?? "Pass@1234" } });
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.alert = vi.fn();
});

describe("Register page", () => {
  it("renders the form fields and register button", () => {
    renderRegister();
    expect(screen.getByRole("heading", { name: "Registration" })).toBeInTheDocument();
    expect(nameInput()).toBeInTheDocument();
    expect(emailInput()).toBeInTheDocument();
    expect(passwordInput()).toBeInTheDocument();
    expect(confirmInput()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });

  it("allows typing name, email, password and confirm password", () => {
    renderRegister();
    fillValid();
    expect(nameInput()).toHaveValue("Khadija");
    expect(emailInput()).toHaveValue("khadija@gmail.com");
    expect(passwordInput()).toHaveValue("Pass@1234");
    expect(confirmInput()).toHaveValue("Pass@1234");
  });

  it("defaults the role to participant", () => {
    renderRegister();
    expect(roleSelect()).toHaveValue("participant");
  });

  it("requires all mandatory fields", async () => {
    renderRegister();
    submitForm();
    expect(await screen.findByText(/fill in all required fields/i)).toBeInTheDocument();
    expect(saveUser).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    renderRegister();
    fillValid({ email: "bad-email" });
    submitForm();
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(saveUser).not.toHaveBeenCalled();
  });

  it.each([
    ["short1!A", "Short1!", /at least 8 characters/i],
    ["no uppercase", "pass@1234", /uppercase letter/i],
    ["no lowercase", "PASS@1234", /lowercase letter/i],
    ["no number", "Pass@word", /include a number/i],
    ["no symbol", "Pass1234", /include a symbol/i],
  ])("rejects weak password (%s)", async (_label, pw, message) => {
    renderRegister();
    fillValid({ password: pw, confirm: pw });
    submitForm();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(saveUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    renderRegister();
    fillValid({ confirm: "Different@1234" });
    submitForm();
    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(saveUser).not.toHaveBeenCalled();
  });

  it("registers a participant and redirects to login", async () => {
    saveUser.mockResolvedValue({});
    renderRegister();
    fillValid();
    submitForm();
    expect(await screen.findByText("LOGIN PAGE")).toBeInTheDocument();
    expect(saveUser).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Khadija",
        email: "khadija@gmail.com",
        password: "Pass@1234",
        role: "participant",
      })
    );
    expect(window.alert).not.toHaveBeenCalled();
  });

  it("shows the server error when registration fails (e.g. duplicate email)", async () => {
    saveUser.mockRejectedValue(new Error("Email already registered"));
    renderRegister();
    fillValid();
    submitForm();
    expect(await screen.findByText(/Email already registered/i)).toBeInTheDocument();
    expect(screen.queryByText("LOGIN PAGE")).not.toBeInTheDocument();
  });

  it("shows extra fields for professional roles and requires bio/experience/reason", async () => {
    renderRegister();
    fireEvent.change(roleSelect(), { target: { value: "judge" } });
    expect(screen.getByText("Short Bio")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    fillValid();
    submitForm();
    expect(await screen.findByText(/fill in your bio, experience and reason/i)).toBeInTheDocument();
    expect(saveUser).not.toHaveBeenCalled();
  });

  it("requires a CV upload for professional roles", async () => {
    renderRegister();
    fireEvent.change(roleSelect(), { target: { value: "mentor" } });
    fillValid();
    fireEvent.change(field("Short Bio", "textarea"), { target: { value: "bio" } });
    fireEvent.change(field("Experience", "textarea"), { target: { value: "exp" } });
    fireEvent.change(field("Why do you want to join as a mentor?", "textarea"), { target: { value: "why" } });
    submitForm();
    expect(await screen.findByText(/upload your CV/i)).toBeInTheDocument();
    expect(saveUser).not.toHaveBeenCalled();
  });

  it("fills a strong password with the Suggest button", async () => {
    renderRegister();
    fireEvent.click(screen.getByRole("button", { name: "Suggest" }));
    expect(passwordInput().value.length).toBeGreaterThanOrEqual(8);
    expect(confirmInput().value).toBe(passwordInput().value);
  });

  it("links back to the login page", () => {
    renderRegister();
    expect(screen.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login");
  });
});
