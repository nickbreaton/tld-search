const SERVER_FUNCTION_ENDPOINT = "/_server";

export default function redirectUnknownPaths(request: Request, next: () => Promise<Response>) {
  const { pathname } = new URL(request.url);

  if (
    pathname === "/" ||
    pathname === SERVER_FUNCTION_ENDPOINT ||
    pathname.startsWith(`${SERVER_FUNCTION_ENDPOINT}/`)
  ) {
    return next();
  }

  return new Response(null, { status: 307, headers: { Location: "/" } });
}
