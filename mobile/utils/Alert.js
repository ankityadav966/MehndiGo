export const Alert = {
  alert: (title, message, buttons, options) => {
    // Show modal if we have multiple buttons, or if there is 1 button that has an onPress callback
    const needsModal =
      (buttons && buttons.length > 1) ||
      (buttons && buttons.length === 1 && buttons[0].onPress);

    if (needsModal) {
      // Find confirm and cancel button structures
      const cancelBtn =
        buttons.find((b) => b.style === "cancel") ||
        (buttons.length > 1 ? buttons[0] : null);
      const confirmBtn =
        buttons.find((b) => b.style !== "cancel") ||
        (buttons.length > 1 ? buttons[1] : buttons[0]);

      // Determine modal theme/type based on title & text keywords
      let type = "info";
      const lowerTitle = (title || "").toLowerCase();
      const lowerMsg = (message || "").toLowerCase();

      if (
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
        lowerTitle.includes("gallery")
      ) {
        type = "warning";
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
          type: type,
          dismissible: options?.cancelable !== false,
          onConfirm: () => confirmBtn?.onPress?.(),
          onCancel: cancelBtn ? () => cancelBtn?.onPress?.() : null,
        });
      }
    } else {
      // Render as a Toast
      const lowerTitle = (title || "").toLowerCase();
      const lowerMsg = (message || "").toLowerCase();

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
      } else if (lowerTitle.includes("warn") || lowerMsg.includes("warn")) {
        type = "warning";
      }

      // Format clean message for Toast (omit title if redundant or join with colon)
      let toastMessage = message || title || "";

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
