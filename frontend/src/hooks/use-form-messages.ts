"use client";

import { useCallback, useState } from "react";

export function useFormMessages() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const clearError = useCallback(() => {
    if (error) setError("");
  }, [error]);

  return {
    error,
    success,
    setError,
    setSuccess,
    clearMessages,
    clearError,
  };
}
