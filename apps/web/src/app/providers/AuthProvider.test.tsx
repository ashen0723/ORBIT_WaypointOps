// @vitest-environment jsdom
import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";
import type { Role } from "@waypoint/contracts";
let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return <p>{auth.user?.role ?? "signed out"}</p>;
}
const KEY = "waypoint.live.session";
const user = {
  id: "USR-DSP",
  email: "dispatcher@waypoint.lk",
  name: "Dispatcher",
  role: "dispatcher",
  outletId: null,
  depotId: null,
  vehicleId: null,
};
function session(role: Role = "dispatcher", seconds = 3600, id = "USR-DSP") {
  const exp = Math.floor(Date.now() / 1000) + seconds;
  return {
    token: `header.${btoa(JSON.stringify({ exp, sub: id }))}.signature`,
    expiresAt: new Date(exp * 1000).toISOString(),
    user: { ...user, id, role },
  };
}
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("localStorage", {getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()});
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function signIn() {
  const s = session();
  fetchMock.mockResolvedValueOnce(response(s));
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await act(async () => {
    expect(await auth.login(" DISPATCHER@WAYPOINT.LK ", "secret")).toBeNull();
  });
  return s;
}
describe("Live JWT session integration", () => {
  it("keeps the real JWT in token and never creates a mock business session", async () => {
    const s = await signIn();
    expect(auth.token).toBe(s.token);
    expect(auth.jwtToken).toBe(s.token);
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual(s);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: user.email,
      password: "secret",
    });
    expect(window.localStorage.getItem("waypoint.server.db")).toBeNull();
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("waypoint.auth.mockToken")).toBeNull();
    expect(sessionStorage.getItem(KEY)).not.toContain("secret");
  });
  it.each(["dispatcher", "loader", "driver", "store_manager"] as Role[])(
    "preserves role %s and actual account identity",
    async (role) => {
      fetchMock.mockResolvedValueOnce(
        response(session(role, 3600, "actual-user")),
      );
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
      await act(async () => {
        await auth.login(user.email, "secret");
      });
      expect(auth.user?.id).toBe("actual-user");
      expect(auth.user?.role).toBe(role);
    },
  );
  it("returns credential errors without creating a session", async () => {
    fetchMock.mockResolvedValue(
      response({ message: "Invalid email or password." }, 401),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      expect(await auth.login(user.email, "wrong")).toBe(
        "Invalid email or password.",
      );
    });
    expect(auth.user).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
  it("returns network errors separately", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      expect(await auth.login(user.email, "secret")).toContain("connection");
    });
    expect(auth.user).toBeNull();
  });
  it("checks /me before mounting protected content and refreshes the stored role", async () => {
    const s = session();
    sessionStorage.setItem(KEY, JSON.stringify(s));
    fetchMock.mockResolvedValue(
      response({ ...s.user, role: "loader", depotId: "D" }),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.queryByText("dispatcher")).toBeNull();
    await screen.findByText("loader");
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe(
      "Bearer " + s.token,
    );
    expect(auth.user?.depotId).toBe("D");
  });
  it("restores safely under StrictMode effect replay", async () => {
    const s = session();
    sessionStorage.setItem(KEY, JSON.stringify(s));
    fetchMock.mockImplementation(async () => response(s.user));
    render(
      <StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </StrictMode>,
    );
    await screen.findByText("dispatcher");
    expect(auth.token).toBe(s.token);
  });
  it("clears a revoked restored session", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(session()));
    fetchMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("signed out");
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
  it("retains credentials and retries restoration after a network failure", async () => {
    const s = session();
    sessionStorage.setItem(KEY, JSON.stringify(s));
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByRole("alert");
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
    fetchMock.mockResolvedValueOnce(response(s.user));
    fireEvent.click(screen.getByText("Retry"));
    await screen.findByText("dispatcher");
  });
  it("lets an unexpired Driver restore offline capture, then refreshes identity online", async () => {
    const s = session("driver");
    sessionStorage.setItem(KEY, JSON.stringify(s));
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("driver");
    expect(screen.getByRole("status").textContent).toContain("Offline");
    fetchMock.mockResolvedValueOnce(response(s.user));
    act(() => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });
  it("does not use offline cached identity for an expired Driver token", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(session("driver", -1)));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("signed out");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not revive a pending login after logout", async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((r) => (resolve = r)),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    let pending!: Promise<string | null>;
    act(() => {
      pending = auth.login(user.email, "secret");
    });
    await act(async () => auth.logout());
    await act(async () => {
      resolve(response(session()));
      await pending;
    });
    expect(auth.user).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
  it("does not let an old 401 terminate a newer account session", async () => {
    await signIn();
    let resolve!: (r: Response) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((r) => (resolve = r)),
    );
    const pending = auth.request("/health").catch((e) => e);
    const next = session("loader", 3600, "other-user");
    fetchMock.mockResolvedValueOnce(response(next));
    await act(async () => {
      await auth.logout();
      await auth.login("loader@waypoint.lk", "secret");
    });
    await act(async () => {
      resolve(new Response("Unauthorized", { status: 401 }));
      await pending;
    });
    expect(auth.token).toBe(next.token);
  });
  it("expires on a current request 401", async () => {
    const s = await signIn();
    fetchMock.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );
    await act(async () => {
      await expect(auth.request("/auth/me")).rejects.toMatchObject({
        status: 401,
      });
    });
    expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBe(
      "Bearer " + s.token,
    );
    expect(auth.user).toBeNull();
  });
  it("expires a session when its clock deadline is reached", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(response(session("dispatcher", 2)));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      await auth.login(user.email, "secret");
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(auth.user).toBeNull();
  });
  it("rejects malformed stored sessions and removes old mock credentials", async () => {
    sessionStorage.setItem(KEY, '{"token":"invalid"}');
    sessionStorage.setItem("waypoint.session", "mock");
    sessionStorage.setItem("waypoint.auth.mockToken", "mock");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("signed out");
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(sessionStorage.getItem("waypoint.session")).toBeNull();
    expect(sessionStorage.getItem("waypoint.auth.mockToken")).toBeNull();
  });
});
