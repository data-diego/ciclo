import { useState, useRef } from "react";
import type { CustomSticker } from "../module_bindings/types";

// --- Built-in sticker packs (static files in public/stickers/) ---

export interface Sticker {
  id: string;
  name: string;
  src: string; // URL path to image
}

const GRUPALIA_STICKERS: Sticker[] = [
  { id: "grupalia:pago", name: "Pago!", src: "/stickers/grupalia/pago.svg" },
  { id: "grupalia:abrazo", name: "Abrazo", src: "/stickers/grupalia/abrazo.svg" },
  { id: "grupalia:fuerza", name: "Fuerza", src: "/stickers/grupalia/fuerza.svg" },
  { id: "grupalia:presidenta", name: "Presidenta", src: "/stickers/grupalia/presidenta.svg" },
  { id: "grupalia:negocio", name: "Mi negocio", src: "/stickers/grupalia/negocio.svg" },
  { id: "grupalia:dinero", name: "Dinero", src: "/stickers/grupalia/dinero.svg" },
  { id: "grupalia:no-puedo", name: "No puedo", src: "/stickers/grupalia/no-puedo.svg" },
  { id: "grupalia:gracias", name: "Gracias", src: "/stickers/grupalia/gracias.svg" },
  { id: "grupalia:corazon", name: "Corazon", src: "/stickers/grupalia/corazon.svg" },
  { id: "grupalia:vamos", name: "Vamos!", src: "/stickers/grupalia/vamos.svg" },
  { id: "grupalia:estrella", name: "Estrella", src: "/stickers/grupalia/estrella.svg" },
  { id: "grupalia:fiesta", name: "Fiesta", src: "/stickers/grupalia/fiesta.svg" },
];

const REACTION_STICKERS: Sticker[] = [
  { id: "reactions:jaja", name: "Jaja", src: "/stickers/reactions/jaja.svg" },
  { id: "reactions:ay-no", name: "Ay no", src: "/stickers/reactions/ay-no.svg" },
  { id: "reactions:mmm", name: "Mmm", src: "/stickers/reactions/mmm.svg" },
  { id: "reactions:ojo", name: "Ojo", src: "/stickers/reactions/ojo.svg" },
  { id: "reactions:bravo", name: "Bravo", src: "/stickers/reactions/bravo.svg" },
  { id: "reactions:ok", name: "OK", src: "/stickers/reactions/ok.svg" },
  { id: "reactions:no", name: "No", src: "/stickers/reactions/no.svg" },
  { id: "reactions:shh", name: "Shh", src: "/stickers/reactions/shh.svg" },
  { id: "reactions:hmm", name: "Hmm", src: "/stickers/reactions/hmm.svg" },
  { id: "reactions:yay", name: "Yay", src: "/stickers/reactions/yay.svg" },
  { id: "reactions:cafe", name: "Cafe", src: "/stickers/reactions/cafe.svg" },
  { id: "reactions:rosa", name: "Rosa", src: "/stickers/reactions/rosa.svg" },
];

export const ALL_BUILTIN_STICKERS = [...GRUPALIA_STICKERS, ...REACTION_STICKERS];

// Quick emoji grid for inline insertion
const EMOJI_ROWS = [
  ["😀", "😂", "🥰", "😎", "🤩", "😇", "🤗", "🫣"],
  ["💪", "🔥", "💰", "🎉", "❤️", "⭐", "👑", "🙏"],
  ["👍", "👎", "👏", "👀", "🤔", "😱", "😢", "😤"],
  ["🏪", "🛒", "💇", "🌮", "👗", "🧵", "🍞", "☕"],
];

// --- Resolve a sticker ID to its image src ---

export function resolveStickerSrc(
  stickerId: string,
  customStickers: readonly CustomSticker[]
): string | null {
  // Check built-in
  const builtin = ALL_BUILTIN_STICKERS.find((s) => s.id === stickerId);
  if (builtin) return builtin.src;

  // Check custom (id format: "custom:<u64>")
  if (stickerId.startsWith("custom:")) {
    const customId = BigInt(stickerId.replace("custom:", ""));
    const custom = customStickers.find((s) => s.id === customId);
    if (custom) return custom.imageData;
  }

  return null;
}

// --- Components ---

interface StickerPickerProps {
  onSelectSticker: (stickerId: string) => void;
  onSelectEmoji: (emoji: string) => void;
  onUploadSticker: (name: string, imageData: string) => void;
  onClose: () => void;
  customStickers: readonly CustomSticker[];
}

export function StickerPicker({
  onSelectSticker,
  onSelectEmoji,
  onUploadSticker,
  onClose,
  customStickers,
}: StickerPickerProps) {
  const [tab, setTab] = useState<"grupalia" | "reactions" | "custom" | "emoji">("grupalia");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 256 * 1024) {
      alert("Sticker too large (max 256KB)");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Must be an image (PNG, GIF, WebP)");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 20);
      onUploadSticker(name, dataUrl);
      setUploading(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const tabs = [
    { key: "grupalia" as const, label: "Grupalia" },
    { key: "reactions" as const, label: "Reactions" },
    { key: "custom" as const, label: `Custom${customStickers?.length ? ` (${customStickers.length})` : ""}` },
    { key: "emoji" as const, label: "Emoji" },
  ];

  return (
    <div className="absolute bottom-full left-0 right-0 bg-white border-t border-g-200 shadow-lg z-10">
      {/* Tabs */}
      <div className="flex border-b border-g-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
              tab === t.key
                ? "text-wa-teal border-b-2 border-wa-teal"
                : "text-g-400"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="px-2 py-2 text-g-400 hover:text-g-600"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="h-[180px] overflow-y-auto p-2">
        {/* Grupalia pack */}
        {tab === "grupalia" && (
          <StickerGrid
            stickers={GRUPALIA_STICKERS}
            onSelect={(s) => { onSelectSticker(s.id); onClose(); }}
          />
        )}

        {/* Reactions pack */}
        {tab === "reactions" && (
          <StickerGrid
            stickers={REACTION_STICKERS}
            onSelect={(s) => { onSelectSticker(s.id); onClose(); }}
          />
        )}

        {/* Custom uploaded stickers */}
        {tab === "custom" && (
          <div>
            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full mb-2 py-2 px-3 border-2 border-dashed border-g-200 rounded-lg text-[12px] text-g-500 hover:border-wa-teal hover:text-wa-teal transition-colors"
            >
              {uploading ? "Uploading..." : "+ Upload sticker (PNG, GIF, WebP · max 256KB)"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/gif,image/webp,image/jpeg"
              className="hidden"
              onChange={handleFileUpload}
            />

            {!customStickers?.length ? (
              <p className="text-center text-[12px] text-g-400 py-6">
                No custom stickers yet. Upload one!
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {customStickers.map((s) => (
                  <button
                    key={s.id.toString()}
                    onClick={() => {
                      onSelectSticker(`custom:${s.id}`);
                      onClose();
                    }}
                    className="flex flex-col items-center p-1.5 rounded-lg hover:bg-g-50 active:bg-g-100 transition-colors"
                    title={s.name}
                  >
                    <img
                      src={s.imageData}
                      alt={s.name}
                      className="w-12 h-12 object-contain"
                    />
                    <span className="text-[8px] text-g-400 mt-0.5 truncate w-full text-center">
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Emoji */}
        {tab === "emoji" && (
          <div className="space-y-1">
            {EMOJI_ROWS.map((row, i) => (
              <div key={i} className="flex justify-around">
                {row.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onSelectEmoji(emoji)}
                    className="text-2xl p-1 rounded hover:bg-g-50 active:bg-g-100 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sticker grid (reusable for built-in packs) ---

function StickerGrid({
  stickers,
  onSelect,
}: {
  stickers: Sticker[];
  onSelect: (sticker: Sticker) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {stickers.map((sticker) => (
        <button
          key={sticker.id}
          onClick={() => onSelect(sticker)}
          className="flex flex-col items-center p-1.5 rounded-lg hover:bg-g-50 active:bg-g-100 transition-colors"
          title={sticker.name}
        >
          <img
            src={sticker.src}
            alt={sticker.name}
            className="w-12 h-12 object-contain"
          />
          <span className="text-[8px] text-g-400 mt-0.5 truncate w-full text-center">
            {sticker.name}
          </span>
        </button>
      ))}
    </div>
  );
}

// --- Sticker message display in chat ---

export function StickerBubble({
  stickerId,
  customStickers,
}: {
  stickerId: string;
  customStickers: readonly CustomSticker[];
}) {
  const src = resolveStickerSrc(stickerId, customStickers);

  if (!src) {
    // Fallback for unknown stickers
    return <span className="text-g-400 text-[12px]">[sticker: {stickerId}]</span>;
  }

  return (
    <div className="py-1">
      <img src={src} alt={stickerId} className="w-24 h-24 object-contain" />
    </div>
  );
}
