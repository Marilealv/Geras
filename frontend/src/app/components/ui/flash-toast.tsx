import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { FlashMessage } from "../../lib/dashboard-flash";

interface FlashToastProps {
  flashMessage: FlashMessage | null;
  isVisible: boolean;
  onClose: () => void;
}

export function FlashToast({ flashMessage, isVisible, onClose }: FlashToastProps) {
  if (!flashMessage) {
    return null;
  }

  const isError = flashMessage.type === "error";

  return (
    <div
      className={`fixed right-4 top-24 z-[70] w-[min(360px,calc(100vw-2rem))] transform transition-all duration-300 ease-out ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className={`rounded-xl bg-white p-4 shadow-2xl ${isError ? "border border-rose-200" : "border border-emerald-200"}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-1.5 ${isError ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
            {isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-teal-900">{isError ? "Atenção" : "Sucesso"}</p>
            <p className="text-sm text-teal-700">{flashMessage.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-teal-500 transition hover:text-teal-800"
            aria-label="Fechar notificação"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
