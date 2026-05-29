"use client";

import { createAgentTeamClient } from "@/lib/team/create-team-client";

const client = createAgentTeamClient("/api/manager/agents");

export const listManagerAgents = client.list;
export const createManagerAgent = client.create;
export const getManagerAgent = client.get;
export const updateManagerAgent = client.update;
export const updateManagerAgentStatus = client.updateStatus;
export const deleteManagerAgent = client.remove;
