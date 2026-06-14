"use client";
import { useWizardStore, type WizardConversation } from "@/lib/stores/wizard-store";
import { Plus, FileText, X } from "@phosphor-icons/react";

export function ConversationSidebar() {
  const conversations = useWizardStore((s) => s.conversations);
  const activeConversationId = useWizardStore((s) => s.activeConversationId);
  const newConversation = useWizardStore((s) => s.newConversation);
  const switchConversation = useWizardStore((s) => s.switchConversation);
  const deleteConversation = useWizardStore((s) => s.deleteConversation);

  const sorted = [...conversations].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <aside className="flex w-[264px] shrink-0 flex-col px-2 py-3">
      {/* ======== 结构面板 · Double-Bezel 替换 ======== */}
      <div className="flex h-full flex-col border-2 border-foreground/10 bg-card p-2">
        {/* 顶部：新建按钮 */}
        <div className="shrink-0 px-1 pt-1 pb-2">
          <button
            onClick={newConversation}
            className="group flex w-full items-center justify-center gap-2 border-2 border-foreground/10 bg-transparent py-2 font-mono text-[12px] font-bold text-foreground/60 uppercase tracking-wider transition-colors duration-150 hover:border-foreground hover:text-foreground"
          >
            <span className="flex size-4 items-center justify-center border border-foreground/20 transition-colors duration-150 group-hover:border-foreground">
              <Plus size={9} weight="bold" className="text-foreground/60 group-hover:text-foreground" />
            </span>
            <span>NEW RESUME</span>
          </button>
        </div>

        {/* 分割线 */}
        <div className="mx-3 h-px bg-foreground/10" />

        {/* 会话列表 */}
        {sorted.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5">
            <FileText size={18} weight="light" className="text-foreground-muted/15" />
            <p className="font-mono text-[11px] text-foreground-muted/20 uppercase tracking-wider">
              NO SESSIONS
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-1 py-2">
            {sorted.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSwitch={() => switchConversation(conv.id)}
                onDelete={() => deleteConversation(conv.id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/** 单个会话条目 · Industrial 悬停态 */
function ConversationItem({
  conversation,
  isActive,
  onSwitch,
  onDelete,
}: {
  conversation: WizardConversation;
  isActive: boolean;
  onSwitch: () => void;
  onDelete: () => void;
}) {
  const title = conversation.name || "未命名简历";

  return (
    <div className="group/item relative my-px">
      <div
        role="button"
        tabIndex={0}
        onClick={onSwitch}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSwitch();
        }}
        className={`relative flex items-start gap-2 px-2.5 py-2 pr-8 transition-colors duration-150 cursor-pointer ${
          isActive
            ? "bg-foreground/5 border-l-4 border-accent"
            : "border-l-4 border-transparent hover:bg-foreground/5"
        }`}
      >
        <span className="mt-0.5 shrink-0">
          <FileText
            size={13}
            weight={isActive ? "fill" : "light"}
            className={isActive ? "text-foreground/70" : "text-foreground-muted/30"}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-mono text-[11px] leading-relaxed uppercase tracking-wider ${
              isActive ? "font-bold text-foreground" : "text-foreground-muted/50"
            }`}
          >
            {title}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-foreground-muted/25">
            {new Date(conversation.createdAt).toLocaleDateString("zh-CN")}
          </p>
        </div>
      </div>

      {/* 删除按钮 · 仅悬停可见 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-1.5 top-2 flex size-5 items-center justify-center border border-transparent opacity-0 transition-all duration-150 group-hover/item:opacity-100 hover:border-accent hover:bg-accent/10"
        title="删除会话"
      >
        <X size={10} className="text-foreground-muted/25 transition-colors duration-150 group-hover/item:hover:text-accent" />
      </button>
    </div>
  );
}
