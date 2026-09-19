import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

type Props = {
  icon: Icon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <section className="empty-state">
      <span className="empty-icon"><Icon aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

