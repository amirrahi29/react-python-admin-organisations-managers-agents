"use client";

import { Avatar } from "@/components/ui/avatar";
import { RoleHierarchyHover } from "@/components/profile/role-hierarchy-hover";
import type { RoleHierarchyChain } from "@/lib/auth/hierarchy";

type ProfileAvatarSize = "sm" | "md" | "lg";

type ProfileAvatarProps = {
  name: string;
  size?: ProfileAvatarSize;
  hierarchy?: RoleHierarchyChain;
  placement?: "bottom-start" | "bottom-end";
  className?: string;
};

export function ProfileAvatar({
  name,
  size = "md",
  hierarchy,
  placement = "bottom-start",
  className,
}: ProfileAvatarProps) {
  const avatar = <Avatar name={name} size={size} className={className} />;

  if (!hierarchy?.nodes.length) {
    return avatar;
  }

  return (
    <RoleHierarchyHover nodes={hierarchy.nodes} placement={placement}>
      {avatar}
    </RoleHierarchyHover>
  );
}
