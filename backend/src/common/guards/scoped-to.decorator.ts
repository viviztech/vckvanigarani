import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const SCOPE_TARGET_EXTRACTOR = 'scopeTargetExtractor';

/**
 * A route is scope-checked by supplying a function that pulls the target
 * JurisdictionUnit id(s) for the request out of params/query/body — the
 * shape differs per route (a single id in a path param, several ids in a
 * created Assignment's body, etc.), so the guard itself stays generic.
 *
 * Returning `undefined`/`[]` means "nothing to check" (e.g. a route that
 * only touches the caller's own data) — NOT the same as "no restriction";
 * routes with no @ScopedTo() at all skip the guard entirely.
 */
export type ScopeTargetExtractor = (request: Request) => string | string[] | undefined;

export const ScopedTo = (extractor: ScopeTargetExtractor) => SetMetadata(SCOPE_TARGET_EXTRACTOR, extractor);
