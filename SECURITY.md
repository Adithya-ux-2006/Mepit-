# Platform Security

## Required deployment controls

- Apply all Supabase migrations, including `012_security_hardening.sql`.
- Store `SUPABASE_SERVICE_ROLE_KEY` and `RATE_LIMIT_SECRET` only as encrypted server-side environment variables.
- Keep public signup disabled unless an approved onboarding flow is required.
- Enable Supabase CAPTCHA, leaked-password protection, and appropriate Auth rate limits.
- Require MFA for administrators and set `REQUIRE_ADMIN_MFA=true` after enrollment.
- Configure session inactivity and maximum lifetime limits in Supabase Auth.
- Keep `TRUST_PROXY_HEADERS=false` except behind a trusted proxy that overwrites forwarding headers.

## Verification

Run `npm test`, `npm run lint`, and `npm run build` before deployment. Review security headers at the deployed origin and confirm no service-role key appears in browser assets, logs, or source maps.

Security is an ongoing process. Patch dependencies, review audit events, rotate credentials, and retest authorization boundaries regularly.
