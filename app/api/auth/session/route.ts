import { authorizeRequest, privateResponseHeaders } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = authorizeRequest(request);
  if (!authorization.ok) return authorization.response;

  return Response.json(
    {
      authenticated: true,
      user: {
        displayName: authorization.user.displayName,
        initials: authorization.user.initials,
      },
    },
    { headers: privateResponseHeaders },
  );
}
