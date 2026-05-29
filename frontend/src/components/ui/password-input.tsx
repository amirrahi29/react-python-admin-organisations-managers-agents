"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  maxLength?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function PasswordInput({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = "••••••••",
  autoComplete,
  className,
  maxLength,
  onKeyDown,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!value) {
      setVisible(false);
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        autoComplete={autoComplete}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        className={cn("app-input pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        className="app-icon-btn absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
