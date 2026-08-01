import { z } from 'zod';

export const authCredentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export const signupCredentialsSchema = authCredentialsSchema.extend({
  password: z.string().min(12).max(128)
    .regex(/[a-z]/, 'Password requires a lowercase letter')
    .regex(/[A-Z]/, 'Password requires an uppercase letter')
    .regex(/[0-9]/, 'Password requires a number')
    .regex(/[^A-Za-z0-9]/, 'Password requires a symbol'),
}).strict();

