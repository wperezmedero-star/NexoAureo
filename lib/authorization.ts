export type IdentityDecision =
  | {
      ok: true;
      user: {
        email: string;
        displayName: string;
        initials: string;
      };
    }
  | {
      ok: false;
      status: 401 | 403 | 503;
      reason: "missing_identity" | "wrong_identity" | "missing_configuration";
    };

const EMAIL_HEADER = "oai-authenticated-user-email";
const FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

function normalizedEmail(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("en-US") ?? "";
}

function decodeDisplayName(headers: Headers, email: string) {
  const encodedName = headers.get(FULL_NAME_HEADER);
  if (
    !encodedName ||
    headers.get(FULL_NAME_ENCODING_HEADER) !== PERCENT_ENCODED_UTF8
  ) {
    return email.split("@")[0] || "Usuario autorizado";
  }

  try {
    return decodeURIComponent(encodedName).trim() || "Usuario autorizado";
  } catch {
    return "Usuario autorizado";
  }
}

function initialsFor(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es-US"))
    .join("");
  return initials || "NA";
}

export function evaluateIdentity(
  headers: Headers,
  configuredOwnerEmail: string | null | undefined,
): IdentityDecision {
  const ownerEmail = normalizedEmail(configuredOwnerEmail);
  if (!ownerEmail) {
    return {
      ok: false,
      status: 503,
      reason: "missing_configuration",
    };
  }

  const presentedEmail = normalizedEmail(headers.get(EMAIL_HEADER));
  if (!presentedEmail) {
    return { ok: false, status: 401, reason: "missing_identity" };
  }

  if (presentedEmail !== ownerEmail) {
    return { ok: false, status: 403, reason: "wrong_identity" };
  }

  const displayName = decodeDisplayName(headers, presentedEmail);
  return {
    ok: true,
    user: {
      email: presentedEmail,
      displayName,
      initials: initialsFor(displayName),
    },
  };
}

export function hasTrustedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
