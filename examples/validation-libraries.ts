import { z } from "zod"; // or 'zod/v3', 'zod/v4'
import { type } from "arktype";
import { Schema } from "effect";

import { createClient } from "@safekit/safe-fn";

const client = createClient();

// ========================================================================
// ZOD
// ========================================================================

export const zodUserFn = client
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .handler(async ({ input }) => input);

export const zodTupleFn = client
  .args(z.string(), z.number().positive())
  .handler(async ({ args }) => args);


// ========================================================================
// VALIBOT
// ========================================================================

import * as v from "valibot";

export const valibotUserFn = client
  .input(v.object({ name: v.string(), email: v.pipe(v.string(), v.email()) }))
  .handler(async ({ input }) => input);

export const valibotTupleFn = client
  .args(v.string(), v.pipe(v.number(), v.minValue(0)))
  .handler(async ({ args }) => args);

// ========================================================================
// ARKTYPE
// ========================================================================

export const arkTypeUserFn = client
  .input(type({ name: "string", email: "string.email" }))
  .handler(async ({ input }) => input);

export const arkTypeTupleFn = client
  .args(type("string"), type("number>0"))
  .handler(async ({ args }) => args);

// ========================================================================
// EFFECT SCHEMA
// ========================================================================

export const effectUserFn = client
  .input(
    Schema.standardSchemaV1(
      Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
      }),
    ),
  )
  .handler(async ({ input }) => input);

export const effectTupleFn = client
  .args(Schema.standardSchemaV1(Schema.String), Schema.standardSchemaV1(Schema.Number))
  .handler(async ({ args }) => args);


