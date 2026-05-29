#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(REPO_ROOT, "docs", "screenshots");
const PASSWORD = "Readme123!";
const ts = Date.now();

async function api(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${BACKEND}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${pathname} failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function createManager(token, { firstName, lastName, email, jobTitle }) {
  return api("/api/managers", {
    method: "POST",
    token,
    body: {
      first_name: firstName,
      last_name: lastName,
      email,
      password: PASSWORD,
      phone: "9876543210",
      job_title: jobTitle,
    },
  });
}

async function createAgent(token, { firstName, lastName, email, managerAccountId, callMode, jobTitle }) {
  return api("/api/agents", {
    method: "POST",
    token,
    body: {
      first_name: firstName,
      last_name: lastName,
      email,
      password: PASSWORD,
      phone: "9876543211",
      job_title: jobTitle,
      manager_account_id: managerAccountId,
      call_mode: callMode,
    },
  });
}

async function ensureDemoUsers() {
  const adminEmail = `readme-admin-${ts}@example.com`;
  const managerOneEmail = `readme-mgr1-${ts}@example.com`;
  const managerTwoEmail = `readme-mgr2-${ts}@example.com`;
  const outboundHumanEmail = `readme-outbound-human-${ts}@example.com`;
  const outboundAiEmail = `readme-outbound-ai-${ts}@example.com`;

  await api("/api/auth/register", {
    method: "POST",
    body: {
      email: adminEmail,
      name: "Demo Admin",
      password: PASSWORD,
      confirm_password: PASSWORD,
    },
  });

  const adminLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: PASSWORD },
  });

  const managerOne = await createManager(adminLogin.access_token, {
    firstName: "Rohan",
    lastName: "Manager",
    email: managerOneEmail,
    jobTitle: "Sales Manager",
  });

  await createManager(adminLogin.access_token, {
    firstName: "Priya",
    lastName: "Manager",
    email: managerTwoEmail,
    jobTitle: "Support Manager",
  });

  await createAgent(adminLogin.access_token, {
    firstName: "Vikram",
    lastName: "Agent",
    email: outboundHumanEmail,
    managerAccountId: managerOne.item.account_id,
    callMode: "human",
    jobTitle: "Outbound Sales Agent",
  });

  await createAgent(adminLogin.access_token, {
    firstName: "Neha",
    lastName: "Agent",
    email: outboundAiEmail,
    managerAccountId: managerOne.item.account_id,
    callMode: "ai",
    jobTitle: "Outbound AI Agent",
  });

  const managerLogin = await api("/api/auth/manager/login", {
    method: "POST",
    body: { email: managerOneEmail, password: PASSWORD },
  });

  const outboundAgentLogin = await api("/api/auth/agent/login", {
    method: "POST",
    body: {
      email: outboundHumanEmail,
      password: PASSWORD,
      call_mode: "human",
    },
  });

  return {
    adminToken: adminLogin.access_token,
    managerToken: managerLogin.access_token,
    outboundAgentToken: outboundAgentLogin.access_token,
  };
}

async function setAuthCookie(page, token, cookieName) {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: cookieName,
      value: token,
      url: FRONTEND,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function screenshotPage(page, routePath, outputFile) {
  await page.goto(`${FRONTEND}${routePath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: outputFile, fullPage: false });
}

async function screenshotPublic(page, routePath, outputFile) {
  await page.context().clearCookies();
  await screenshotPage(page, routePath, outputFile);
}

async function screenshotWithToken(page, token, cookieName, routePath, outputFile) {
  await setAuthCookie(page, token, cookieName);
  await screenshotPage(page, routePath, outputFile);
}

async function screenshotReportingChain(page, token, outputFile) {
  await setAuthCookie(page, token, "agent_token");
  await page.goto(`${FRONTEND}/agent/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const avatar = page.locator(".app-page-wide .app-surface--hover .relative.inline-flex").first();
  await avatar.hover();
  const panel = page.locator(".app-role-hover-panel").first();
  await panel.waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(400);
  await panel.screenshot({ path: outputFile });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const tokens = await ensureDemoUsers();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const shots = [
    ["login-portal.png", () => screenshotPublic(page, "/login", path.join(OUT_DIR, "login-portal.png"))],
    ["agent-login.png", () => screenshotPublic(page, "/agent/login", path.join(OUT_DIR, "agent-login.png"))],
    [
      "admin-dashboard.png",
      () => screenshotWithToken(page, tokens.adminToken, "admin_token", "/admin/dashboard", path.join(OUT_DIR, "admin-dashboard.png")),
    ],
    [
      "admin-attendance.png",
      () =>
        screenshotWithToken(
          page,
          tokens.adminToken,
          "admin_token",
          "/admin/dashboard/attendance",
          path.join(OUT_DIR, "admin-attendance.png"),
        ),
    ],
    [
      "admin-managers.png",
      () => screenshotWithToken(page, tokens.adminToken, "admin_token", "/admin/dashboard/managers", path.join(OUT_DIR, "admin-managers.png")),
    ],
    [
      "admin-agents-outbound.png",
      () =>
        screenshotWithToken(
          page,
          tokens.adminToken,
          "admin_token",
          "/admin/dashboard/agents/outbound",
          path.join(OUT_DIR, "admin-agents-outbound.png"),
        ),
    ],
    [
      "admin-outbound-leads.png",
      () =>
        screenshotWithToken(
          page,
          tokens.adminToken,
          "admin_token",
          "/admin/dashboard/leads/outbound",
          path.join(OUT_DIR, "admin-outbound-leads.png"),
        ),
    ],
    [
      "manager-dashboard.png",
      () =>
        screenshotWithToken(
          page,
          tokens.managerToken,
          "manager_token",
          "/manager/dashboard",
          path.join(OUT_DIR, "manager-dashboard.png"),
        ),
    ],
    [
      "manager-attendance.png",
      () =>
        screenshotWithToken(
          page,
          tokens.managerToken,
          "manager_token",
          "/manager/dashboard/attendance",
          path.join(OUT_DIR, "manager-attendance.png"),
        ),
    ],
    [
      "manager-agents-outbound.png",
      () =>
        screenshotWithToken(
          page,
          tokens.managerToken,
          "manager_token",
          "/manager/dashboard/agents/outbound",
          path.join(OUT_DIR, "manager-agents-outbound.png"),
        ),
    ],
    [
      "agent-dashboard.png",
      () =>
        screenshotWithToken(
          page,
          tokens.outboundAgentToken,
          "agent_token",
          "/agent/dashboard",
          path.join(OUT_DIR, "agent-dashboard.png"),
        ),
    ],
    [
      "agent-attendance.png",
      () =>
        screenshotWithToken(
          page,
          tokens.outboundAgentToken,
          "agent_token",
          "/agent/dashboard/attendance",
          path.join(OUT_DIR, "agent-attendance.png"),
        ),
    ],
    [
      "agent-reporting-chain.png",
      () => screenshotReportingChain(page, tokens.outboundAgentToken, path.join(OUT_DIR, "agent-reporting-chain.png")),
    ],
  ];

  for (const [name, capture] of shots) {
    await capture();
    console.log(`Saved ${name}`);
  }

  await browser.close();
  console.log("Screenshots saved to docs/screenshots/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
