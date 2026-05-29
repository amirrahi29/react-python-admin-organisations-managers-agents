import type { AgentInfo, ManagerInfo, OrganizationInfo, RoleHierarchyMember } from "@/lib/auth/constants";
import { getAgentRoleLabel } from "@/lib/team/constants";

export type RoleHierarchyChain = {
  nodes: RoleHierarchyMember[];
};

export function getOrganizationHierarchyChain(organization: OrganizationInfo): RoleHierarchyChain {
  return {
    nodes: [
      organization.admin,
      { role: "Organization", name: organization.name, email: organization.email },
    ],
  };
}

export function getAgentHierarchyChain(agent: AgentInfo): RoleHierarchyChain {
  return {
    nodes: [
      agent.admin,
      agent.organization,
      agent.manager,
      {
        role: getAgentRoleLabel(),
        name: agent.name,
        email: agent.email,
      },
    ],
  };
}

export function getManagerHierarchyChain(manager: ManagerInfo): RoleHierarchyChain {
  return {
    nodes: [
      manager.admin,
      manager.organization,
      { role: "Manager", name: manager.name, email: manager.email },
    ],
  };
}
