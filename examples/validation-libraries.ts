import { z } from "zod"; // or 'zod/v3', 'zod/v4'
import * as yup from "yup";
import { type } from "arktype";
import { Schema } from "effect";
import * as st from "superstruct";
import * as T from "runtypes";

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
// YUP
// ========================================================================

export const yupUserFn = client
  .input(yup.object({ name: yup.string().required(), age: yup.number().required() }))
  .handler(async ({ input }) => input);

export const yupTupleFn = client
  .args(yup.string().required(), yup.number().positive().required())
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

// ========================================================================
// SUPERSTRUCT
// ========================================================================

export const superstructUserFn = client
  .input(st.object({ name: st.string(), age: st.number() }))
  .handler(async ({ input }) => input);

export const superstructTupleFn = client
  .args(st.string(), st.number())
  .handler(async ({ args }) => args);

// ========================================================================
// RUNTYPES
// ========================================================================

export const runtypesUserFn = client
  .input(T.Object({ name: T.String, age: T.Number }))
  .handler(async ({ input }) => input);

export const runtypesTupleFn = client
  .args(T.String, T.Number)
  .handler(async ({ args }) => args);
