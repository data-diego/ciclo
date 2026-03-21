import type { ReactNode } from "react";

// --- WhatsApp Status Bar ---
export function WAStatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1 -mb-1 bg-wa-teal-dark text-white text-[11px]">
      <span className="font-medium">{time}</span>
      <div className="flex items-center gap-1">
        {/* Signal */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 20h2V8H2v12zm4 0h2V4H6v16zm4 0h2v-8h-2v8zm4 0h2V9h-2v11zm4 0h2V2h-2v18z" />
        </svg>
        {/* Wifi */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
        </svg>
        {/* Battery */}
        <svg width="14" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 5H7a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4zm2 10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6zm3-7v8h1a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-1z" />
        </svg>
      </div>
    </div>
  );
}

// --- WhatsApp Chat Header ---
export interface WAMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface WAHeaderProps {
  name: string;
  avatar?: ReactNode;
  subtitle?: string;
  verified?: boolean;
  onBack?: () => void;
  onAvatarClick?: () => void;
  onNameClick?: () => void;
  onPhoneClick?: () => void;
  onMenuClick?: () => void;
}

export function WAHeader({
  name,
  avatar,
  subtitle,
  verified,
  onBack,
  onAvatarClick,
  onNameClick,
  onPhoneClick,
  onMenuClick,
}: WAHeaderProps) {
  return (
    <div className="flex items-center gap-3 bg-wa-teal-dark text-white px-3 py-2">
      {/* Back arrow */}
      {onBack && (
        <button onClick={onBack} className="hover:opacity-80 transition-opacity">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0 ${onAvatarClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
        onClick={onAvatarClick}
      >
        {avatar || (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="white"
            opacity="0.6"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>

      {/* Name & subtitle */}
      <div className={`flex-1 min-w-0 ${onNameClick ? "cursor-pointer" : ""}`} onClick={onNameClick}>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-[15px] truncate">{name}</span>
          {verified && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#53BDEB"
            >
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-white/70 truncate">{subtitle}</p>
        )}
      </div>

      {/* Phone icon */}
      <button
        onClick={onPhoneClick}
        className={onPhoneClick ? "hover:opacity-80 cursor-pointer" : ""}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="white"
          opacity="0.9"
        >
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
        </svg>
      </button>

      {/* Three-dot menu button */}
      <button
        onClick={onMenuClick}
        className={onMenuClick ? "hover:opacity-80 cursor-pointer p-1" : "p-1"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="white"
          opacity="0.9"
        >
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>
    </div>
  );
}

// --- Chat body wrapper ---
export function WAChatBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto wa-chat-bg px-3 py-2 space-y-1.5">
      {children}
    </div>
  );
}

// --- Dropdown menu overlay (rendered at chat container level) ---
export function WADropdownMenu({
  items,
  onClose,
}: {
  items: WAMenuItem[];
  onClose: () => void;
}) {
  return (
    <>
      <div className="absolute inset-0 z-40" onClick={onClose} />
      <div className="absolute right-2 top-20 z-50 bg-white rounded-lg shadow-xl py-1 min-w-[180px]">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => { onClose(); item.onClick(); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] transition-colors cursor-pointer ${
              item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-g-800 hover:bg-g-100"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// --- Date divider ---
export function WADateDivider({ text }: { text: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="bg-white/80 text-[11px] text-g-500 px-3 py-1 rounded-lg shadow-sm">
        {text}
      </span>
    </div>
  );
}

// WhatsApp-style sender name colors (deterministic by name)
const SENDER_COLORS = [
  "#1F7A54", // teal-green
  "#6B45BC", // purple
  "#C4451C", // red-orange
  "#0E7490", // cyan
  "#B45309", // amber
  "#7C3AED", // violet
  "#0369A1", // sky blue
  "#BE185D", // pink
  "#15803D", // green
  "#9333EA", // purple bright
];

function getSenderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % SENDER_COLORS.length;
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

// --- Incoming message (from business / other person) ---
interface WAMessageInProps {
  children: ReactNode;
  time?: string;
  sender?: string;
  footer?: string;
  buttons?: { label: string; icon?: ReactNode; onClick?: () => void; disabled?: boolean }[];
}

export function WAMessageIn({
  children,
  time,
  sender,
  footer,
  buttons,
}: WAMessageInProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-2.5 py-1.5 relative">
          {/* Tail */}
          <div
            className="absolute -left-2 top-0 w-0 h-0"
            style={{
              borderTop: "0px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "8px solid white",
            }}
          />
          {sender && (
            <p className="text-[12px] font-semibold mb-0.5" style={{ color: getSenderColor(sender) }}>
              {sender}
            </p>
          )}
          <div className="text-[14px] text-g-900 leading-snug">{children}</div>
          {footer && (
            <p className="text-[12px] text-g-400 mt-1">{footer}</p>
          )}
          <div className="flex justify-end mt-0.5">
            <span className="text-[11px] text-g-400">{time || "now"}</span>
          </div>
        </div>
        {/* WhatsApp-style action buttons below the bubble */}
        {buttons && buttons.length > 0 && (
          <div className="mt-0.5 space-y-px">
            {buttons.map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                disabled={btn.disabled}
                className={`
                  w-full bg-white rounded-lg shadow-sm
                  px-3 py-2.5 text-[14px] font-medium
                  flex items-center justify-center gap-2
                  transition-colors
                  ${btn.disabled
                    ? "text-g-400 cursor-not-allowed opacity-60"
                    : "text-wa-teal hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}
                `}
              >
                {btn.label}
                {btn.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Outgoing message (from the user) ---
interface WAMessageOutProps {
  children: ReactNode;
  time?: string;
  read?: boolean;
}

export function WAMessageOut({
  children,
  time,
  read = true,
}: WAMessageOutProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div className="bg-wa-bubble-out rounded-lg rounded-tr-none shadow-sm px-2.5 py-1.5 relative">
          {/* Tail */}
          <div
            className="absolute -right-2 top-0 w-0 h-0"
            style={{
              borderTop: "0px solid transparent",
              borderBottom: "8px solid transparent",
              borderLeft: "8px solid #DCF8C6",
            }}
          />
          <div className="text-[14px] text-g-900 leading-snug">{children}</div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className="text-[11px] text-g-400">{time || "now"}</span>
            {/* Read ticks */}
            <svg
              width="16"
              height="11"
              viewBox="0 0 16 11"
              fill={read ? "#53BDEB" : "#9AA4B2"}
            >
              <path d="M11.07 0.73L4.53 7.27L1.77 4.51L0.36 5.92L4.53 10.09L12.48 2.14L11.07 0.73Z" />
              <path d="M14.07 0.73L7.53 7.27L6.83 6.57L5.42 7.98L7.53 10.09L15.48 2.14L14.07 0.73Z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- System message (encryption notice etc) ---
export function WASystemMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center py-1">
      <div className="bg-[#FFF3C4]/80 text-[11px] text-g-600 px-3 py-1.5 rounded-lg shadow-sm max-w-[90%] text-center leading-snug">
        {children}
      </div>
    </div>
  );
}

// --- Link preview card inside a message ---
interface WALinkPreviewProps {
  title: string;
  description?: string;
  domain?: string;
  color?: string;
  onClick?: () => void;
}

export function WALinkPreview({
  title,
  description,
  domain,
  color = "#7C3AED",
  onClick,
}: WALinkPreviewProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-full text-left rounded-md overflow-hidden mb-1
        border-l-4 bg-g-50 hover:bg-g-100
        transition-colors cursor-pointer
      "
      style={{ borderLeftColor: color }}
    >
      <div className="px-2.5 py-2">
        <p className="text-[13px] font-semibold text-g-900 leading-snug">
          {title}
        </p>
        {description && (
          <p className="text-[12px] text-g-500 mt-0.5 leading-snug">
            {description}
          </p>
        )}
        {domain && (
          <p className="text-[11px] text-g-400 mt-0.5">{domain}</p>
        )}
      </div>
    </button>
  );
}

// --- Typing indicator ---
export function WATyping() {
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-3 py-2.5 relative">
        <div
          className="absolute -left-2 top-0 w-0 h-0"
          style={{
            borderTop: "0px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: "8px solid white",
          }}
        />
        <div className="flex gap-1 items-center">
          <div
            className="w-2 h-2 bg-g-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-g-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-g-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Input bar at bottom ---
interface WAInputBarProps {
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (value: string) => void;
  onEmojiToggle?: () => void;
  emojiActive?: boolean;
}

export function WAInputBar({
  disabled,
  placeholder = "Type a message",
  value,
  onChange,
  onSend,
  onEmojiToggle,
  emojiActive,
}: WAInputBarProps) {
  const isActive = !disabled && onChange;
  const hasText = (value || "").trim().length > 0;

  return (
    <div className="flex items-center gap-2 bg-wa-input px-2 py-3">
      {/* Emoji toggle */}
      <button
        onClick={onEmojiToggle}
        className={`shrink-0 transition-colors ${emojiActive ? "text-wa-teal" : ""}`}
        disabled={!onEmojiToggle}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={emojiActive ? "#128C7E" : "#9AA4B2"}
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <circle cx="9" cy="9.5" r="1.2" fill={emojiActive ? "#128C7E" : "#9AA4B2"} stroke="none" />
          <circle cx="15" cy="9.5" r="1.2" fill={emojiActive ? "#128C7E" : "#9AA4B2"} stroke="none" />
        </svg>
      </button>

      {isActive ? (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hasText && onSend) onSend(value!.trim());
          }}
          placeholder={placeholder}
          className="
            flex-1 bg-white rounded-full px-3 py-1.5 text-[14px]
            text-g-900 placeholder:text-g-400
            focus:outline-none
          "
          autoFocus
        />
      ) : (
        <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[14px] text-g-400">
          {placeholder}
        </div>
      )}

      {!hasText && (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9AA4B2"
          strokeWidth="2"
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      )}

      {/* Send or Mic */}
      {hasText ? (
        <button
          onClick={() => onSend && value ? onSend(value.trim()) : undefined}
          className="w-9 h-9 rounded-full bg-wa-teal flex items-center justify-center shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      ) : (
        <div className="w-9 h-9 rounded-full bg-wa-teal flex items-center justify-center shrink-0 pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// --- Toast notification ---
interface WAToastProps {
  message: string;
  visible: boolean;
}

export function WAToast({ message, visible }: WAToastProps) {
  return (
    <div
      className={`
        absolute bottom-14 left-1/2 -translate-x-1/2
        bg-g-800 text-white text-[13px] px-4 py-2 rounded-lg shadow-lg
        transition-all duration-300 whitespace-nowrap
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}
      `}
    >
      {message}
    </div>
  );
}
