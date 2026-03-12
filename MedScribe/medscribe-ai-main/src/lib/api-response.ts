import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT"
  | "INTERNAL_ERROR";

/**
 * Standardized API success response.
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/**
 * Standardized API error response with optional code for client handling.
 */
export function apiError(
  error: string,
  status: number,
  code?: ApiErrorCode
) {
  return NextResponse.json(
    { error, code: code ?? inferCode(status) },
    { status }
  );
}

function inferCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMIT";
  return "INTERNAL_ERROR";
}
