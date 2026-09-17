/**
 * Central application clock for monthly-dues logic.
 *
 * Defense/demo mode is opt-in with VITE_ENABLE_DEMO_TIME=true.
 * In production set it to false (or remove it). The app then always uses
 * the real device time and any old browser override is ignored.
 */
const DEMO_DATE_STORAGE_KEY = "terradues-demo-date";

export const isDemoTimeEnabled = () =>
  import.meta.env.VITE_ENABLE_DEMO_TIME === "true";

const parseLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

export const getDemoDateValue = () => {
  if (!isDemoTimeEnabled() || typeof window === "undefined") return "";
  return window.localStorage.getItem(DEMO_DATE_STORAGE_KEY) ?? "";
};

export const getAppDate = () => {
  const demoValue = getDemoDateValue();
  return (demoValue && parseLocalDate(demoValue)) || new Date();
};

export const setDemoDate = (value: string) => {
  if (!isDemoTimeEnabled() || typeof window === "undefined") return;

  if (!parseLocalDate(value)) {
    throw new Error("Please select a valid demo date.");
  }

  window.localStorage.setItem(DEMO_DATE_STORAGE_KEY, value);
  window.dispatchEvent(new Event("terradues-demo-date-changed"));
};

export const clearDemoDate = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_DATE_STORAGE_KEY);
  window.dispatchEvent(new Event("terradues-demo-date-changed"));
};
