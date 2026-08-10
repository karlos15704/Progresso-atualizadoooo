import React from "react";
import { NexusPageHeader } from "./layout/NexusPageHeader";

interface ViewHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function ViewHeader({ title, subtitle, badge, icon, children }: ViewHeaderProps) {
  return (
    <NexusPageHeader
      title={title}
      subtitle={subtitle}
      badge={badge}
      icon={icon}
      actions={children}
    />
  );
}
