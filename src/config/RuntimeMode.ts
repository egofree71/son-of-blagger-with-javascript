/**
 * Reads runtime flags from the browser environment.
 *
 * The normal desktop game remains keyboard-first. Touch controls are enabled
 * explicitly with `?touch=1`, or automatically when the installed PWA runs on
 * a device that looks touch-capable. The PWA also adds `?pwa=1` to its
 * start_url, which lets the game distinguish a real home-screen launch from a
 * temporary browser Fullscreen API session.
 */
export function isTouchModeEnabled(): boolean
{
    const searchParameters = new URLSearchParams(window.location.search);

    if (searchParameters.get("touch") === "1") {
        return true;
    }

    return isInstalledPwaLaunch() && isTouchCapableDevice();
}

/**
 * Detects launches from an installed web app window.
 *
 * Browser fullscreen is deliberately not treated as a PWA launch: Chrome can
 * report `display-mode: fullscreen` after a normal Fullscreen API request, and
 * that would make the in-browser EXIT button disappear or stop working. The
 * explicit `?pwa=1` launch flag is therefore the reliable Android path when the
 * manifest uses `display: fullscreen`.
 */
export function isInstalledPwaLaunch(): boolean
{
    const searchParameters = new URLSearchParams(window.location.search);
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

    return searchParameters.get("pwa") === "1"
        || window.matchMedia("(display-mode: standalone)").matches
        || navigatorWithStandalone.standalone === true;
}

function isTouchCapableDevice(): boolean
{
    return navigator.maxTouchPoints > 0
        || window.matchMedia("(pointer: coarse)").matches;
}
