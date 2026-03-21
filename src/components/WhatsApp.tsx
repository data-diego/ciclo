import type { ReactNode } from "react";

// --- WhatsApp Status Bar ---
export interface StatusBarNotification {
  id: string;
  icon: ReactNode;
  badge?: number | boolean;
  buzzing?: boolean;
  onClick?: () => void;
}

export function WAStatusBar({ notifications, className }: { notifications?: StatusBarNotification[]; className?: string }) {
  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className={`flex items-center justify-between px-4 pt-3 pb-1 -mb-1 text-white text-[11px] ${className || "bg-wa-teal-dark"}`}>
      <span className="font-medium">{time}</span>
      <div className="flex items-center gap-1.5">
        {/* App notifications (only show if badge or buzzing) */}
        {notifications?.filter((n) => n.buzzing || (n.badge != null && n.badge !== false && n.badge !== 0)).map((n) => (
          <button
            key={n.id}
            onClick={n.onClick}
            className={`relative cursor-pointer hover:opacity-80 transition-opacity ${n.buzzing ? "animate-buzz" : ""}`}
          >
            {n.icon}
            {n.badge != null && n.badge !== false && n.badge !== 0 && (
              <div className="absolute -top-1 -right-1.5 min-w-[10px] h-[10px] px-0.5 rounded-full bg-red-500 flex items-center justify-center">
                {typeof n.badge === "number" && (
                  <span className="text-white text-[6px] font-bold leading-none">{n.badge > 9 ? "9+" : n.badge}</span>
                )}
              </div>
            )}
          </button>
        ))}
        {notifications?.some((n) => n.buzzing || (n.badge != null && n.badge !== false && n.badge !== 0)) && <div className="w-px h-3 bg-white/30" />}
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
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center -ml-1 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer">
          <svg
            width="22"
            height="22"
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

// --- Rules & Incentives Modal ---
export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-4 mx-6 max-w-sm w-full shadow-xl max-h-[80%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-bold text-g-900 mb-3">Reglas e Incentivos</h3>

        <section className="mb-3">
          <h4 className="text-[13px] font-semibold text-g-800 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Cómo funciona
          </h4>
          <ul className="text-[12px] text-g-700 leading-relaxed space-y-1 list-disc pl-4">
            <li>Cada semana decides cuánto pagar: completo, parcial o nada</li>
            <li>Los pagos son privados, nadie ve lo que pagaste</li>
            <li>Tu negocio genera eventos que afectan tu saldo</li>
            <li>Puedes enviar solidario ($50 a $500, en múltiplos de $50) a quien lo necesite</li>
          </ul>
        </section>

        <section className="mb-3">
          <h4 className="text-[13px] font-semibold text-g-800 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Puntuación
          </h4>
          <ul className="text-[12px] text-g-700 leading-relaxed space-y-1 list-none pl-0">
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ok-600 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              <span><span className="font-medium">Pago completo:</span> +100 pts</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-warn-600 shrink-0"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span><span className="font-medium">Pago parcial:</span> +20 pts</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-err-600 shrink-0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span><span className="font-medium">No pagar:</span> −40 pts</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span><span className="font-medium">Enviar solidario:</span> +30 pts</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <span><span className="font-medium">Inversión (evento):</span> +25 pts</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span><span className="font-medium">Familia (evento):</span> +20 pts</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ok-600 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span><span className="font-medium">Grupo paga completo:</span> +60 pts para todos</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-err-600 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span><span className="font-medium">Alguien no paga:</span> −20 pts para todos</span>
            </li>
          </ul>
        </section>

        <section className="mb-3">
          <h4 className="text-[13px] font-semibold text-g-800 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-err-600 shrink-0"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Mora
          </h4>
          <p className="text-[12px] text-g-700 leading-relaxed">
            Si no pagas, se acumula mora: $60 la primera semana, y $30 más por cada semana consecutiva sin pagar ($60, $90, $120…).
          </p>
        </section>

        <section className="mb-3">
          <h4 className="text-[13px] font-semibold text-g-800 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Solidario
          </h4>
          <p className="text-[12px] text-g-700 leading-relaxed">
            Puedes enviar entre $50 y $500 (en incrementos de $50) a cualquier compañera. Es privado, solo ustedes dos lo saben. También puedes pedir solidario.
          </p>
        </section>

        <section className="mb-3">
          <h4 className="text-[13px] font-semibold text-g-800 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
            Créditos
          </h4>
          <p className="text-[12px] text-g-700 leading-relaxed">
            Tamaños: Pequeño ($2,000), Mediano ($3,500) o Grande ($5,000). La tasa varía según la dificultad: $65, $75 u $85 pesos por cada mil prestados.
          </p>
        </section>

        <section className="mb-3">
          <h4 className="text-[13px] font-semibold text-g-800 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Objetivo secreto
          </h4>
          <p className="text-[12px] text-g-700 leading-relaxed">
            Al inicio se te asigna un objetivo secreto con bonus de +300 a +500 pts. Se revela en los resultados al final del juego.
          </p>
        </section>

        <section className="mb-3">
          <h4 className="text-[13px] font-semibold text-g-800 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600 shrink-0"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/></svg>
            Graduación
          </h4>
          <p className="text-[12px] text-g-700 leading-relaxed">
            Te gradúas si terminas de pagar tu crédito completo. Igual que en la vida real, completar tu ciclo es el verdadero logro.
          </p>
        </section>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Ciclo Info Modal ---
export function CicloInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <img src="/ciclogo.png" alt="CICLO" className="w-10 h-10 rounded-full" />
          <div>
            <h3 className="text-[16px] font-bold text-g-900 capitalize">Ciclo</h3>
            <p className="text-[11px] text-g-500 -mt-0.5">Hackatón Grupalia 2026</p>
          </div>
        </div>
        <p className="text-[13px] text-g-700 leading-relaxed mb-3">
          CICLO es un juego para entender qué es un crédito grupal y lo que
          viven nuestras clientas. Simulas que tienes tu propio negocito,
          pides tu crédito y lo vas pagando semana a semana mientras
          manejas lo que pasa en tu negocio.
        </p>
        <p className="text-[11px] text-g-400 text-center">
          Es un ejercicio de empatía, igualito que en la vida real
        </p>
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
