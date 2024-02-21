var _a, _b, _c, _d, _e, _f;
import { app, ipcMain, dialog, BrowserWindow, shell } from "electron";
import { release } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { fork } from "child_process";
import { z as z$1 } from "zod";
import fs from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import process$1 from "process";
const { autoUpdater } = createRequire(import.meta.url)("electron-updater");
function update(win2) {
  autoUpdater.autoDownload = false;
  autoUpdater.disableWebInstaller = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.on("checking-for-update", function() {
  });
  autoUpdater.on("update-available", (arg) => {
    win2.webContents.send("update-can-available", { update: true, version: app.getVersion(), newVersion: arg == null ? void 0 : arg.version });
  });
  autoUpdater.on("update-not-available", (arg) => {
    win2.webContents.send("update-can-available", { update: false, version: app.getVersion(), newVersion: arg == null ? void 0 : arg.version });
  });
  ipcMain.handle("check-update", async () => {
    if (!app.isPackaged) {
      const error = new Error("The update feature is only available after the package.");
      return { message: error.message, error };
    }
    try {
      return await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      return { message: "Network error", error };
    }
  });
  ipcMain.handle("start-download", (event) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          event.sender.send("update-error", { message: error.message, error });
        } else {
          event.sender.send("download-progress", progressInfo);
        }
      },
      () => {
        event.sender.send("update-downloaded");
      }
    );
  });
  ipcMain.handle("quit-and-install", () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
function startDownload(callback, complete) {
  autoUpdater.on("download-progress", (info) => callback(null, info));
  autoUpdater.on("error", (error) => callback(error, null));
  autoUpdater.on("update-downloaded", complete);
  autoUpdater.downloadUpdate();
}
var N = (e, r, n) => {
  if (!r.has(e))
    throw TypeError("Cannot " + n);
};
var i = (e, r, n) => (N(e, r, "read from private field"), n ? n.call(e) : r.get(e)), f = (e, r, n) => {
  if (r.has(e))
    throw TypeError("Cannot add the same private member more than once");
  r instanceof WeakSet ? r.add(e) : r.set(e, n);
}, y = (e, r, n, t2) => (N(e, r, "write to private field"), t2 ? t2.call(e, n) : r.set(e, n), n);
var I = (e, r, n) => (N(e, r, "access private method"), n);
const l = "electron-trpc";
function V(e) {
  return !!e && !Array.isArray(e) && typeof e == "object";
}
function j(e, r) {
  return typeof e == "string" ? e : V(e) && typeof e.message == "string" ? e.message : r;
}
class _ extends Error {
  constructor(r) {
    const n = r.message ?? j(r.cause, r.code);
    super(n, {
      cause: r.cause
    }), this.code = r.code, this.name = this.constructor.name;
  }
}
function F(e) {
  const r = /* @__PURE__ */ Object.create(null);
  for (const n in e) {
    const t2 = e[n];
    r[t2] = n;
  }
  return r;
}
const k = {
  /**
  * Invalid JSON was received by the server.
  * An error occurred on the server while parsing the JSON text.
  */
  PARSE_ERROR: -32700,
  /**
  * The JSON sent is not a valid Request object.
  */
  BAD_REQUEST: -32600,
  /**
  * Internal JSON-RPC error.
  */
  INTERNAL_SERVER_ERROR: -32603,
  // Implementation specific errors
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
  METHOD_NOT_SUPPORTED: -32005,
  TIMEOUT: -32008,
  CONFLICT: -32009,
  PRECONDITION_FAILED: -32012,
  PAYLOAD_TOO_LARGE: -32013,
  UNPROCESSABLE_CONTENT: -32022,
  TOO_MANY_REQUESTS: -32029,
  CLIENT_CLOSED_REQUEST: -32099
};
F(k);
F(k);
function z(e) {
  var s;
  const { type: r, path: n } = e;
  if (!(n in e.procedures) || !((s = e.procedures[n]) != null && s._def[r]))
    throw new _({
      code: "NOT_FOUND",
      message: `No "${r}"-procedure on path "${n}"`
    });
  const t2 = e.procedures[n];
  return t2(e);
}
var D, A, m, U, L, M;
typeof window > "u" || "Deno" in window || ((A = (D = globalThis.process) == null ? void 0 : D.env) == null ? void 0 : A.NODE_ENV) === "test" || (U = (m = globalThis.process) == null ? void 0 : m.env) != null && U.JEST_WORKER_ID || (M = (L = globalThis.process) == null ? void 0 : L.env) != null && M.VITEST_WORKER_ID;
function Y(e) {
  return typeof e == "object" && e !== null && "subscribe" in e;
}
function P(e, r) {
  return "error" in r ? {
    ...r,
    error: e.transformer.output.serialize(r.error)
  } : "data" in r.result ? {
    ...r,
    result: {
      ...r.result,
      data: e.transformer.output.serialize(r.result.data)
    }
  } : r;
}
function v(e, r) {
  return Array.isArray(r) ? r.map((n) => P(e, n)) : P(e, r);
}
function S(e) {
  if (e instanceof _)
    return e;
  const r = K(e), n = new _({
    code: "INTERNAL_SERVER_ERROR",
    cause: r,
    message: r.message
  });
  return n.stack = r.stack, n;
}
function K(e) {
  return e instanceof Error ? e : typeof e == "string" ? new Error(e) : new Error("Unknown error");
}
async function Q({
  router: e,
  createContext: r,
  internalId: n,
  message: t2,
  event: s,
  subscriptions: a
}) {
  if (t2.method === "subscription.stop") {
    const o = a.get(n);
    if (!o)
      return;
    o.unsubscribe(), a.delete(n);
    return;
  }
  const { type: p, input: w, path: R, id: d } = t2.operation, h = w ? e._def._config.transformer.input.deserialize(w) : void 0, O = await (r == null ? void 0 : r({ event: s })) ?? {}, E = (o) => {
    s.sender.isDestroyed() || s.reply(l, v(e._def._config, o));
  };
  try {
    const o = await z({
      ctx: O,
      path: R,
      procedures: e._def.procedures,
      rawInput: h,
      type: p
    });
    if (p !== "subscription") {
      E({
        id: d,
        result: {
          type: "data",
          data: o
        }
      });
      return;
    } else if (!Y(o))
      throw new _({
        message: `Subscription ${R} did not return an observable`,
        code: "INTERNAL_SERVER_ERROR"
      });
    const b = o.subscribe({
      next(g) {
        E({
          id: d,
          result: {
            type: "data",
            data: g
          }
        });
      },
      error(g) {
        const $ = S(g);
        E({
          id: d,
          error: e.getErrorShape({
            error: $,
            type: p,
            path: R,
            input: h,
            ctx: O
          })
        });
      },
      complete() {
        E({
          id: d,
          result: {
            type: "stopped"
          }
        });
      }
    });
    a.set(n, b);
  } catch (o) {
    const b = S(o);
    return E({
      id: d,
      error: e.getErrorShape({
        error: b,
        type: p,
        path: R,
        input: h,
        ctx: O
      })
    });
  }
}
const x = (e, r) => {
  const n = r.method === "request" ? r.operation.id : r.id;
  return `${e.sender.id}-${e.senderFrame.routingId}:${n}`;
};
var c, u, T, W;
class G {
  constructor({
    createContext: r,
    router: n,
    windows: t2 = []
  }) {
    f(this, T);
    f(this, c, []);
    f(this, u, /* @__PURE__ */ new Map());
    t2.forEach((s) => this.attachWindow(s)), ipcMain.on(l, (s, a) => {
      Q({
        router: n,
        createContext: r,
        internalId: x(s, a),
        event: s,
        message: a,
        subscriptions: i(this, u)
      });
    });
  }
  attachWindow(r) {
    i(this, c).includes(r) || (i(this, c).push(r), I(this, T, W).call(this, r));
  }
  detachWindow(r) {
    y(this, c, i(this, c).filter((n) => n !== r));
    for (const [n, t2] of i(this, u).entries())
      n.startsWith(`${r.webContents.id}-`) && (t2.unsubscribe(), i(this, u).delete(n));
  }
}
c = /* @__PURE__ */ new WeakMap(), u = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakSet(), W = function(r) {
  r.webContents.on("destroyed", () => {
    this.detachWindow(r);
  });
};
const X = ({
  createContext: e,
  router: r,
  windows: n = []
}) => new G({ createContext: e, router: r, windows: n });
function isObject(value) {
  return !!value && !Array.isArray(value) && typeof value === "object";
}
class UnknownCauseError extends Error {
}
function getCauseFromUnknown(cause) {
  if (cause instanceof Error) {
    return cause;
  }
  const type = typeof cause;
  if (type === "undefined" || type === "function" || cause === null) {
    return void 0;
  }
  if (type !== "object") {
    return new Error(String(cause));
  }
  if (isObject(cause)) {
    const err = new UnknownCauseError();
    for (const key in cause) {
      err[key] = cause[key];
    }
    return err;
  }
  return void 0;
}
function getTRPCErrorFromUnknown(cause) {
  if (cause instanceof TRPCError) {
    return cause;
  }
  if (cause instanceof Error && cause.name === "TRPCError") {
    return cause;
  }
  const trpcError = new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    cause
  });
  if (cause instanceof Error && cause.stack) {
    trpcError.stack = cause.stack;
  }
  return trpcError;
}
class TRPCError extends Error {
  constructor(opts) {
    const cause = getCauseFromUnknown(opts.cause);
    const message = opts.message ?? (cause == null ? void 0 : cause.message) ?? opts.code;
    super(message, {
      cause
    });
    this.code = opts.code;
    this.name = "TRPCError";
    if (!this.cause) {
      this.cause = cause;
    }
  }
}
function invert(obj) {
  const newObj = /* @__PURE__ */ Object.create(null);
  for (const key in obj) {
    const v2 = obj[key];
    newObj[v2] = key;
  }
  return newObj;
}
const TRPC_ERROR_CODES_BY_KEY = {
  /**
  * Invalid JSON was received by the server.
  * An error occurred on the server while parsing the JSON text.
  */
  PARSE_ERROR: -32700,
  /**
  * The JSON sent is not a valid Request object.
  */
  BAD_REQUEST: -32600,
  // Internal JSON-RPC error
  INTERNAL_SERVER_ERROR: -32603,
  NOT_IMPLEMENTED: -32603,
  // Implementation specific errors
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
  METHOD_NOT_SUPPORTED: -32005,
  TIMEOUT: -32008,
  CONFLICT: -32009,
  PRECONDITION_FAILED: -32012,
  PAYLOAD_TOO_LARGE: -32013,
  UNPROCESSABLE_CONTENT: -32022,
  TOO_MANY_REQUESTS: -32029,
  CLIENT_CLOSED_REQUEST: -32099
};
invert(TRPC_ERROR_CODES_BY_KEY);
invert(TRPC_ERROR_CODES_BY_KEY);
const JSONRPC2_TO_HTTP_CODE = {
  PARSE_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  METHOD_NOT_SUPPORTED: 405,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501
};
function getStatusCodeFromKey(code) {
  return JSONRPC2_TO_HTTP_CODE[code] ?? 500;
}
function getHTTPStatusCodeFromError(error) {
  return getStatusCodeFromKey(error.code);
}
const noop = () => {
};
function createInnerProxy(callback, path2) {
  const proxy = new Proxy(noop, {
    get(_obj, key) {
      if (typeof key !== "string" || key === "then") {
        return void 0;
      }
      return createInnerProxy(callback, [
        ...path2,
        key
      ]);
    },
    apply(_1, _2, args) {
      const isApply = path2[path2.length - 1] === "apply";
      return callback({
        args: isApply ? args.length >= 2 ? args[1] : [] : args,
        path: isApply ? path2.slice(0, -1) : path2
      });
    }
  });
  return proxy;
}
const createRecursiveProxy = (callback) => createInnerProxy(callback, []);
const createFlatProxy = (callback) => {
  return new Proxy(noop, {
    get(_obj, name) {
      if (typeof name !== "string" || name === "then") {
        return void 0;
      }
      return callback(name);
    }
  });
};
function getDataTransformer(transformer) {
  if ("input" in transformer) {
    return transformer;
  }
  return {
    input: transformer,
    output: transformer
  };
}
const defaultTransformer = {
  _default: true,
  input: {
    serialize: (obj) => obj,
    deserialize: (obj) => obj
  },
  output: {
    serialize: (obj) => obj,
    deserialize: (obj) => obj
  }
};
const defaultFormatter = ({ shape }) => {
  return shape;
};
function omitPrototype(obj) {
  return Object.assign(/* @__PURE__ */ Object.create(null), obj);
}
const procedureTypes = [
  "query",
  "mutation",
  "subscription"
];
function isRouter(procedureOrRouter) {
  return "router" in procedureOrRouter._def;
}
const emptyRouter = {
  _ctx: null,
  _errorShape: null,
  _meta: null,
  queries: {},
  mutations: {},
  subscriptions: {},
  errorFormatter: defaultFormatter,
  transformer: defaultTransformer
};
const reservedWords = [
  /**
  * Then is a reserved word because otherwise we can't return a promise that returns a Proxy
  * since JS will think that `.then` is something that exists
  */
  "then"
];
function createRouterFactory(config) {
  return function createRouterInner(procedures) {
    const reservedWordsUsed = new Set(Object.keys(procedures).filter((v2) => reservedWords.includes(v2)));
    if (reservedWordsUsed.size > 0) {
      throw new Error("Reserved words used in `router({})` call: " + Array.from(reservedWordsUsed).join(", "));
    }
    const routerProcedures = omitPrototype({});
    function recursiveGetPaths(procedures2, path2 = "") {
      for (const [key, procedureOrRouter] of Object.entries(procedures2 ?? {})) {
        const newPath = `${path2}${key}`;
        if (isRouter(procedureOrRouter)) {
          recursiveGetPaths(procedureOrRouter._def.procedures, `${newPath}.`);
          continue;
        }
        if (routerProcedures[newPath]) {
          throw new Error(`Duplicate key: ${newPath}`);
        }
        routerProcedures[newPath] = procedureOrRouter;
      }
    }
    recursiveGetPaths(procedures);
    const _def = {
      _config: config,
      router: true,
      procedures: routerProcedures,
      ...emptyRouter,
      record: procedures,
      queries: Object.entries(routerProcedures).filter((pair) => pair[1]._def.query).reduce((acc, [key, val]) => ({
        ...acc,
        [key]: val
      }), {}),
      mutations: Object.entries(routerProcedures).filter((pair) => pair[1]._def.mutation).reduce((acc, [key, val]) => ({
        ...acc,
        [key]: val
      }), {}),
      subscriptions: Object.entries(routerProcedures).filter((pair) => pair[1]._def.subscription).reduce((acc, [key, val]) => ({
        ...acc,
        [key]: val
      }), {})
    };
    const router2 = {
      ...procedures,
      _def,
      createCaller(ctx) {
        return createCallerFactory()(router2)(ctx);
      },
      getErrorShape(opts) {
        const { path: path2, error } = opts;
        const { code } = opts.error;
        const shape = {
          message: error.message,
          code: TRPC_ERROR_CODES_BY_KEY[code],
          data: {
            code,
            httpStatus: getHTTPStatusCodeFromError(error)
          }
        };
        if (config.isDev && typeof opts.error.stack === "string") {
          shape.data.stack = opts.error.stack;
        }
        if (typeof path2 === "string") {
          shape.data.path = path2;
        }
        return this._def._config.errorFormatter({
          ...opts,
          shape
        });
      }
    };
    return router2;
  };
}
function callProcedure(opts) {
  var _a2;
  const { type, path: path2 } = opts;
  if (!(path2 in opts.procedures) || !((_a2 = opts.procedures[path2]) == null ? void 0 : _a2._def[type])) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No "${type}"-procedure on path "${path2}"`
    });
  }
  const procedure = opts.procedures[path2];
  return procedure(opts);
}
function createCallerFactory() {
  return function createCallerInner(router2) {
    const def = router2._def;
    return function createCaller(ctx) {
      const proxy = createRecursiveProxy(({ path: path2, args }) => {
        if (path2.length === 1 && procedureTypes.includes(path2[0])) {
          return callProcedure({
            procedures: def.procedures,
            path: args[0],
            rawInput: args[1],
            ctx,
            type: path2[0]
          });
        }
        const fullPath = path2.join(".");
        const procedure = def.procedures[fullPath];
        let type = "query";
        if (procedure._def.mutation) {
          type = "mutation";
        } else if (procedure._def.subscription) {
          type = "subscription";
        }
        return procedure({
          path: fullPath,
          rawInput: args[0],
          ctx,
          type
        });
      });
      return proxy;
    };
  };
}
const isServerDefault = typeof window === "undefined" || "Deno" in window || ((_b = (_a = globalThis.process) == null ? void 0 : _a.env) == null ? void 0 : _b.NODE_ENV) === "test" || !!((_d = (_c = globalThis.process) == null ? void 0 : _c.env) == null ? void 0 : _d.JEST_WORKER_ID) || !!((_f = (_e = globalThis.process) == null ? void 0 : _e.env) == null ? void 0 : _f.VITEST_WORKER_ID);
function getParseFn(procedureParser) {
  const parser = procedureParser;
  if (typeof parser === "function") {
    return parser;
  }
  if (typeof parser.parseAsync === "function") {
    return parser.parseAsync.bind(parser);
  }
  if (typeof parser.parse === "function") {
    return parser.parse.bind(parser);
  }
  if (typeof parser.validateSync === "function") {
    return parser.validateSync.bind(parser);
  }
  if (typeof parser.create === "function") {
    return parser.create.bind(parser);
  }
  if (typeof parser.assert === "function") {
    return (value) => {
      parser.assert(value);
      return value;
    };
  }
  throw new Error("Could not find a validator fn");
}
function mergeWithoutOverrides(obj1, ...objs) {
  const newObj = Object.assign(/* @__PURE__ */ Object.create(null), obj1);
  for (const overrides of objs) {
    for (const key in overrides) {
      if (key in newObj && newObj[key] !== overrides[key]) {
        throw new Error(`Duplicate key ${key}`);
      }
      newObj[key] = overrides[key];
    }
  }
  return newObj;
}
function createMiddlewareFactory() {
  function createMiddlewareInner(middlewares) {
    return {
      _middlewares: middlewares,
      unstable_pipe(middlewareBuilderOrFn) {
        const pipedMiddleware = "_middlewares" in middlewareBuilderOrFn ? middlewareBuilderOrFn._middlewares : [
          middlewareBuilderOrFn
        ];
        return createMiddlewareInner([
          ...middlewares,
          ...pipedMiddleware
        ]);
      }
    };
  }
  function createMiddleware(fn) {
    return createMiddlewareInner([
      fn
    ]);
  }
  return createMiddleware;
}
function isPlainObject(obj) {
  return obj && typeof obj === "object" && !Array.isArray(obj);
}
function createInputMiddleware(parse) {
  const inputMiddleware = async ({ next, rawInput, input }) => {
    let parsedInput;
    try {
      parsedInput = await parse(rawInput);
    } catch (cause) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        cause
      });
    }
    const combinedInput = isPlainObject(input) && isPlainObject(parsedInput) ? {
      ...input,
      ...parsedInput
    } : parsedInput;
    return next({
      input: combinedInput
    });
  };
  inputMiddleware._type = "input";
  return inputMiddleware;
}
function createOutputMiddleware(parse) {
  const outputMiddleware = async ({ next }) => {
    const result = await next();
    if (!result.ok) {
      return result;
    }
    try {
      const data = await parse(result.data);
      return {
        ...result,
        data
      };
    } catch (cause) {
      throw new TRPCError({
        message: "Output validation failed",
        code: "INTERNAL_SERVER_ERROR",
        cause
      });
    }
  };
  outputMiddleware._type = "output";
  return outputMiddleware;
}
const middlewareMarker = "middlewareMarker";
function createNewBuilder(def1, def2) {
  const { middlewares = [], inputs, meta, ...rest } = def2;
  return createBuilder({
    ...mergeWithoutOverrides(def1, rest),
    inputs: [
      ...def1.inputs,
      ...inputs ?? []
    ],
    middlewares: [
      ...def1.middlewares,
      ...middlewares
    ],
    meta: def1.meta && meta ? {
      ...def1.meta,
      ...meta
    } : meta ?? def1.meta
  });
}
function createBuilder(initDef = {}) {
  const _def = {
    inputs: [],
    middlewares: [],
    ...initDef
  };
  return {
    _def,
    input(input) {
      const parser = getParseFn(input);
      return createNewBuilder(_def, {
        inputs: [
          input
        ],
        middlewares: [
          createInputMiddleware(parser)
        ]
      });
    },
    output(output) {
      const parseOutput = getParseFn(output);
      return createNewBuilder(_def, {
        output,
        middlewares: [
          createOutputMiddleware(parseOutput)
        ]
      });
    },
    meta(meta) {
      return createNewBuilder(_def, {
        meta
      });
    },
    /**
    * @deprecated
    * This functionality is deprecated and will be removed in the next major version.
    */
    unstable_concat(builder) {
      return createNewBuilder(_def, builder._def);
    },
    use(middlewareBuilderOrFn) {
      const middlewares = "_middlewares" in middlewareBuilderOrFn ? middlewareBuilderOrFn._middlewares : [
        middlewareBuilderOrFn
      ];
      return createNewBuilder(_def, {
        middlewares
      });
    },
    query(resolver) {
      return createResolver({
        ..._def,
        query: true
      }, resolver);
    },
    mutation(resolver) {
      return createResolver({
        ..._def,
        mutation: true
      }, resolver);
    },
    subscription(resolver) {
      return createResolver({
        ..._def,
        subscription: true
      }, resolver);
    }
  };
}
function createResolver(_def, resolver) {
  const finalBuilder = createNewBuilder(_def, {
    resolver,
    middlewares: [
      async function resolveMiddleware(opts) {
        const data = await resolver(opts);
        return {
          marker: middlewareMarker,
          ok: true,
          data,
          ctx: opts.ctx
        };
      }
    ]
  });
  return createProcedureCaller(finalBuilder._def);
}
const codeblock = `
This is a client-only function.
If you want to call this function on the server, see https://trpc.io/docs/server/server-side-calls
`.trim();
function createProcedureCaller(_def) {
  const procedure = async function resolve(opts) {
    if (!opts || !("rawInput" in opts)) {
      throw new Error(codeblock);
    }
    const callRecursive = async (callOpts = {
      index: 0,
      ctx: opts.ctx
    }) => {
      try {
        const middleware = _def.middlewares[callOpts.index];
        const result2 = await middleware({
          ctx: callOpts.ctx,
          type: opts.type,
          path: opts.path,
          rawInput: callOpts.rawInput ?? opts.rawInput,
          meta: _def.meta,
          input: callOpts.input,
          next(_nextOpts) {
            const nextOpts = _nextOpts;
            return callRecursive({
              index: callOpts.index + 1,
              ctx: nextOpts && "ctx" in nextOpts ? {
                ...callOpts.ctx,
                ...nextOpts.ctx
              } : callOpts.ctx,
              input: nextOpts && "input" in nextOpts ? nextOpts.input : callOpts.input,
              rawInput: nextOpts && "rawInput" in nextOpts ? nextOpts.rawInput : callOpts.rawInput
            });
          }
        });
        return result2;
      } catch (cause) {
        return {
          ok: false,
          error: getTRPCErrorFromUnknown(cause),
          marker: middlewareMarker
        };
      }
    };
    const result = await callRecursive();
    if (!result) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No result from middlewares - did you forget to `return next()`?"
      });
    }
    if (!result.ok) {
      throw result.error;
    }
    return result.data;
  };
  procedure._def = _def;
  procedure.meta = _def.meta;
  return procedure;
}
function mergeRouters(...routerList) {
  var _a2;
  const record = mergeWithoutOverrides({}, ...routerList.map((r) => r._def.record));
  const errorFormatter = routerList.reduce((currentErrorFormatter, nextRouter) => {
    if (nextRouter._def._config.errorFormatter && nextRouter._def._config.errorFormatter !== defaultFormatter) {
      if (currentErrorFormatter !== defaultFormatter && currentErrorFormatter !== nextRouter._def._config.errorFormatter) {
        throw new Error("You seem to have several error formatters");
      }
      return nextRouter._def._config.errorFormatter;
    }
    return currentErrorFormatter;
  }, defaultFormatter);
  const transformer = routerList.reduce((prev, current) => {
    if (current._def._config.transformer && current._def._config.transformer !== defaultTransformer) {
      if (prev !== defaultTransformer && prev !== current._def._config.transformer) {
        throw new Error("You seem to have several transformers");
      }
      return current._def._config.transformer;
    }
    return prev;
  }, defaultTransformer);
  const router2 = createRouterFactory({
    errorFormatter,
    transformer,
    isDev: routerList.some((r) => r._def._config.isDev),
    allowOutsideOfServer: routerList.some((r) => r._def._config.allowOutsideOfServer),
    isServer: routerList.some((r) => r._def._config.isServer),
    $types: (_a2 = routerList[0]) == null ? void 0 : _a2._def._config.$types
  })(record);
  return router2;
}
class TRPCBuilder {
  context() {
    return new TRPCBuilder();
  }
  meta() {
    return new TRPCBuilder();
  }
  create(options) {
    return createTRPCInner()(options);
  }
}
const initTRPC = new TRPCBuilder();
function createTRPCInner() {
  return function initTRPCInner(runtime) {
    var _a2, _b2;
    const errorFormatter = (runtime == null ? void 0 : runtime.errorFormatter) ?? defaultFormatter;
    const transformer = getDataTransformer((runtime == null ? void 0 : runtime.transformer) ?? defaultTransformer);
    const config = {
      transformer,
      isDev: (runtime == null ? void 0 : runtime.isDev) ?? ((_b2 = (_a2 = globalThis.process) == null ? void 0 : _a2.env) == null ? void 0 : _b2.NODE_ENV) !== "production",
      allowOutsideOfServer: (runtime == null ? void 0 : runtime.allowOutsideOfServer) ?? false,
      errorFormatter,
      isServer: (runtime == null ? void 0 : runtime.isServer) ?? isServerDefault,
      /**
      * @internal
      */
      $types: createFlatProxy((key) => {
        throw new Error(`Tried to access "$types.${key}" which is not available at runtime`);
      })
    };
    {
      const isServer = (runtime == null ? void 0 : runtime.isServer) ?? isServerDefault;
      if (!isServer && (runtime == null ? void 0 : runtime.allowOutsideOfServer) !== true) {
        throw new Error(`You're trying to use @trpc/server in a non-server environment. This is not supported by default.`);
      }
    }
    return {
      /**
      * These are just types, they can't be used
      * @internal
      */
      _config: config,
      /**
      * Builder object for creating procedures
      * @see https://trpc.io/docs/server/procedures
      */
      procedure: createBuilder({
        meta: runtime == null ? void 0 : runtime.defaultMeta
      }),
      /**
      * Create reusable middlewares
      * @see https://trpc.io/docs/server/middlewares
      */
      middleware: createMiddlewareFactory(),
      /**
      * Create a router
      * @see https://trpc.io/docs/server/routers
      */
      router: createRouterFactory(config),
      /**
      * Merge Routers
      * @see https://trpc.io/docs/server/merging-routers
      */
      mergeRouters,
      /**
      * Create a server-side caller for a router
      * @see https://trpc.io/docs/server/server-side-calls
      */
      createCallerFactory: createCallerFactory()
    };
  };
}
const t = initTRPC.create();
const router = t.router;
const publicProcedure = t.procedure;
path.join(process.cwd(), ".cache");
const readSpecs = async (dir) => {
  const items = await fs.readdir(dir);
  return specBuilder(items, dir);
};
const specBuilder = async (specs, dir) => {
  const specsData = [];
  for (const item of specs) {
    try {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        const specs2 = path.join(itemPath, "specs_v1.json");
        try {
          await fs.stat(specs2);
          const specData = await fs.readFile(specs2);
          specsData.push(JSON.parse(specData));
        } catch (error) {
          console.log("ERROR: ", error);
        }
      }
    } catch (error) {
      console.log("ERRRRRROR: ", error);
    }
  }
  return specsData;
};
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function readJsonToObject(filePath) {
  const buffer = await fs.readFile(filePath);
  return JSON.parse(buffer);
}
async function filterDirectories(filePaths) {
  const stats = await Promise.all(filePaths.map((p) => fs.stat(p)));
  return filePaths.map((p, i2) => [p, stats[i2]]).filter(([p, s]) => s.isDirectory()).map(([p, s]) => p);
}
async function withFileSystemRollback(restorablePaths, workFunction) {
  const tempDirectory = await fs.mkdtemp(path.join(tmpdir(), "rollback"));
  const existingFiles = [];
  const notExistingFiles = [];
  try {
    for (const p of restorablePaths) {
      if (await fileExists(p)) {
        await fs.cp(p, path.join(tempDirectory, btoa(p)), { recursive: true });
        existingFiles.push(p);
      } else {
        notExistingFiles.push(p);
      }
    }
    await workFunction();
  } catch (e) {
    console.error(
      "File system operations failed. Starting file rollback. Caused by:",
      e
    );
    for (const p of existingFiles) {
      await fs.rm(p, { recursive: true });
      await fs.cp(path.join(tempDirectory, btoa(p)), p, { recursive: true });
    }
    for (const p of notExistingFiles) {
      await fs.rm(p, { recursive: true });
    }
  } finally {
    await fs.rm(tempDirectory, { recursive: true });
  }
}
function setDifference(setA, setB) {
  const difference = new Set(setA);
  setB.forEach((e) => {
    difference.delete(e);
  });
  return difference;
}
const BLOCK_SPECS = "specs_v1.json";
async function saveBlock(blockSpecs, fromPath, toPath) {
  const newFolder = path.join(toPath, blockSpecs.information.id);
  const existingBlock = path.join(fromPath, blockSpecs.information.id);
  withFileSystemRollback([toPath], async () => {
    await fs.mkdir(newFolder, { recursive: true });
    await fs.cp(existingBlock, newFolder, { recursive: true });
  });
  return newFolder;
}
async function copyPipeline(pipelineSpecs, pipelineName, fromDir, toDir) {
  const pipeline_specs = pipelineName + ".json";
  const bufferPath = path.resolve(process$1.cwd(), fromDir);
  const pipelineDirectory = toDir;
  const pipelineSpecsPath = path.join(pipelineDirectory, pipeline_specs);
  const blockIndex = await getBlockIndex([bufferPath]);
  const pipelineBlockIndex = await fileExists(pipelineDirectory) ? await getBlockIndex([pipelineDirectory]) : {};
  const newPipelineBlock = getPipelineBlocks(pipelineSpecs);
  const oldPipelineBlocks = await fileExists(pipelineSpecsPath) ? await readPipelineBlocks(pipelineSpecsPath) : /* @__PURE__ */ new Set();
  const blocksToAdd = setDifference(newPipelineBlock, oldPipelineBlocks);
  const blocksToRemove = setDifference(oldPipelineBlocks, newPipelineBlock);
  withFileSystemRollback([pipelineDirectory], async () => {
    await fs.mkdir(pipelineDirectory, { recursive: true });
    for (const block of blocksToAdd) {
      const pipelineBlockPath = path.join(pipelineDirectory, block);
      await fs.cp(blockIndex[block], pipelineBlockPath, { recursive: true });
    }
    for (const block of blocksToRemove) {
      await fs.rm(pipelineBlockIndex[block], { recursive: true });
    }
    await fs.writeFile(
      pipelineSpecsPath,
      JSON.stringify(pipelineSpecs, null, 2)
    );
  });
  return { specs: pipeline_specs, dirPath: pipelineDirectory };
}
async function getBlockIndex(blockDirectories) {
  const blockIndex = {};
  for (const directory of blockDirectories) {
    const blockPaths = await getBlocksInDirectory(directory);
    for (const blockPath of blockPaths) {
      const specs = await readJsonToObject(path.join(blockPath, BLOCK_SPECS));
      blockIndex[specs.information.id] = blockPath;
    }
  }
  return blockIndex;
}
function getPipelineBlocks(pipelineSpecs) {
  return new Set(
    Object.keys(pipelineSpecs.pipeline).map((k2) => pipelineSpecs.pipeline[k2]).map((b) => b.information.id).map((id) => id.substring(0, id.lastIndexOf("-")))
  );
}
async function getBlocksInDirectory(directory) {
  const files = await fs.readdir(directory);
  const filePaths = files.map((b) => path.join(directory, b));
  const directories = await filterDirectories(filePaths);
  return directories;
}
async function readPipelineBlocks(specsPath) {
  const specs = await readJsonToObject(specsPath);
  return getPipelineBlocks(specs);
}
const appRouter = router({
  getBlocks: publicProcedure.query(async () => {
    const coreBlocks = "../core/blocks";
    try {
      const blocks = await readSpecs(coreBlocks);
      return blocks;
    } catch (error) {
      console.log(error);
    }
  }),
  //TODO: load and validate schema
  savePipeline: publicProcedure.input(z$1.object({
    specs: z$1.any(),
    name: z$1.optional(z$1.string()),
    buffer: z$1.string(),
    writePath: z$1.optional(z$1.string())
  })).mutation(async (opts) => {
    var _a2;
    const { input } = opts;
    let { specs, name, buffer, writePath } = input;
    if (!writePath) {
      const savePath = await dialog.showSaveDialog({ properties: ["createDirectory"] });
      if (!savePath.canceled) {
        const pathArr = (_a2 = savePath.filePath) == null ? void 0 : _a2.split("/");
        name = pathArr ? pathArr[pathArr.length - 1] : name;
        writePath = savePath.filePath;
      }
    }
    console.log("writing: ", writePath);
    const savePaths = await copyPipeline(specs, name, buffer, writePath);
    console.log("wrote: ", savePaths);
    return savePaths;
  }),
  saveBlock: publicProcedure.input(z$1.object({
    blockSpec: z$1.any(),
    blockPath: z$1.string(),
    pipelinePath: z$1.string()
  })).mutation(async (opts) => {
    const { input } = opts;
    const { blockSpec, blockPath, pipelinePath } = input;
    const savePaths = await saveBlock(blockSpec, blockPath, pipelinePath);
    console.log("saved: ", savePaths);
    return savePaths;
  })
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
process.env.DIST_ELECTRON = join(__dirname, "../");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL ? join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
if (release().startsWith("6.1"))
  app.disableHardwareAcceleration();
if (process.platform === "win32")
  app.setAppUserModelId(app.getName());
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
let win = null;
const preload = join(__dirname, "../preload/index.mjs");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");
async function createWindow() {
  win = new BrowserWindow({
    title: "ZetaForge",
    icon: join(process.env.VITE_PUBLIC, "zetane.png"),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      nodeIntegration: true,
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      contextIsolation: true
    }
  });
  X({ router: appRouter, windows: [win] });
  if (url) {
    win.loadURL(url);
  } else {
    win.loadFile(indexHtml);
  }
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.setWindowOpenHandler(({ url: url2 }) => {
    if (url2.startsWith("https:"))
      shell.openExternal(url2);
    return { action: "deny" };
  });
  update(win);
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin")
    app.quit();
});
app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized())
      win.restore();
    win.focus();
  }
});
app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});
ipcMain.handle("open-win", (_2, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
fork(`${__dirname}/../../server.mjs`, [], {
  cwd: `${__dirname}/../../`
});
//# sourceMappingURL=index.js.map
