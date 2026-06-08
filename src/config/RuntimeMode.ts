/**
 * Reads runtime flags from the browser URL.
 *
 * Touch controls are intentionally opt-in for now. Launching the game with
 * `?touch=1` makes the mobile HUD deterministic during development and avoids
 * guessing wrong on laptops that also expose a touch screen.
 */
export function isTouchModeEnabled(): boolean
{
    const searchParameters = new URLSearchParams(window.location.search);
    return searchParameters.get("touch") === "1";
}
