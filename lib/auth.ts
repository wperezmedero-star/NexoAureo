import { env } from "cloudflare:workers";
import { evaluateIdentity, hasTrustedMutationOrigin } from "./authorization";

type RuntimeEnv = {
  NEXOAUREO_OWNER_EMAIL?: string;
};

const noStoreHeaders = {
  "cache-control": "no-store, max-age=0",
};

function runtime() {
  return env as unknown as RuntimeEnv;
}

export type AuthorizedUser = {
  email: string;
  displayName: string;
  initials: string;
};

export type AuthorizationResult =
  | { ok: true; user: AuthorizedUser }
  | { ok: false; response: Response };

export function authorizeRequest(request: Request): AuthorizationResult {
  const decision = evaluateIdentity(
    request.headers,
    runtime().NEXOAUREO_OWNER_EMAIL,
  );

  if (decision.ok) return decision;

  const message =
    decision.status === 503
      ? "El acceso privado todavía no está configurado."
      : decision.status === 403
        ? "Esta cuenta no está autorizada para abrir el espacio profesional."
        : "Inicia sesión con la cuenta autorizada para continuar.";

  return {
    ok: false,
    response: Response.json(
      {
        authenticated: false,
        error: message,
        code: decision.reason,
      },
      { status: decision.status, headers: noStoreHeaders },
    ),
  };
}

export function authorizeMutation(request: Request): AuthorizationResult {
  const authorization = authorizeRequest(request);
  if (!authorization.ok) return authorization;
  if (hasTrustedMutationOrigin(request)) return authorization;

  return {
    ok: false,
    response: Response.json(
      { error: "La solicitud no proviene de una sesión válida." },
      { status: 403, headers: noStoreHeaders },
    ),
  };
}

export const privateResponseHeaders = noStoreHeaders;
