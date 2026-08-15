/**
 * 아무것도 없을 때 보여주는 자리
 * 빈 화면을 그냥 두지 않고 무엇을 하면 되는지 알려준다.
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  Icon,
  title,
  description,
  action,
}: {
  Icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/80 px-6 py-14 text-center">
      <Icon className="size-7 text-muted-foreground/60" strokeWidth={1.4} />
      <p className="font-display text-base">{title}</p>
      {description !== undefined && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
