export type FlashMessageType = "success" | "error";

export interface FlashMessage {
  type: FlashMessageType;
  message: string;
}

const DASHBOARD_FLASH_KEY = "dashboard:flash";

export function setDashboardFlash(message: string, type: FlashMessageType = "success") {
  sessionStorage.setItem(
    DASHBOARD_FLASH_KEY,
    JSON.stringify({
      type,
      message,
    })
  );
}

export function consumeDashboardFlash(): FlashMessage | null {
  const raw = sessionStorage.getItem(DASHBOARD_FLASH_KEY);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(DASHBOARD_FLASH_KEY);

  try {
    const parsed = JSON.parse(raw) as FlashMessage;
    if (!parsed?.message) {
      return null;
    }

    return {
      type: parsed.type === "error" ? "error" : "success",
      message: parsed.message,
    };
  } catch {
    return null;
  }
}
