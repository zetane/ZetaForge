import { TRPCError } from "@trpc/server";
import { middleware } from "./trpc";
import { ServerError } from "./serverError";
import { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc/index";
import { logger } from "./logger";

export const errorHandling = middleware(async (opts) => {
  const { ctx } = opts;
  const response = await opts.next({ ctx });

  if (!response.ok) {
    const innerError = response.error.cause;
    logger.error(innerError, "Server returned an error");

    if (innerError instanceof ServerError) {
      throw new TRPCError({
        code: innerError.statusCode as TRPC_ERROR_CODE_KEY,
        message: innerError.message,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occured, please try again later.",
    });
  }

  return response;
});
