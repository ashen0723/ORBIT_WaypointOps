// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { apiFetch } from "./client";
afterEach(() => vi.unstubAllGlobals());
it("keeps multipart boundaries browser-generated while attaching the real token", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  const form = new FormData();
  form.set("file", new Blob(["proof"]), "proof.png");
  await apiFetch("/evidence", {
    method: "POST",
    body: form,
    token: "real-jwt",
  });
  const init = fetch.mock.calls[0][1];
  expect(init.headers.has("Content-Type")).toBe(false);
  expect(init.headers.get("Authorization")).toBe("Bearer real-jwt");
  expect(init.body).toBe(form);
});
it("preserves non-JSON HTTP status for session expiry and readable JSON errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          '{"code":"BLOCKED","message":["first","second"],"details":[{"message":"capacity"}]}',
          { status: 422 },
        ),
      ),
  );
  await expect(apiFetch("/auth/me")).rejects.toMatchObject({
    status: 401,
    code: "HTTP_ERROR",
  });
  await expect(apiFetch("/planning/allocate")).rejects.toMatchObject({
    status: 422,
    code: "BLOCKED",
    message: "first second",
    details: [{ message: "capacity" }],
  });
});
it("rejects a non-JSON successful response", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("<html>oops</html>")),
  );
  await expect(apiFetch("/orders")).rejects.toMatchObject({
    code: "INVALID_RESPONSE",
  });
});
