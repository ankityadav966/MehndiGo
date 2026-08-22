import React, { useState, useEffect } from "react";
import CustomModal from "./CustomModal";

export default function GlobalModal() {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState({
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "info",
    loading: false,
    dismissible: true,
    onConfirm: null,
    onCancel: null,
  });

  useEffect(() => {
    global.showConfirmationModal = (opts) => {
      setOptions({
        title: opts.title || "",
        description: opts.description || "",
        confirmText: opts.confirmText || "Confirm",
        cancelText: opts.cancelText || "Cancel",
        type: opts.type || "info",
        loading: false,
        dismissible: opts.dismissible !== false,
        onConfirm: opts.onConfirm,
        onCancel: opts.onCancel,
      });
      setVisible(true);
    };

    return () => {
      global.showConfirmationModal = null;
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
  };

  const handleConfirm = async () => {
    if (options.onConfirm) {
      const result = options.onConfirm();
      // Handle async/promise confirm actions
      if (result instanceof Promise) {
        setOptions((prev) => ({ ...prev, loading: true }));
        try {
          await result;
        } catch (err) {
          if (__DEV__) console.log("[GlobalModal] Async confirmation error:", err);
        } finally {
          setOptions((prev) => ({ ...prev, loading: false }));
          setVisible(false);
        }
      } else {
        setVisible(false);
      }
    } else {
      setVisible(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    if (options.onCancel) {
      options.onCancel();
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={handleClose}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      type={options.type}
      loading={options.loading}
      dismissible={options.dismissible}
    />
  );
}
