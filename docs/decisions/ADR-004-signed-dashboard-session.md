# ADR 004: Use a signed HTTP-only session for the private dashboard

Status: Accepted  
Date: 19 July 2026

## Context

The private Growth OS dashboard historically accepted `DIAGNOSTIC_ADMIN_KEY` in the query string and propagated it through dashboard links and API requests. That made the credential visible in browser history, copied URLs, screenshots, referrer data, and diagnostic tooling.

The dashboard still needs a lightweight access boundary without introducing a user-account system into the client strategy release. Protected API routes also need a migration path that does not require every browser call to change at once.

## Decision

Exchange the administrator key through a POST-only login route for an HMAC-signed session token. Store the token in an HTTP-only cookie with an eight-hour lifetime, `SameSite=Strict`, path `/`, high priority, and `Secure` in production.

Server-rendered dashboard pages read the cookie directly. Protected API routes verify the same signed cookie on every request. Browser components receive only a non-secret marker so existing enabled-state checks continue to work; URL builders remove that marker instead of adding it to links or request URLs.

Add an explicit POST logout route that expires the cookie. Login responses use generic errors, bounded input, and best-effort throttling after five failures in fifteen minutes. The protected dashboard and session routes use no-store caching, no-referrer, anti-framing, and MIME-sniffing headers.

Retain direct administrator-key authorization in protected API routes only as a temporary rollback path. The rendered dashboard no longer reads or propagates a query-string key.

## Consequences

Positive:

- The administrator credential is no longer exposed in normal dashboard URLs, client component props, browser history, or referrer data.
- Rotating `DIAGNOSTIC_ADMIN_KEY` invalidates every existing signed session.
- The change remains smaller than introducing account, password-reset, and role-management flows.
- Protected API authorization remains server-enforced on every request.

Trade-offs:

- The in-memory throttle is best effort on serverless infrastructure and is not a replacement for deployment-level rate limiting.
- One shared administrator key still represents one shared operator identity, so this does not provide per-user audit attribution.
- The temporary legacy API-key path remains an exposure until it is removed after deployment acceptance.

## Deployment requirement

Deploy the session flow, rotate `DIAGNOSTIC_ADMIN_KEY`, verify login and logout in production, then remove the direct-key fallback from API authorization. A future multi-user dashboard should replace the shared key with named accounts, server-side roles, and revocable sessions.
