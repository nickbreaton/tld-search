import { Context, Duration, Effect, Layer, Option, Predicate, Redacted, Schema } from "effect";
import {
  Cookies,
  HttpServerRequest as HttpServerRequestModule,
  HttpServerResponse,
} from "effect/unstable/http";
import { getIronSession, type CookieStore, type SessionOptions } from "iron-session";

type HttpServerRequest = HttpServerRequestModule.HttpServerRequest;

export class IronSessionError extends Schema.TaggedError<IronSessionError>()("IronSessionError", {
  operation: Schema.Literals(["load", "save", "destroy"]),
  cause: Schema.Defect(),
}) {}

export interface IronSessionOptions {
  readonly password: Redacted.Redacted<string>;
  readonly cookieName?: string;
  readonly ttlSeconds?: number;
  readonly secure?: boolean;
}

interface SessionEnvelope {
  data?: unknown;
}

export class IronSession extends Context.Service<
  IronSession,
  {
    readonly load: <A, R>(
      request: HttpServerRequest,
      schema: Schema.Decoder<A, R>,
    ) => Effect.Effect<Option.Option<A>, IronSessionError, R>;
    readonly save: <A>(
      request: HttpServerRequest,
      response: HttpServerResponse.HttpServerResponse,
      data: A,
    ) => Effect.Effect<HttpServerResponse.HttpServerResponse, IronSessionError>;
    readonly destroy: (
      request: HttpServerRequest,
      response: HttpServerResponse.HttpServerResponse,
    ) => Effect.Effect<HttpServerResponse.HttpServerResponse, IronSessionError>;
  }
>()("bookmarks-jev/IronSession") {
  static layer(options: IronSessionOptions) {
    return Layer.succeed(IronSession, make(options));
  }
}

const make = (options: IronSessionOptions): IronSession["Service"] => {
  const sessionOptions: SessionOptions = {
    password: Redacted.value(options.password),
    cookieName: options.cookieName ?? "bookmarks_jev_session",
    ttl: options.ttlSeconds,
    cookieOptions: {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: options.secure ?? true,
    },
  };

  const open = (cookieStore: CookieStore) =>
    Effect.tryPromise({
      try: () => getIronSession<SessionEnvelope>(cookieStore, sessionOptions),
      catch: (cause) => new IronSessionError({ operation: "load", cause }),
    });

  const load = Effect.fn("IronSession.load")(function* <A, R>(
    request: HttpServerRequest,
    schema: Schema.Decoder<A, R>,
  ) {
    const [cookieStore] = makeCookieStore(request, Cookies.empty);
    const session = yield* open(cookieStore);

    if (session.data === undefined) {
      return Option.none<A>();
    }

    return yield* Schema.decodeUnknownEffect(schema)(session.data).pipe(
      Effect.map(Option.some),
      Effect.mapError((cause) => new IronSessionError({ operation: "load", cause })),
    );
  });

  const save = Effect.fn("IronSession.save")(function* <A>(
    request: HttpServerRequest,
    response: HttpServerResponse.HttpServerResponse,
    data: A,
  ) {
    const [cookieStore, getCookies] = makeCookieStore(request, response.cookies);

    const session = yield* open(cookieStore).pipe(
      Effect.mapError((error) => new IronSessionError({ operation: "save", cause: error.cause })),
    );

    session.data = data;

    yield* Effect.tryPromise({
      try: () => session.save(),
      catch: (cause) => new IronSessionError({ operation: "save", cause }),
    });

    return HttpServerResponse.replaceCookies(response, getCookies());
  });

  const destroy = Effect.fn("IronSession.destroy")(function* (
    request: HttpServerRequest,
    response: HttpServerResponse.HttpServerResponse,
  ) {
    const [cookieStore, getCookies] = makeCookieStore(request, response.cookies);

    const session = yield* open(cookieStore).pipe(
      Effect.mapError(
        (error) => new IronSessionError({ operation: "destroy", cause: error.cause }),
      ),
    );

    yield* Effect.try({
      try: () => session.destroy(),
      catch: (cause) => new IronSessionError({ operation: "destroy", cause }),
    });

    return HttpServerResponse.replaceCookies(response, getCookies());
  });

  return IronSession.of({ load, save, destroy });
};

const makeCookieStore = (
  request: HttpServerRequest,
  initialCookies: Cookies.Cookies,
): readonly [CookieStore, () => Cookies.Cookies] => {
  let cookies = initialCookies;

  const cookieStore: CookieStore = {
    get: (name) => {
      const value = request.cookies[name];

      return value === undefined ? undefined : { name, value };
    },
    set: (name, value, options) => {
      const expires = Predicate.isNumber(options.expires)
        ? new Date(options.expires)
        : options.expires;

      const maxAge = options.maxAge === undefined ? undefined : Duration.seconds(options.maxAge);
      const sameSite = options.sameSite === true ? "strict" : options.sameSite || undefined;

      const cookie = Cookies.makeCookieUnsafe(name, value, {
        domain: options.domain,
        expires,
        httpOnly: options.httpOnly,
        maxAge,
        path: options.path,
        priority: options.priority,
        sameSite,
        secure: options.secure,
      });

      cookies = Cookies.setCookie(cookies, cookie);
    },
  };

  return [cookieStore, () => cookies];
};
