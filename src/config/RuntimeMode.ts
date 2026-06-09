/**
 * Reads runtime flags from the browser environment.
 *
 * The normal desktop game remains keyboard-first. Touch controls are enabled
 * explicitly with `?touch=1`, or automatically when the installed PWA runs in
 * standalone mode on a device that looks touch-capable. This keeps the regular
 * GitHub Pages URL desktop-friendly while making the home-screen version useful
 * on phones.
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
 * Standalone PWAs already run outside the normal browser chrome. Requesting the
 * Fullscreen API from there can produce inconsistent viewport sizes on phones,
 * so touch UI code can use this helper to avoid offering a redundant fullscreen
 * toggle in that environment.
 */
export function isInstalledPwaLaunch(): boolean
{
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

    return window.matchMedia("(display-mode: standalone)").matches
        || window.matchMedia("(display-mode: fullscreen)").matches
        || navigatorWithStandalone.standalone === true;
}

function isTouchCapableDevice(): boolean
{
    return navigator.maxTouchPoints > 0
        || window.matchMedia("(pointer: coarse)").matches;
}
