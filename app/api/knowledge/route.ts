import { getKnowledgeBase } from "../../../lib/knowledge-base";
import { authorizeRequest } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = authorizeRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    return Response.json(await getKnowledgeBase());
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible consultar la base.";
    return Response.json({ error: message }, { status: 500 });
  }
}
