import { TRPCError } from "@trpc/server";
import { middleware } from "./trpc";

export const errorHandling = middleware(async (opts) => {
  const { ctx } = opts;
  const response = await opts.next({ ctx });
  
  if (!response.ok) {
    console.log(response.error)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occured, please try again later.",
    });
  }

  return response;
})
