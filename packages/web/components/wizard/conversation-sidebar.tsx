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
      {/* ======== Double-Bezel 玻璃面板 ======== */}
      <div className="flex h-full flex-col rounded-[1.75rem] border border-white/[0.04] bg-white/[0.01] p-[3px] shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_hsl(var(--glass-highlight))]">
        <div className="flex h-full flex-col rounded-[calc(1.75rem-3px)] border border-white/[0.03] bg-[hsl(240,10%,3%)] p-2 shadow-[inset_0_1px_0_hsl(var(--glass-highlight))]">
          {/* 顶部：新建按钮 · 玻璃药丸 */}
          <div className="shrink-0 px-1 pt-1 pb-2">
            <button
              onClick={newConversation}
              className="group flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.04] bg-white/[0.02] py-2 text-[12px] font-medium text-primary/80 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/[0.08] hover:bg-primary/[0.06] hover:text-primary hover:shadow-[0_0_20px_var(--primary-glow)] active:scale-[0.97]"
            >
              <span className="flex size-4 items-center justify-center rounded-md bg-primary/10 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110">
                <Plus size={9} weight="bold" className="text-primary" />
              </span>
              <span className="font-semibold tracking-wide">新建简历</span>
            </button>
          </div>

          {/* 分割线 */}
          <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

          {/* 会话列表 */}
          {sorted.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5">
              <FileText size={18} weight="light" className="text-foreground-muted/10" />
              <p className="text-center text-[11px] text-foreground-muted/20">
                暂无会话
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
      </div>
    </aside>
  );
}

/** 单个会话条目 · Ethereal Glass 悬停态 */
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
        className={`relative flex items-start gap-2 rounded-lg px-2.5 py-2 pr-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-[0.98] ${
          isActive
            ? "bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
            : "hover:bg-white/[0.02]"
        }`}
      >
        {/* 活跃指示条 · 左缘辉光 */}
        {isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary shadow-[0_0_10px_var(--primary-glow-strong)]" />
        )}

        <span className="mt-0.5 shrink-0">
          <FileText
            size={13}
            weight={isActive ? "fill" : "light"}
            className={isActive ? "text-primary/70" : "text-foreground-dim/40"}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[11px] leading-relaxed ${
              isActive ? "font-medium text-foreground/90" : "text-foreground-dim/50"
            }`}
          >
            {title}
          </p>
          <p className="mt-0.5 text-[10px] text-foreground-muted/25">
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
        className="absolute right-1.5 top-2 flex size-5 items-center justify-center rounded-md opacity-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/item:opacity-100 hover:bg-destructive/[0.06]"
        title="删除会话"
      >
        <X size={10} className="text-foreground-muted/25 transition-colors duration-300 group-hover/item:hover:text-destructive/50" />
      </button>
    </div>
  );
}
