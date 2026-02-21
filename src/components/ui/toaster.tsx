import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="rounded-2xl shadow-2xl backdrop-blur-xl bg-card/95 border border-border/50 px-5 py-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="grid gap-0.5">
              {title && <ToastTitle className="text-sm font-semibold">{title}</ToastTitle>}
              {description && <ToastDescription className="text-xs">{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className="fixed bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[90vw] max-w-[380px] z-[100] p-0 m-0" />
    </ToastProvider>
  );
}
