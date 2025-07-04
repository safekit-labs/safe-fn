import z from "zod";
import { queryClient } from "./definition";

// bun run issues/implementation.ts

export const getNodeEnvQuery = queryClient
	.metadata({
		operationName: "get-node-env",
	})
	.context<{ env: { NODE_ENV: string } }>()
	.input(z.object({}))
	.output(
		z.object({
			NODE_ENV: z.string(),
			timestamp: z.string(),
		})
	)
	.handler(async ({ ctx }) => {
		return {
			NODE_ENV: ctx.env.NODE_ENV,
			timestamp: new Date().toISOString(),
		};
	});

const ctx = {
  logger: console,
	env: {
		NODE_ENV: "development",
	},
};
const result = await getNodeEnvQuery.withContext(ctx).execute({});

console.log({result});
