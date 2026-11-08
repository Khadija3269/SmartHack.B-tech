import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/SidebarProfile", () => ({ SidebarProfile: () => null }));

import { api } from "@/lib/api";
import { cache } from "@/lib/store";
import ManageUsers from "./ManageUsers";
import AdminDashboard from "./AdminDashboard";

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const session = (u) => localStorage.setItem("smarthack_session", JSON.stringify(u));
const rowOf = (name) => screen.getByText(name).closest("div.grid");

function seed() {
  cache.categories = [{ id: "c1", name: "Web" }, { id: "c2", name: "AI" }];
  cache.users = [
    { email: "admin@t.com", fullName: "Admin One", role: "admin", status: "Active" },
    { email: "sara@t.com", fullName: "Sara Student", role: "participant", status: "Active" },
    { email: "omar@t.com", fullName: "Omar Judge", role: "judge", status: "Pending",
      organization: "SQU", bio: "Judge bio", experience: "5 hackathons", reason: "Love judging", hasCv: true, cvName: "omar.pdf" },
    { email: "lina@t.com", fullName: "Lina Organizer", role: "organizer", status: "Active", categories: ["Web"] },
  ];
  cache.hackathons = [
    { id: "h1", title: "Alpha Hack", category: "Web", endDate: "2099-12-31" },
    { id: "h2", title: "Beta Hack", category: "AI", endDate: "2099-12-31" },
  ];
  cache.registrations = [{ id: "r1", hackathonId: "h1", participantEmail: "sara@t.com" }];
  cache.submissions = [{ id: "s1", hackathonId: "h1" }];
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  seed();
  session({ email: "admin@t.com", role: "admin", fullName: "Admin One" });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "prompt").mockReturnValue("Not enough experience");
  vi.spyOn(window, "alert").mockImplementation(() => {});
  api.get.mockImplementation(async (path) => {
    if (path === "/api/users") return cache.users;
    if (path === "/api/hackathons") return cache.hackathons;
    if (path === "/api/submissions") return cache.submissions;
    if (path === "/api/categories") return cache.categories;
    return [];
  });
  api.patch.mockResolvedValue({});
  api.del.mockResolvedValue({});
});

describe("Admin: view registered users", () => {
  it("lists every user with name, email, role and status", async () => {
    wrap(<ManageUsers />);
    expect(await screen.findByText("Sara Student")).toBeInTheDocument();
    expect(screen.getByText("sara@t.com")).toBeInTheDocument();
    expect(screen.getByText("Omar Judge")).toBeInTheDocument();
    expect(screen.getByText("Lina Organizer")).toBeInTheDocument();
    expect(screen.getByText("4 users")).toBeInTheDocument();
  });

  it("shows the organizer's assigned categories", async () => {
    wrap(<ManageUsers />);
    await screen.findByText("Lina Organizer");
    expect(within(rowOf("Lina Organizer")).getByText("Web")).toBeInTheDocument();
  });

  it("filters the list by role", async () => {
    wrap(<ManageUsers />);
    await screen.findByText("Sara Student");
    fireEvent.change(screen.getByLabelText("Filter by role:"), { target: { value: "judge" } });
    expect(screen.getByText("Omar Judge")).toBeInTheDocument();
    expect(screen.queryByText("Sara Student")).not.toBeInTheDocument();
    expect(screen.getByText("1 user")).toBeInTheDocument();
  });

  it("shows an empty state when no user matches the filter", async () => {
    wrap(<ManageUsers />);
    await screen.findByText("Sara Student");
    fireEvent.change(screen.getByLabelText("Filter by role:"), { target: { value: "mentor" } });
    expect(screen.getByText("No users to show.")).toBeInTheDocument();
  });
});

describe("Admin: approve / reject registrations", () => {
  it("pending judge shows a Review button with Approve and Reject options", async () => {
    wrap(<ManageUsers />);
    await screen.findByText("Omar Judge");
    fireEvent.click(within(rowOf("Omar Judge")).getByRole("button", { name: "Review" }));
    expect(screen.getByText("Judge bio")).toBeInTheDocument();
    expect(screen.getByText("5 hackathons")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("approving sends the decision and the user becomes Active", async () => {
    api.post.mockImplementation(async (path, body) => {
      expect(path).toBe("/api/users/omar%40t.com/decision");
      expect(body.decision).toBe("approved");
      cache.users = cache.users.map((u) => (u.email === "omar@t.com" ? { ...u, status: "Active" } : u));
      return {};
    });
    wrap(<ManageUsers />);
    await screen.findByText("Omar Judge");
    fireEvent.click(within(rowOf("Omar Judge")).getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(within(rowOf("Omar Judge")).getByText("Active")).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("rejecting sends the reason and the user becomes Rejected", async () => {
    api.post.mockImplementation(async (path, body) => {
      expect(body).toEqual({ decision: "rejected", reason: "Not enough experience" });
      cache.users = cache.users.map((u) => (u.email === "omar@t.com" ? { ...u, status: "Rejected" } : u));
      return {};
    });
    wrap(<ManageUsers />);
    await screen.findByText("Omar Judge");
    fireEvent.click(within(rowOf("Omar Judge")).getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(within(rowOf("Omar Judge")).getByText("Rejected")).toBeInTheDocument());
  });

  it("alerts the admin when the server fails to record the decision", async () => {
    api.post.mockRejectedValue(new Error("Server down"));
    wrap(<ManageUsers />);
    await screen.findByText("Omar Judge");
    fireEvent.click(within(rowOf("Omar Judge")).getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Server down")));
    // the review dialog stays open and the user is still Pending
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(cache.users.find((u) => u.email === "omar@t.com").status).toBe("Pending");
  });

  it("pending users cannot be blocked or activated until reviewed", async () => {
    wrap(<ManageUsers />);
    await screen.findByText("Omar Judge");
    const row = rowOf("Omar Judge");
    expect(within(row).queryByRole("button", { name: "Block" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Activate" })).not.toBeInTheDocument();
  });
});

describe("Admin: manage users (block, activate, delete, categories)", () => {
  it("blocks a user", async () => {
    wrap(<ManageUsers />);
    await screen.findByText("Sara Student");
    fireEvent.click(within(rowOf("Sara Student")).getByRole("button", { name: "Block" }));
    expect(within(rowOf("Sara Student")).getByText("Blocked")).toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledWith("/api/users/sara%40t.com/status", { status: "Blocked" });
  });

  it("re-activates a blocked user", async () => {
    cache.users = cache.users.map((u) => (u.email === "sara@t.com" ? { ...u, status: "Blocked" } : u));
    wrap(<ManageUsers />);
    await screen.findByText("Sara Student");
    fireEvent.click(within(rowOf("Sara Student")).getByRole("button", { name: "Activate" }));
    expect(within(rowOf("Sara Student")).getByText("Active")).toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledWith("/api/users/sara%40t.com/status", { status: "Active" });
  });

  it("deletes a user after confirmation", async () => {
    wrap(<ManageUsers />);
    await screen.findByText("Sara Student");
    fireEvent.click(within(rowOf("Sara Student")).getByRole("button", { name: "Delete" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.queryByText("Sara Student")).not.toBeInTheDocument();
    expect(api.del).toHaveBeenCalledWith("/api/users/sara%40t.com");
  });

  it("does not delete when the confirmation is cancelled", async () => {
    window.confirm.mockReturnValue(false);
    wrap(<ManageUsers />);
    await screen.findByText("Sara Student");
    fireEvent.click(within(rowOf("Sara Student")).getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Sara Student")).toBeInTheDocument();
    expect(api.del).not.toHaveBeenCalled();
  });

  it("changes an organizer's assigned categories", async () => {
    api.put.mockResolvedValue({});
    wrap(<ManageUsers />);
    await screen.findByText("Lina Organizer");
    fireEvent.click(within(rowOf("Lina Organizer")).getByRole("button", { name: "View" }));
    fireEvent.click(screen.getByRole("button", { name: "AI" }));
    fireEvent.click(screen.getByRole("button", { name: "Save categories" }));
    expect(await screen.findByText("Categories saved.")).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith("/api/users/lina%40t.com/categories", { categories: ["Web", "AI"] });
  });
});

describe("Admin: dashboard statistics", () => {
  it("shows hackathon, participant, submission and user totals", async () => {
    wrap(<AdminDashboard />);
    expect(await screen.findByText("Total Hackathons")).toBeInTheDocument();
    const tile = (label) => screen.getByText(label).parentElement;
    await waitFor(() => expect(within(tile("Total Hackathons")).getByText("2")).toBeInTheDocument());
    expect(within(tile("Total Participants")).getByText("1")).toBeInTheDocument();
    expect(within(tile("Submissions")).getByText("1")).toBeInTheDocument();
    expect(within(tile("Total Users")).getByText("4")).toBeInTheDocument();
  });

  it("shows a pending-approval link when staff accounts are waiting", async () => {
    wrap(<AdminDashboard />);
    const link = await screen.findByRole("link", { name: /1 pending approval/i });
    expect(link).toHaveAttribute("href", "/manage-users");
  });

  it("links to the management pages", async () => {
    wrap(<AdminDashboard />);
    await screen.findByText("Total Users");
    expect(screen.getByRole("link", { name: /Manage Users/ })).toHaveAttribute("href", "/manage-users");
    expect(screen.getByRole("link", { name: /Manage Hackathons/ })).toHaveAttribute("href", "/manage-hackathons");
    expect(screen.getByRole("link", { name: /Manage Categories/ })).toHaveAttribute("href", "/manage-categories");
  });
});
