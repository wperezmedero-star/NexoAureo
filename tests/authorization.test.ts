import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateIdentity,
  hasTrustedMutationOrigin,
} from "../lib/authorization.ts";

const owner = "owner@example.com";

test("deniega el acceso si falta la configuración del propietario", () => {
  const result = evaluateIdentity(new Headers(), undefined);
  assert.deepEqual(result, {
    ok: false,
    status: 503,
    reason: "missing_configuration",
  });
});

test("deniega una solicitud sin identidad autenticada", () => {
  const result = evaluateIdentity(new Headers(), owner);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 401);
});

test("deniega una cuenta distinta a la autorizada", () => {
  const headers = new Headers({
    "oai-authenticated-user-email": "other@example.com",
  });
  const result = evaluateIdentity(headers, owner);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test("autoriza únicamente la cuenta configurada y decodifica su nombre", () => {
  const headers = new Headers({
    "oai-authenticated-user-email": "OWNER@EXAMPLE.COM",
    "oai-authenticated-user-full-name": "William%20P%C3%A9rez",
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  });
  const result = evaluateIdentity(headers, owner);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.user.displayName, "William Pérez");
    assert.equal(result.user.initials, "WP");
  }
});

test("acepta mutaciones solo desde el mismo origen", () => {
  const trusted = new Request("https://example.com/api/items", {
    method: "POST",
    headers: { origin: "https://example.com" },
  });
  const forged = new Request("https://example.com/api/items", {
    method: "POST",
    headers: { origin: "https://attacker.example" },
  });
  assert.equal(hasTrustedMutationOrigin(trusted), true);
  assert.equal(hasTrustedMutationOrigin(forged), false);
});
