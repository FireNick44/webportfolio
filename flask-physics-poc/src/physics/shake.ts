/**
 * Per-flask cooldown gate for the bump shake. Returns true if enough time has
 * passed since the last shake (or it was never shaken). Without this, sweeping
 * the cursor through a flask re-applies the impulse every frame, keeping it
 * permanently awake and defeating the quiescence guard.
 *
 * Pure with an injected clock so it's unit-testable without a real timer.
 */
export function shouldShake(
  lastShakeAt: number | undefined,
  now: number,
  cooldownMs: number
): boolean {
  return now - (lastShakeAt ?? -Infinity) >= cooldownMs;
}
