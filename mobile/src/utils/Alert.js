/**
 * MehndiGo Centralized Alert & Notification Controller
 *
 * Routes alerts smartly between:
 * 1. GlobalModal (Bottom Sheet Confirmation) when user action/decision is needed.
 * 2. GlobalToast (Glassmorphic Floating Pill) for smooth, subtle informational & status toasts.
 */

export const Alert = {
  alert: (title, message, buttons, options) => {
    // Show modal if we have multiple buttons, or if there is 1 button that has an onPress callback
    const needsModal =
      (buttons && buttons.length > 1) ||
      (buttons && buttons.length === 1 && buttons[0].onPress);

    if (needsModal) {
      let cancelBtn = null;
      let confirmBtn = null;

      if (buttons && buttons.length === 1) {
        confirmBtn = buttons[0];
      } else if (buttons && buttons.length > 1) {
        const cancelIndex = buttons.findIndex(
          (b) =>
            b.style === "cancel" ||
            String(b.text || "").trim().toLowerCase() === "cancel" ||
            String(b.text || "").trim().toLowerCase() === "no" ||
            String(b.text || "").trim().toLowerCase() === "later" ||
            String(b.text || "").trim().toLowerCase() === "dismiss"
        );

        if (cancelIndex !== -1) {
          cancelBtn = buttons[cancelIndex];
          confirmBtn =
            buttons.find((_, idx) => idx !== cancelIndex) ||
            buttons[cancelIndex === 0 ? 1 : 0];
        } else {
          cancelBtn = buttons[0];
          confirmBtn = buttons[1];
        }
      }

      // Determine modal theme/type based on title & text keywords
      let type = "info";
      const lowerTitle = String(title || "").toLowerCase();
      const lowerMsg = String(message || "").toLowerCase();

      // Check if any button has destructive style
      const hasDestructiveBtn = buttons?.some(
        (b) => b.style === "destructive"
      );

      if (
        hasDestructiveBtn ||
        lowerTitle.includes("delete") ||
        lowerTitle.includes("logout") ||
        lowerTitle.includes("remove") ||
        lowerTitle.includes("discard") ||
        lowerTitle.includes("reject") ||
        lowerTitle.includes("cancel") ||
        lowerMsg.includes("delete") ||
        lowerMsg.includes("logout")
      ) {
        type = "danger";
      } else if (
        lowerTitle.includes("warn") ||
        lowerTitle.includes("permission") ||
        lowerTitle.includes("camera") ||
        lowerTitle.includes("location") ||
        lowerTitle.includes("gallery") ||
        lowerTitle.includes("storage")
      ) {
        type = "warning";
      } else if (
        lowerTitle.includes("update") ||
        lowerMsg.includes("update")
      ) {
        type = "update";
      } else if (
        lowerTitle.includes("success") ||
        lowerTitle.includes("complete") ||
        lowerTitle.includes("verified") ||
        lowerTitle.includes("thank") ||
        lowerTitle.includes("applied") ||
        lowerTitle.includes("🎉")
      ) {
        type = "success";
      }

      if (global.showConfirmationModal) {
        global.showConfirmationModal({
          title: title || "Confirm Action",
          description: message || "",
          confirmText: confirmBtn?.text || "Confirm",
          cancelText: cancelBtn?.text || "Cancel",
          buttons: buttons,
          type: type,
          dismissible: options?.cancelable !== false,
          onConfirm: () => confirmBtn?.onPress?.(),
          onCancel: cancelBtn ? () => cancelBtn?.onPress?.() : null,
        });
      }
    } else {
      // Render as a Toast
      const lowerTitle = String(title || "").toLowerCase();
      const lowerMsg = String(message || "").toLowerCase();

      let type = "info";
      if (
        lowerTitle.includes("error") ||
        lowerMsg.includes("error") ||
        lowerTitle.includes("fail") ||
        lowerMsg.includes("fail") ||
        lowerTitle.includes("invalid") ||
        lowerMsg.includes("invalid") ||
        lowerTitle.includes("required") ||
        lowerMsg.includes("required") ||
        lowerTitle.includes("incomplete") ||
        lowerMsg.includes("incomplete")
      ) {
        type = "error";
      } else if (
        lowerTitle.includes("success") ||
        lowerMsg.includes("success") ||
        lowerTitle.includes("saved") ||
        lowerMsg.includes("saved") ||
        lowerTitle.includes("updated") ||
        lowerMsg.includes("updated") ||
        lowerTitle.includes("copied") ||
        lowerMsg.includes("copied") ||
        lowerTitle.includes("applied") ||
        lowerMsg.includes("applied") ||
        lowerTitle.includes("🎉") ||
        lowerMsg.includes("🎉")
      ) {
        type = "success";
      } else if (
        lowerTitle.includes("warn") ||
        lowerMsg.includes("warn") ||
        lowerTitle.includes("unsupported") ||
        lowerMsg.includes("unsupported") ||
        lowerTitle.includes("denied") ||
        lowerMsg.includes("denied") ||
        lowerTitle.includes("blocked") ||
        lowerMsg.includes("blocked") ||
        lowerTitle.includes("restrict") ||
        lowerMsg.includes("restrict")
      ) {
        type = "warning";
      }

      // Clean message formatting
      let toastMessage = message || title || "";
      if (title && message && title !== message && !message.toLowerCase().includes(title.toLowerCase())) {
        toastMessage = `${title}: ${message}`;
      }

      if (global.showToast) {
        global.showToast(toastMessage, type);
      }

      // Execute single button callback immediately if present
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  },
};

export default Alert;
