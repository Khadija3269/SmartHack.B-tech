import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/ShareButtons", () => ({ ShareButtons: () => null }));

import { api } from "@/lib/api";
import { cache, isArchived } from "@/lib/store";
import CreateHackathon from "./CreateHackathon";
import HackathonsPage from "./Hackathons";
import ManageHackathons from "./ManageHackathons";
import ManageCategories from "./ManageCategories";

const FUTURE = "2099-12-31";
const session = (u) => localStorage.setItem("smarthack_session", JSON.stringify(u));
const wrap = (ui, path = "/page") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/page" element={ui} />
        <Route path="/" element={<div>HOME PAGE</div>} />
        <Route path="/hackathon-created" element={<div>HACKATHON CREATED</div>} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );

// Labels in these forms aren't linked to inputs, so find a field from its label text.
const field = (label, selector = "input") => {
  let el = screen.getByText(label).parentElement;
  while (el && !el.querySelector(selector)) el = el.parentElement;
  return el.querySelector(selector);
};
const cardOf = (title) => screen.getByText(title).closest("div.grid");

function seed() {
  cache.categories = [{ id: "c1", name: "Web" }, { id: "c2", name: "AI" }, { id: "c3", name: "Health" }];
  cache.users = [
    { email: "admin@t.com", fullName: "Admin", role: "admin", status: "Active" },
    { email: "org@t.com", fullName: "Org", role: "organizer", status: "Active", categories: ["Web"] },
  ];
  cache.hackathons = [
    { id: "h1", title: "Alpha Hack", theme: "Web apps", category: "Web", startDate: "2099-01-01", endDate: FUTURE, location: "Muscat", description: "Build web apps" },
    { id: "h2", title: "Beta Hack", theme: "Machine learning", category: "AI", startDate: "2099-02-01", endDate: FUTURE, location: "Salalah", description: "Build AI" },
    { id: "h3", title: "Old Hack", theme: "Retro", category: "Web", startDate: "2020-01-01", endDate: "2020-01-03", location: "Sohar", description: "Past event" },
  ];
  cache.registrations = [];
  cache.announcements = [];
  cache.assignments = [];
  cache.mentorAssignments = [];
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  seed();
  session({ email: "admin@t.com", role: "admin", fullName: "Admin" });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  api.get.mockImplementation(async (path) => {
    if (path === "/api/hackathons") return cache.hackathons;
    if (path === "/api/users") return cache.users;
    if (path === "/api/categories") return cache.categories;
    if (path === "/api/announcements") return cache.announcements;
    return [];
  });
  api.post.mockImplementation(async (path, body) => ({ id: "new1", ...body }));
  api.put.mockImplementation(async (path, body) => {
    const id = path.split("/").pop();
    return { ...cache.hackathons.find((h) => h.id === id), ...body };
  });
});

// ───────────────────────── Create a hackathon ─────────────────────────
describe("Create hackathon", () => {
  const fillValid = () => {
    fireEvent.change(field("Hackathon Name"), { target: { value: "Gamma Hack" } });
    fireEvent.change(field("Start Date"), { target: { value: "2099-03-01" } });
    fireEvent.change(field("End Date"), { target: { value: "2099-03-03" } });
    fireEvent.change(field("Description", "textarea"), { target: { value: "A new event" } });
  };
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Create" }));

  it("renders the form with default values", async () => {
    wrap(<CreateHackathon />);
    expect(await screen.findByRole("heading", { name: "Create Hackathon" })).toBeInTheDocument();
    expect(field("Location")).toHaveValue("Sultan Qaboos University");
    expect(field("Duration")).toHaveValue("48 Hours");
    expect(field("Team Size")).toHaveValue("2–5 members");
  });

  it("requires name, dates and description", async () => {
    wrap(<CreateHackathon />);
    await screen.findByRole("heading", { name: "Create Hackathon" });
    submit();
    expect(await screen.findByText(/Name, dates, and description are required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("creates the hackathon and redirects to the confirmation page", async () => {
    wrap(<CreateHackathon />);
    await screen.findByRole("heading", { name: "Create Hackathon" });
    fillValid();
    submit();
    expect(await screen.findByText("HACKATHON CREATED")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      "/api/hackathons",
      expect.objectContaining({
        title: "Gamma Hack",
        startDate: "2099-03-01",
        endDate: "2099-03-03",
        description: "A new event",
        category: expect.any(String),
      })
    );
  });

  it("uses the category as theme when theme is left empty", async () => {
    wrap(<CreateHackathon />);
    await screen.findByRole("heading", { name: "Create Hackathon" });
    fillValid();
    fireEvent.change(field("Category", "select"), { target: { value: "AI" } });
    submit();
    await screen.findByText("HACKATHON CREATED");
    expect(api.post.mock.calls[0][1]).toMatchObject({ category: "AI", theme: "AI" });
  });

  it("sends the submission deadline and only filled timeline milestones", async () => {
    wrap(<CreateHackathon />);
    await screen.findByRole("heading", { name: "Create Hackathon" });
    fillValid();
    fireEvent.change(field("Submission Deadline"), { target: { value: "2099-03-02" } });
    fireEvent.change(screen.getByPlaceholderText(/Milestone/), { target: { value: "Opening Ceremony" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add milestone" })); // second row stays empty
    submit();
    await screen.findByText("HACKATHON CREATED");
    const body = api.post.mock.calls[0][1];
    expect(body.submissionDeadline).toBe("2099-03-02");
    expect(body.timeline).toEqual([{ label: "Opening Ceremony", date: "" }]);
  });

  it("an organizer can only pick their assigned categories", async () => {
    session({ email: "org@t.com", role: "organizer", fullName: "Org", categories: ["Web"] });
    wrap(<CreateHackathon />);
    await screen.findByRole("heading", { name: "Create Hackathon" });
    const options = within(field("Category", "select")).getAllByRole("option").map((o) => o.value);
    expect(options).toEqual(["Web"]);
  });

  it("an organizer with no category cannot create a hackathon", async () => {
    cache.users[1].categories = [];
    session({ email: "org@t.com", role: "organizer", fullName: "Org", categories: [] });
    wrap(<CreateHackathon />);
    await screen.findByRole("heading", { name: "Create Hackathon" });
    expect(screen.getByText(/Ask an admin to assign you a category first/i)).toBeInTheDocument();
    fillValid();
    submit();
    expect(await screen.findByText(/only create hackathons in your assigned categories/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

// ───────────────────────── Display available hackathons ─────────────────────────
describe("Available hackathons list", () => {
  it("shows active hackathons and hides ended ones", () => {
    wrap(<HackathonsPage />);
    expect(screen.getByText("Alpha Hack")).toBeInTheDocument();
    expect(screen.getByText("Beta Hack")).toBeInTheDocument();
    expect(screen.queryByText("Old Hack")).not.toBeInTheDocument();
    expect(screen.getByText("2 hackathons")).toBeInTheDocument();
  });

  it("shows each hackathon's category, theme, dates and a details link", () => {
    wrap(<HackathonsPage />);
    const card = screen.getByText("Alpha Hack").closest("div.flex");
    expect(within(card).getByText("Web")).toBeInTheDocument();
    expect(within(card).getByText(/Theme: Web apps/)).toBeInTheDocument();
    expect(within(card).getByText(/2099-01-01/)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "View Details" })).toHaveAttribute("href", "/hackathon-details/h1");
  });

  it("filters by category", () => {
    wrap(<HackathonsPage />);
    fireEvent.change(screen.getByLabelText("Category:"), { target: { value: "AI" } });
    expect(screen.getByText("Beta Hack")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Hack")).not.toBeInTheDocument();
  });

  it("searches by title, theme or location", () => {
    wrap(<HackathonsPage />);
    const box = screen.getByPlaceholderText(/Search by title/);
    fireEvent.change(box, { target: { value: "machine learning" } });
    expect(screen.getByText("Beta Hack")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Hack")).not.toBeInTheDocument();
    fireEvent.change(box, { target: { value: "muscat" } });
    expect(screen.getByText("Alpha Hack")).toBeInTheDocument();
  });

  it("shows a message when nothing matches", () => {
    wrap(<HackathonsPage />);
    fireEvent.change(screen.getByPlaceholderText(/Search by title/), { target: { value: "zzzz" } });
    expect(screen.getByText("No hackathons match your filters.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no hackathons", () => {
    cache.hackathons = [];
    wrap(<HackathonsPage />);
    expect(screen.getByText("No hackathons yet.")).toBeInTheDocument();
  });
});

// ───────────────────────── Registration / end-date rules ─────────────────────────
describe("Deadline validation (isArchived)", () => {
  it("a hackathon whose end date has passed counts as ended/archived", () => {
    expect(isArchived({ endDate: "2020-01-01" })).toBe(true);
  });
  it("a hackathon ending in the future is still open", () => {
    expect(isArchived({ endDate: FUTURE })).toBe(false);
  });
  it("a manually archived hackathon is closed even if it ends in the future", () => {
    expect(isArchived({ endDate: FUTURE, archived: true })).toBe(true);
  });
  it("handles missing data safely", () => {
    expect(isArchived(undefined)).toBe(false);
    expect(isArchived({})).toBe(false);
  });
});

// ───────────────────────── Edit / archive / delete ─────────────────────────
describe("Manage hackathons", () => {
  it("lists active hackathons with counts on the Active / Archived tabs", async () => {
    wrap(<ManageHackathons />);
    expect(await screen.findByText("Alpha Hack")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Active \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Archived \(1\)/ })).toBeInTheDocument();
    expect(screen.queryByText("Old Hack")).not.toBeInTheDocument();
  });

  it("shows ended hackathons on the Archived tab as 'Ended'", async () => {
    wrap(<ManageHackathons />);
    await screen.findByText("Alpha Hack");
    fireEvent.click(screen.getByRole("button", { name: /^Archived/ }));
    const card = (await screen.findByText("Old Hack")).closest("div.grid");
    expect(within(card).getByText("Ended")).toBeInTheDocument();
  });

  it("filters the list by category", async () => {
    wrap(<ManageHackathons />);
    await screen.findByText("Alpha Hack");
    fireEvent.change(screen.getByLabelText("Category:"), { target: { value: "AI" } });
    expect(screen.getByText("Beta Hack")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Hack")).not.toBeInTheDocument();
  });

  it("edits a hackathon's title and saves it", async () => {
    wrap(<ManageHackathons />);
    await screen.findByText("Alpha Hack");
    fireEvent.click(within(cardOf("Alpha Hack")).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "Alpha Hack 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Hackathon updated.")).toBeInTheDocument();
    expect(screen.getByText("Alpha Hack 2")).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith("/api/hackathons/h1", expect.objectContaining({ title: "Alpha Hack 2" }));
  });

  it("edits dates and the submission deadline", async () => {
    wrap(<ManageHackathons />);
    await screen.findByText("Alpha Hack");
    fireEvent.click(within(cardOf("Alpha Hack")).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Submission deadline"), { target: { value: "2099-12-30" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2099-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Hackathon updated.");
    expect(api.put.mock.calls[0][1]).toMatchObject({ submissionDeadline: "2099-12-30", endDate: "2099-12-31" });
  });

  it("cancelling an edit changes nothing", async () => {
    wrap(<ManageHackathons />);
    await screen.findByText("Alpha Hack");
    fireEvent.click(within(cardOf("Alpha Hack")).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Alpha Hack")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("archives a hackathon after confirmation and can restore it", async () => {
    wrap(<ManageHackathons />);
    await screen.findByText("Alpha Hack");
    fireEvent.click(within(cardOf("Alpha Hack")).getByRole("button", { name: "Archive" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(await screen.findByText("Hackathon archived.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Alpha Hack")).not.toBeInTheDocument());
    expect(api.put).toHaveBeenCalledWith("/api/hackathons/h1", { archived: true });

    fireEvent.click(screen.getByRole("button", { name: /^Archived/ }));
    const archived = (await screen.findByText("Alpha Hack")).closest("div.grid");
    fireEvent.click(within(archived).getByRole("button", { name: "Restore" }));
    expect(await screen.findByText("Hackathon restored.")).toBeInTheDocument();
    expect(api.put).toHaveBeenLastCalledWith("/api/hackathons/h1", { archived: false });
  });

  it("does not archive when the confirmation is cancelled", async () => {
    window.confirm.mockReturnValue(false);
    wrap(<ManageHackathons />);
    await screen.findByText("Alpha Hack");
    fireEvent.click(within(cardOf("Alpha Hack")).getByRole("button", { name: "Archive" }));
    expect(api.put).not.toHaveBeenCalled();
    expect(screen.getByText("Alpha Hack")).toBeInTheDocument();
  });

  it("an organizer only sees hackathons in their own categories", async () => {
    session({ email: "org@t.com", role: "organizer", fullName: "Org", categories: ["Web"] });
    wrap(<ManageHackathons />);
    expect(await screen.findByText("Alpha Hack")).toBeInTheDocument();
    expect(screen.queryByText("Beta Hack")).not.toBeInTheDocument();
  });

  it("redirects visitors who are not logged in to the login page", async () => {
    localStorage.clear();
    wrap(<ManageHackathons />);
    expect(await screen.findByText("LOGIN PAGE")).toBeInTheDocument();
  });
});

// ───────────────────────── Manage categories ─────────────────────────
describe("Manage categories", () => {
  it("lists the categories with how many hackathons use them", async () => {
    wrap(<ManageCategories />);
    expect(await screen.findByText("Web")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(within(screen.getByText("Web").closest("div.flex-wrap")).getByText(/1 active · 1 archived/)).toBeInTheDocument();
  });

  it("adds a new category", async () => {
    api.post.mockResolvedValue({ id: "c9", name: "Blockchain" });
    wrap(<ManageCategories />);
    await screen.findByText("Web");
    fireEvent.change(screen.getByLabelText("New category name"), { target: { value: "Blockchain" } });
    fireEvent.click(screen.getByRole("button", { name: /Add category/ }));
    expect(await screen.findByText(/Added .Blockchain./)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/api/categories", expect.objectContaining({ name: "Blockchain" }));
  });

  it("keeps Add disabled until a name is typed", async () => {
    wrap(<ManageCategories />);
    await screen.findByText("Web");
    expect(screen.getByRole("button", { name: /Add category/ })).toBeDisabled();
  });

  it("renames a category", async () => {
    api.put.mockResolvedValue({ id: "c3", name: "Healthcare" });
    wrap(<ManageCategories />);
    await screen.findByText("Health");
    const card = screen.getByText("Health").closest("div.flex-wrap");
    fireEvent.click(within(card).getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("Rename Health"), { target: { value: "Healthcare" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Renamed .Health. to .Healthcare./)).toBeInTheDocument();
  });

  it("blocks deleting a category that hackathons use, but allows an unused one", async () => {
    api.del.mockResolvedValue({});
    wrap(<ManageCategories />);
    await screen.findByText("Web");
    const used = screen.getByText("Web").closest("div.flex-wrap");
    expect(within(used).getByRole("button", { name: "Delete" })).toBeDisabled();
    const unused = screen.getByText("Health").closest("div.flex-wrap");
    expect(within(unused).getByRole("button", { name: "Delete" })).toBeEnabled();
    fireEvent.click(within(unused).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText(/Deleted .Health./)).toBeInTheDocument();
  });

  it("sends non-admins away", async () => {
    session({ email: "org@t.com", role: "organizer", fullName: "Org", categories: ["Web"] });
    wrap(<ManageCategories />);
    expect(await screen.findByText("HOME PAGE")).toBeInTheDocument();
    expect(screen.queryByText("Manage Categories")).not.toBeInTheDocument();
  });
});
