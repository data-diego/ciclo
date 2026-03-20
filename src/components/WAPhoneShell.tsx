import type { ReactNode } from "react";
import { Android } from "./Android";
import {
  WAStatusBar,
  WAHeader,
  WAChatBody,
  WAInputBar,
  WAToast,
} from "./WhatsApp";

interface WAPhoneShellProps {
  headerName: string;
  headerSubtitle?: string;
  headerAvatar?: ReactNode;
  children: ReactNode;
  inputBar?: ReactNode;
  toast?: { message: string; visible: boolean };
}

export function WAPhoneShell({
  headerName,
  headerSubtitle,
  headerAvatar,
  children,
  inputBar,
  toast,
}: WAPhoneShellProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <Android className="drop-shadow-2xl">
        <div className="flex flex-col h-full bg-white text-g-900 relative">
          <WAStatusBar />
          <WAHeader
            name={headerName}
            subtitle={headerSubtitle}
            avatar={headerAvatar}
          />
          <WAChatBody>{children}</WAChatBody>
          {inputBar ?? <WAInputBar disabled placeholder="Type a message" />}
          {toast && <WAToast message={toast.message} visible={toast.visible} />}
        </div>
      </Android>
    </div>
  );
}
