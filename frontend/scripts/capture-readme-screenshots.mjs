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

async function ensureDemoUsers() {
  const adminEmail = `readme-admin-${ts}@example.com`;
  const orgEmail = `readme-org-${ts}@example.com`;
  const managerEmail = `readme-mgr-${ts}@example.com`;
  const agentEmail = `readme-agent-${ts}@example.com`;

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

  const org = await api("/api/organizations", {
    method: "POST",
    token: adminLogin.access_token,
    body: {
      name: "Acme Technologies",
      email: orgEmail,
      password: PASSWORD,
    },
  });

  const manager = await api("/api/managers", {
    method: "POST",
    token: adminLogin.access_token,
    body: {
      first_name: "Rohan",
      last_name: "Manager",
      email: managerEmail,
      password: PASSWORD,
      phone: "+919876543210",
      job_title: "Sales Manager",
      organization_id: org.item.id,
    },
  });

  await api("/api/agents", {
    method: "POST",
    token: adminLogin.access_token,
    body: {
      first_name: "Neha",
      last_name: "Agent",
      email: agentEmail,
      password: PASSWORD,
      phone: "+919876543211",
      job_title: "Support Agent",
      manager_account_id: manager.item.account_id,
    },
  });

  const [orgLogin, managerLogin, agentLogin] = await Promise.all([
    api("/api/auth/organization/login", {
      method: "POST",
      body: { email: orgEmail, password: PASSWORD },
    }),
    api("/api/auth/manager/login", {
      method: "POST",
      body: { email: managerEmail, password: PASSWORD },
    }),
    api("/api/auth/agent/login", {
      method: "POST",
      body: { email: agentEmail, password: PASSWORD },
    }),
  ]);

  return {
    adminToken: adminLogin.access_token,
    organizationToken: orgLogin.access_token,
    managerToken: managerLogin.access_token,
    agentToken: agentLogin.access_token,
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
  await page.waitForTimeout(1800);
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
    ["admin-login.png", () => screenshotPublic(page, "/admin/login", path.join(OUT_DIR, "admin-login.png"))],
    [
      "organization-login.png",
      () => screenshotPublic(page, "/organization/login", path.join(OUT_DIR, "organization-login.png")),
    ],
    ["manager-login.png", () => screenshotPublic(page, "/manager/login", path.join(OUT_DIR, "manager-login.png"))],
    ["agent-login.png", () => screenshotPublic(page, "/agent/login", path.join(OUT_DIR, "agent-login.png"))],
    [
      "admin-dashboard.png",
      () =>
        screenshotWithToken(
          page,
          tokens.adminToken,
          "admin_token",
          "/admin/dashboard",
          path.join(OUT_DIR, "admin-dashboard.png"),
        ),
    ],
    [
      "admin-organizations.png",
      () =>
        screenshotWithToken(
          page,
          tokens.adminToken,
          "admin_token",
          "/admin/dashboard/organizations",
          path.join(OUT_DIR, "admin-organizations.png"),
        ),
    ],
    [
      "admin-managers.png",
      () =>
        screenshotWithToken(
          page,
          tokens.adminToken,
          "admin_token",
          "/admin/dashboard/managers",
          path.join(OUT_DIR, "admin-managers.png"),
        ),
    ],
    [
      "admin-agents.png",
      () =>
        screenshotWithToken(
          page,
          tokens.adminToken,
          "admin_token",
          "/admin/dashboard/agents",
          path.join(OUT_DIR, "admin-agents.png"),
        ),
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
      "organization-dashboard.png",
      () =>
        screenshotWithToken(
          page,
          tokens.organizationToken,
          "organization_token",
          "/organization/dashboard",
          path.join(OUT_DIR, "organization-dashboard.png"),
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
      "manager-agents.png",
      () =>
        screenshotWithToken(
          page,
          tokens.managerToken,
          "manager_token",
          "/manager/dashboard/agents",
          path.join(OUT_DIR, "manager-agents.png"),
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
      "agent-dashboard.png",
      () =>
        screenshotWithToken(
          page,
          tokens.agentToken,
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
          tokens.agentToken,
          "agent_token",
          "/agent/dashboard/attendance",
          path.join(OUT_DIR, "agent-attendance.png"),
        ),
    ],
  ];

  for (const [name, capture] of shots) {
    await capture();
    console.log(`Saved ${name}`);
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
