import logging
import smtplib
import ssl
from datetime import UTC, date, datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid

from app.core.config import settings
from app.utils.account_ref import format_account_ref

logger = logging.getLogger(__name__)

_deliverability_logged = False

LEAVE_TYPE_LABELS = {
    "casual": "Casual leave",
    "sick": "Sick leave",
    "annual": "Annual leave",
    "unpaid": "Unpaid leave",
    "other": "Other",
}

DURATION_LABELS = {
    "full_day": "Full day",
    "half_day": "Half day",
}


def _smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.effective_from_email)


def _log_deliverability_warnings() -> None:
    global _deliverability_logged
    if _deliverability_logged:
        return
    _deliverability_logged = True
    for warning in settings.email_deliverability_warnings():
        logger.warning("Email deliverability: %s", warning)


def _message_id_domain() -> str | None:
    sender = settings.envelope_sender or settings.effective_from_email
    if "@" in sender:
        return sender.split("@", 1)[1]
    return None


def _app_base_url() -> str:
    base = settings.APP_URL.rstrip("/")
    for suffix in ("/admin/login", "/manager/login", "/agent/login", "/login"):
        if base.endswith(suffix):
            return base[: -len(suffix)]
    return base


def _role_login_url(role_label: str) -> str:
    role_lower = role_label.lower()
    if role_lower == "agent" and _role_conflicts_with_app_name(role_lower):
        return f"{_app_base_url()}/login"
    return f"{_app_base_url()}/{role_lower}/login"


def _app_name_tokens() -> set[str]:
    return {token for token in (settings.APP_NAME or "").lower().split() if len(token) >= 3}


def _role_conflicts_with_app_name(role_label: str) -> bool:
    return role_label.strip().lower() in _app_name_tokens()


def _email_role_label(role_label: str) -> str:
    role = role_label.strip()
    role_lower = role.lower()
    if _role_conflicts_with_app_name(role_lower):
        return {
            "agent": "Team member",
            "manager": "Supervisor",
            "admin": "Administrator",
            "organization": "Organization",
        }.get(role_lower, role)
    return role


def _account_access_phrase(role_label: str) -> str:
    if _role_conflicts_with_app_name(role_label):
        return "workspace account"
    return f"{role_label.strip().lower()} account"


def _sign_in_action_label() -> str:
    if "agent" in _app_name_tokens():
        return "Open your workspace"
    return f"Sign in to {settings.APP_NAME}"


def _account_ready_subject(role_label: str) -> str:
    if _role_conflicts_with_app_name(role_label):
        return f"Your {settings.APP_NAME} workspace access is ready"
    safe_role = _email_role_label(role_label)
    return f"Your {safe_role.lower()} account on {settings.APP_NAME} is ready"


def _account_status_subject(role_label: str, *, status_label: str) -> str:
    if _role_conflicts_with_app_name(role_label):
        return f"Your {settings.APP_NAME} account is now {status_label}"
    return f"Your {settings.APP_NAME} account is now {status_label}"


def _account_removed_subject(role_label: str) -> str:
    if _role_conflicts_with_app_name(role_label):
        return f"Your {settings.APP_NAME} workspace access has been removed"
    return f"Your {settings.APP_NAME} {role_label.lower()} access has been removed"


def _role_dashboard_url(role_label: str, *, path: str = "") -> str:
    base = f"{_app_base_url()}/{role_label.lower()}/dashboard"
    if path:
        return f"{base}/{path.lstrip('/')}"
    return base


def _format_leave_dates(start: date, end: date) -> str:
    if start == end:
        return start.strftime("%d %b %Y")
    return f"{start.strftime('%d %b %Y')} – {end.strftime('%d %b %Y')}"


def _leave_type_label(leave_type: str) -> str:
    return LEAVE_TYPE_LABELS.get(leave_type, leave_type.replace("_", " ").title())


def _duration_label(duration_type: str) -> str:
    return DURATION_LABELS.get(duration_type, duration_type.replace("_", " ").title())


_BRAND_PRIMARY = "#4f46e5"
_BRAND_PRIMARY_DARK = "#3730a3"
_TEXT_PRIMARY = "#0f172a"
_TEXT_SECONDARY = "#475569"
_TEXT_MUTED = "#64748b"
_SURFACE = "#ffffff"
_BG = "#f1f5f9"
_BORDER = "#e2e8f0"

# Dark-mode counterparts (honoured by Gmail iOS/Android, Apple Mail, Hey, Spark
# and any client that respects ``prefers-color-scheme`` inside <style>).
_DARK_TEXT_PRIMARY = "#f8fafc"
_DARK_TEXT_SECONDARY = "#cbd5e1"
_DARK_TEXT_MUTED = "#94a3b8"
_DARK_SURFACE = "#0f172a"
_DARK_BG = "#020617"
_DARK_BORDER = "#1e293b"


_DARK_MODE_CSS = f"""
  /* Auto dark-mode for clients that honour prefers-color-scheme inside <style> */
  @media (prefers-color-scheme: dark) {{
    body, .ent-bg {{ background:{_DARK_BG} !important; color:{_DARK_TEXT_PRIMARY} !important; }}
    .ent-card {{ background:{_DARK_SURFACE} !important; border-color:{_DARK_BORDER} !important; box-shadow:0 1px 2px rgba(0,0,0,0.4),0 8px 24px rgba(0,0,0,0.5) !important; }}
    .ent-greeting {{ color:{_DARK_TEXT_PRIMARY} !important; }}
    .ent-text {{ color:{_DARK_TEXT_SECONDARY} !important; }}
    .ent-footer {{ color:{_DARK_TEXT_MUTED} !important; }}
    .ent-divider {{ background:{_DARK_BORDER} !important; }}
    .ent-info-wrap {{ background:{_DARK_BG} !important; border-color:{_DARK_BORDER} !important; }}
    .ent-info-label {{ color:{_DARK_TEXT_MUTED} !important; }}
    .ent-info-value {{ color:{_DARK_TEXT_PRIMARY} !important; }}
    .ent-link-fallback {{ background:{_DARK_BG} !important; color:{_DARK_TEXT_SECONDARY} !important; border-color:{_DARK_BORDER} !important; }}
    .ent-link-hint {{ color:{_DARK_TEXT_MUTED} !important; }}
    .ent-eyebrow {{ color:#a5b4fc !important; }}
    .ent-copy {{ color:{_DARK_TEXT_MUTED} !important; }}
    .ent-code-pill {{ background:{_DARK_BG} !important; border-color:{_DARK_BORDER} !important; color:{_DARK_TEXT_PRIMARY} !important; }}
    .ent-sample {{ background:{_DARK_BG} !important; border-color:{_DARK_BORDER} !important; }}
    .ent-sample-row {{ color:{_DARK_TEXT_PRIMARY} !important; border-color:{_DARK_BORDER} !important; }}
    .ent-callout-info {{ background:#1e293b !important; border-color:#334155 !important; color:#bfdbfe !important; }}
    .ent-callout-warning {{ background:#3b2d10 !important; border-color:#5a4317 !important; color:#fcd34d !important; }}
    .ent-callout-danger {{ background:#3b1414 !important; border-color:#5a1d1d !important; color:#fca5a5 !important; }}
    .ent-callout-success {{ background:#0f2e1f !important; border-color:#155236 !important; color:#86efac !important; }}
  }}
"""


def _brand_initial() -> str:
    name = (settings.APP_NAME or "A").strip()
    return name[:1].upper() if name else "A"


def _html_wrapper(
    *,
    title: str,
    preheader: str,
    body_html: str,
    footer_note: str,
    eyebrow: str | None = None,
) -> str:
    """Enterprise-grade transactional email wrapper.

    - Branded gradient header with mark + product name.
    - Optional eyebrow label for context (e.g. "Security", "Team", "Leads").
    - Strong typographic hierarchy, accessible contrast.
    - Responsive container, dark-mode friendly meta hints.
    - Plain-text-safe markup with table-based layout for Outlook + Gmail.
    """
    eyebrow_html = (
        f'<p class="ent-eyebrow" style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;'
        f'text-transform:uppercase;color:{_BRAND_PRIMARY};">{eyebrow}</p>'
        if eyebrow
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>{title}</title>
  <style>
    {_DARK_MODE_CSS}
  </style>
</head>
<body class="ent-bg" style="margin:0;padding:0;background:{_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{_TEXT_PRIMARY};-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased;line-height:1.5;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
    {preheader}
  </span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="ent-bg" style="background:{_BG};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="ent-card" style="max-width:600px;width:100%;background:{_SURFACE};border-radius:16px;border:1px solid {_BORDER};box-shadow:0 1px 2px rgba(15,23,42,0.04),0 8px 24px rgba(15,23,42,0.06);overflow:hidden;">
          <tr>
            <td style="padding:0;background:linear-gradient(135deg,{_BRAND_PRIMARY} 0%,{_BRAND_PRIMARY_DARK} 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:20px 28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.32);color:#ffffff;font-weight:800;font-size:16px;text-align:center;line-height:34px;letter-spacing:0;">
                            {_brand_initial()}
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.01em;">{settings.APP_NAME}</p>
                          <p style="margin:2px 0 0;color:rgba(255,255,255,0.78);font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;">Transactional notification</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 12px;">
              {eyebrow_html}
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <div class="ent-divider" style="height:1px;background:{_BORDER};margin:8px 0 16px;"></div>
              <p class="ent-footer" style="margin:0;font-size:12px;color:{_TEXT_MUTED};line-height:1.6;">
                {footer_note}
              </p>
            </td>
          </tr>
        </table>
        <p class="ent-copy" style="margin:14px 0 0;font-size:11px;color:{_TEXT_MUTED};">
          &copy; {datetime.now(UTC).year} {settings.APP_NAME}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_message(
    *,
    to_email: str,
    to_name: str | None,
    subject: str,
    text_body: str,
    html_body: str,
) -> MIMEMultipart:
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.mail_from_header
    message["To"] = formataddr((to_name, to_email)) if to_name else to_email
    message["Reply-To"] = settings.reply_to_header
    message["Date"] = formatdate(localtime=True)
    message["MIME-Version"] = "1.0"
    message["Message-ID"] = make_msgid(domain=_message_id_domain())
    message["Content-Language"] = "en"
    message["Importance"] = "normal"
    message["X-Priority"] = "3"
    message["Auto-Submitted"] = "auto-generated"
    message["X-Auto-Response-Suppress"] = "OOF, AutoReply, All"

    domain = _message_id_domain()
    if domain:
        message["List-Id"] = f"<workspace-notifications.{domain}>"

    message.attach(MIMEText(text_body, "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))
    return message


def send_email(
    *,
    to_email: str,
    to_name: str | None = None,
    subject: str,
    text_body: str,
    html_body: str,
) -> bool:
    if not _smtp_configured():
        logger.warning(
            "Email not configured. Set EMAIL_HOST and EMAIL_USER in backend/.env\n"
            "To: %s\nSubject: %s\n%s",
            to_email,
            subject,
            text_body,
        )
        return False

    _log_deliverability_warnings()

    envelope_sender = settings.envelope_sender
    if not envelope_sender:
        logger.error("Email sender address is missing. Set EMAIL_USER in backend/.env")
        return False

    normalized_to = to_email.strip().lower()
    message = _build_message(
        to_email=normalized_to,
        to_name=to_name.strip() if to_name else None,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            domain = _message_id_domain()
            if domain:
                server.local_hostname = domain
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(envelope_sender, [normalized_to], message.as_string())
        logger.info("Email sent to %s: %s", normalized_to, subject)
        return True
    except Exception as exc:
        logger.exception("Failed to send email to %s: %s", normalized_to, exc)
        return False


def _default_footer() -> str:
    reply = settings.reply_to_email or settings.effective_from_email
    contact = f" Reply to {reply} if you need help." if reply else ""
    return (
        f"This is a transactional message from {settings.APP_NAME}.{contact} "
        f"If you did not expect this email, you can safely ignore it."
    )


def _action_block(*, action_url: str, label: str) -> tuple[str, str]:
    text = f"{label}: {action_url}\n"
    html = (
        f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 16px;">'
        f"<tr><td>"
        f'<a href="{action_url}" '
        f'style="display:inline-block;background:linear-gradient(135deg,{_BRAND_PRIMARY} 0%,{_BRAND_PRIMARY_DARK} 100%);'
        f"color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:10px;"
        f'letter-spacing:0.01em;box-shadow:0 4px 12px rgba(79,70,229,0.28);">'
        f"{label} &rarr;</a>"
        f"</td></tr></table>"
        f'<p class="ent-link-hint" style="margin:0 0 8px;font-size:12px;color:{_TEXT_MUTED};">'
        f"Button not working? Copy this link into your browser:</p>"
        f'<p class="ent-link-fallback" style="margin:0;font-size:12px;color:{_TEXT_SECONDARY};word-break:break-all;'
        f"font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;"
        f'background:{_BG};padding:10px 12px;border-radius:8px;border:1px solid {_BORDER};">'
        f"{action_url}</p>"
    )
    return text, html


def _info_block(rows: list[tuple[str, str]]) -> tuple[str, str]:
    """Build a structured key/value details block (text + HTML).

    Renders as a clean two-column table in HTML and aligned ``Key: Value`` in plain text.
    """
    text = "".join(f"{label}: {value}\n" for label, value in rows)
    html_rows = "".join(
        f'<tr>'
        f'<td class="ent-info-label" style="padding:8px 16px 8px 0;font-size:13px;font-weight:600;color:{_TEXT_SECONDARY};'
        f'white-space:nowrap;vertical-align:top;">{label}</td>'
        f'<td class="ent-info-value" style="padding:8px 0;font-size:14px;color:{_TEXT_PRIMARY};vertical-align:top;">{value}</td>'
        f"</tr>"
        for label, value in rows
    )
    html = (
        f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" '
        f'class="ent-info-wrap" '
        f'style="width:100%;margin:0 0 20px;border:1px solid {_BORDER};border-radius:12px;'
        f'background:{_BG};">'
        f'<tr><td style="padding:6px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">'
        f"{html_rows}"
        f"</table></td></tr>"
        f"</table>"
    )
    return text, html


def _callout(text_body: str, *, tone: str = "info") -> str:
    """Inline alert/callout box for important notes (HTML only)."""
    palette = {
        "info": ("#dbeafe", "#1d4ed8", "#bfdbfe"),
        "warning": ("#fef3c7", "#92400e", "#fde68a"),
        "danger": ("#fee2e2", "#991b1b", "#fecaca"),
        "success": ("#dcfce7", "#166534", "#bbf7d0"),
    }
    bg, fg, border = palette.get(tone, palette["info"])
    return (
        f'<div class="ent-callout-{tone}" style="margin:0 0 18px;padding:14px 16px;background:{bg};border:1px solid {border};'
        f'border-radius:10px;color:{fg};font-size:13px;line-height:1.55;">'
        f"{text_body}"
        f"</div>"
    )


def _account_reference(*, role_label: str, member_id: int) -> str:
    return format_account_ref(role=role_label, member_id=member_id)


def _leave_details_block(
    *,
    requester_name: str,
    leave_type: str,
    duration_type: str,
    start_date: date,
    end_date: date,
    working_days: float,
    reason: str,
) -> tuple[str, str]:
    return _info_block(
        [
            ("Employee", requester_name),
            ("Leave type", _leave_type_label(leave_type)),
            ("Duration", _duration_label(duration_type)),
            ("Dates", _format_leave_dates(start_date, end_date)),
            ("Working days", str(working_days)),
            ("Reason", reason),
        ]
    )


def _greeting_html(name: str) -> str:
    return (
        f'<p class="ent-greeting" style="margin:0 0 18px;font-size:20px;font-weight:700;color:{_TEXT_PRIMARY};letter-spacing:-0.01em;">'
        f"Hello {name},</p>"
    )


def _paragraph_html(text: str) -> str:
    return (
        f'<p class="ent-text" style="margin:0 0 16px;font-size:14px;line-height:1.65;color:{_TEXT_SECONDARY};">'
        f"{text}</p>"
    )


def send_admin_welcome_email(*, to_email: str, name: str) -> bool:
    login_url = _role_login_url("admin")
    action_text, action_html = _action_block(action_url=login_url, label="Open admin portal")
    _, info_html = _info_block([("Email", to_email), ("Role", "Administrator")])
    preheader = f"Your {settings.APP_NAME} admin account is ready."

    text_body = (
        f"Hello {name},\n\n"
        f"Welcome to {settings.APP_NAME}. Your administrator account is ready.\n\n"
        f"Email: {to_email}\n"
        f"Role: Administrator\n\n"
        f"{action_text}\n"
        f"Sign in anytime to manage organizations, managers, agents, attendance, and leave approvals.\n"
    )
    body_html = (
        f"{_greeting_html(name)}"
        f"{_paragraph_html(f'Welcome to <strong>{settings.APP_NAME}</strong>. Your administrator account is ready and you have full access to the platform.')}"
        f"{info_html}"
        f"{action_html}"
        f"{_paragraph_html('Use the dashboard to manage your team hierarchy, approve leave requests, and monitor attendance.')}"
    )
    html_body = _html_wrapper(
        title=f"Welcome to {settings.APP_NAME}",
        preheader=preheader,
        body_html=body_html,
        footer_note=_default_footer(),
        eyebrow="Welcome",
    )
    return send_email(
        to_email=to_email,
        to_name=name,
        subject=f"Welcome to {settings.APP_NAME}",
        text_body=text_body,
        html_body=html_body,
    )


def send_team_member_created_email(
    *,
    role_label: str,
    to_email: str,
    name: str,
    member_id: int,
    password: str,
    created_by_name: str,
) -> bool:
    display_role = _email_role_label(role_label)
    account_phrase = _account_access_phrase(role_label)
    account_ref = _account_reference(role_label=role_label, member_id=member_id)
    action_text, action_html = _action_block(
        action_url=_role_login_url(role_label),
        label=_sign_in_action_label(),
    )
    _, info_html = _info_block(
        [
            ("Account ID", account_ref),
            ("Role", display_role),
            ("Email", to_email),
            ("Temporary password", f"<code class=\"ent-code-pill\" style=\"background:#ffffff;border:1px solid {_BORDER};padding:2px 6px;border-radius:4px;font-size:13px;color:{_TEXT_PRIMARY};\">{password}</code>"),
        ]
    )
    security_callout = _callout(
        "<strong>Security tip:</strong> Change this temporary password immediately after your first sign-in.",
        tone="warning",
    )
    preheader = f"Your {settings.APP_NAME} sign-in details are inside."

    text_body = (
        f"Hello {name},\n\n"
        f"{created_by_name} created your {account_phrase} on {settings.APP_NAME}.\n\n"
        f"Account ID: {account_ref}\n"
        f"Role: {display_role}\n"
        f"Email: {to_email}\n"
        f"Temporary password: {password}\n\n"
        f"{action_text}\n"
        f"Security tip: Please change your temporary password immediately after first sign-in.\n"
    )
    body_html = (
        f"{_greeting_html(name)}"
        f"{_paragraph_html(f'<strong>{created_by_name}</strong> has created your {account_phrase} on <strong>{settings.APP_NAME}</strong>. Your access is ready below.')}"
        f"{info_html}"
        f"{security_callout}"
        f"{action_html}"
    )
    html_body = _html_wrapper(
        title=f"{settings.APP_NAME} account ready",
        preheader=preheader,
        body_html=body_html,
        footer_note=(
            f"This message was sent by {settings.APP_NAME} because an administrator created your account. "
            f"{_default_footer()}"
        ),
        eyebrow="Account access",
    )

    return send_email(
        to_email=to_email,
        to_name=name,
        subject=_account_ready_subject(role_label),
        text_body=text_body,
        html_body=html_body,
    )


def send_team_member_status_email(
    *,
    role_label: str,
    to_email: str,
    name: str,
    member_id: int,
    is_active: bool,
    updated_by_name: str,
) -> bool:
    status_label = "active" if is_active else "blocked"
    account_ref = _account_reference(role_label=role_label, member_id=member_id)
    account_phrase = _account_access_phrase(role_label)
    action_text, action_html = _action_block(
        action_url=_role_login_url(role_label),
        label=_sign_in_action_label(),
    )
    _, info_html = _info_block(
        [
            ("Account ID", account_ref),
            ("Status", f"<strong style=\"color:{'#15803d' if is_active else '#b91c1c'};\">{status_label.upper()}</strong>"),
            ("Updated by", updated_by_name),
        ]
    )
    callout_html = _callout(
        "Your account is active and you can sign in normally."
        if is_active
        else "Your account has been blocked. Sign-in attempts will be rejected until reactivated.",
        tone="success" if is_active else "danger",
    )
    preheader = f"Your {settings.APP_NAME} account is now {status_label}."

    text_body = (
        f"Hello {name},\n\n"
        f"Your {account_phrase} on {settings.APP_NAME} is now {status_label}.\n\n"
        f"Account ID: {account_ref}\n"
        f"Updated by: {updated_by_name}\n\n"
        f"{action_text}"
    )
    body_html = (
        f"{_greeting_html(name)}"
        f"{_paragraph_html(f'Your {account_phrase} on <strong>{settings.APP_NAME}</strong> is now <strong>{status_label}</strong>.')}"
        f"{info_html}"
        f"{callout_html}"
        f"{action_html if is_active else ''}"
    )
    html_body = _html_wrapper(
        title=f"{settings.APP_NAME} account update",
        preheader=preheader,
        body_html=body_html,
        footer_note=(
            f"This message was sent by {settings.APP_NAME} because an administrator updated your account status. "
            f"{_default_footer()}"
        ),
        eyebrow="Account status",
    )
    return send_email(
        to_email=to_email,
        to_name=name,
        subject=_account_status_subject(role_label, status_label=status_label),
        text_body=text_body,
        html_body=html_body,
    )


def send_team_member_deleted_email(
    *,
    role_label: str,
    to_email: str,
    name: str,
    member_id: int,
    deleted_by_name: str,
) -> bool:
    account_ref = _account_reference(role_label=role_label, member_id=member_id)
    display_role = _email_role_label(role_label)
    account_phrase = _account_access_phrase(role_label)
    _, info_html = _info_block(
        [
            ("Account ID", account_ref),
            ("Role", display_role),
            ("Removed by", deleted_by_name),
        ]
    )
    callout_html = _callout(
        "<strong>Access revoked.</strong> Future sign-in attempts to this account will be rejected.",
        tone="danger",
    )
    preheader = f"Your {settings.APP_NAME} access has been removed."

    text_body = (
        f"Hello {name},\n\n"
        f"Your {account_phrase} ({account_ref}) on {settings.APP_NAME} "
        f"has been removed by {deleted_by_name}.\n\n"
        f"You no longer have access to {settings.APP_NAME}.\n"
    )
    body_html = (
        f"{_greeting_html(name)}"
        f"{_paragraph_html(f'<strong>{deleted_by_name}</strong> has removed your {account_phrase} from <strong>{settings.APP_NAME}</strong>.')}"
        f"{info_html}"
        f"{callout_html}"
        f"{_paragraph_html('If you believe this was a mistake, please contact your administrator.')}"
    )
    html_body = _html_wrapper(
        title=f"{settings.APP_NAME} access removed",
        preheader=preheader,
        body_html=body_html,
        footer_note=(
            f"This message was sent by {settings.APP_NAME} because an administrator removed your account. "
            f"{_default_footer()}"
        ),
        eyebrow="Access removed",
    )
    return send_email(
        to_email=to_email,
        to_name=name,
        subject=_account_removed_subject(role_label),
        text_body=text_body,
        html_body=html_body,
    )


def send_leave_submitted_email(
    *,
    reviewer_email: str,
    reviewer_name: str,
    requester_name: str,
    reviewer_role: str,
    leave_type: str,
    duration_type: str,
    start_date: date,
    end_date: date,
    working_days: float,
    reason: str,
) -> bool:
    dashboard_url = _role_dashboard_url(reviewer_role, path="attendance")
    action_text, action_html = _action_block(action_url=dashboard_url, label="Review leave request")
    details_text, details_html = _leave_details_block(
        requester_name=requester_name,
        leave_type=leave_type,
        duration_type=duration_type,
        start_date=start_date,
        end_date=end_date,
        working_days=working_days,
        reason=reason,
    )
    preheader = f"{requester_name} submitted a leave request for your review."

    text_body = (
        f"Hello {reviewer_name},\n\n"
        f"{requester_name} submitted a new leave request on {settings.APP_NAME}.\n\n"
        f"{details_text}\n"
        f"{action_text}"
    )
    body_html = (
        f"{_greeting_html(reviewer_name)}"
        f"{_paragraph_html(f'<strong>{requester_name}</strong> has submitted a new leave request and is awaiting your decision.')}"
        f"{details_html}"
        f"{action_html}"
    )
    html_body = _html_wrapper(
        title="Leave request submitted",
        preheader=preheader,
        body_html=body_html,
        footer_note=_default_footer(),
        eyebrow="Leave management",
    )
    return send_email(
        to_email=reviewer_email,
        to_name=reviewer_name,
        subject=f"Leave request from {requester_name}",
        text_body=text_body,
        html_body=html_body,
    )


def send_leave_updated_email(
    *,
    reviewer_email: str,
    reviewer_name: str,
    requester_name: str,
    reviewer_role: str,
    leave_type: str,
    duration_type: str,
    start_date: date,
    end_date: date,
    working_days: float,
    reason: str,
) -> bool:
    dashboard_url = _role_dashboard_url(reviewer_role, path="attendance")
    action_text, action_html = _action_block(action_url=dashboard_url, label="Review updated request")
    details_text, details_html = _leave_details_block(
        requester_name=requester_name,
        leave_type=leave_type,
        duration_type=duration_type,
        start_date=start_date,
        end_date=end_date,
        working_days=working_days,
        reason=reason,
    )
    preheader = f"{requester_name} updated a pending leave request."

    text_body = (
        f"Hello {reviewer_name},\n\n"
        f"{requester_name} updated a pending leave request on {settings.APP_NAME}.\n\n"
        f"{details_text}\n"
        f"{action_text}"
    )
    body_html = (
        f"{_greeting_html(reviewer_name)}"
        f"{_paragraph_html(f'<strong>{requester_name}</strong> has revised the details of their pending leave request. Updated details are below.')}"
        f"{details_html}"
        f"{action_html}"
    )
    html_body = _html_wrapper(
        title="Leave request updated",
        preheader=preheader,
        body_html=body_html,
        footer_note=_default_footer(),
        eyebrow="Leave management",
    )
    return send_email(
        to_email=reviewer_email,
        to_name=reviewer_name,
        subject=f"Updated leave request from {requester_name}",
        text_body=text_body,
        html_body=html_body,
    )


def send_leave_cancelled_email(
    *,
    reviewer_email: str,
    reviewer_name: str,
    requester_name: str,
) -> bool:
    preheader = f"{requester_name} withdrew a pending leave request."

    text_body = (
        f"Hello {reviewer_name},\n\n"
        f"{requester_name} cancelled a pending leave request on {settings.APP_NAME}. "
        f"No action is required from you.\n"
    )
    body_html = (
        f"{_greeting_html(reviewer_name)}"
        f"{_paragraph_html(f'<strong>{requester_name}</strong> has cancelled a pending leave request. No further action is required from you.')}"
        f"{_callout('This request has been withdrawn and removed from your approval queue.', tone='info')}"
    )
    html_body = _html_wrapper(
        title="Leave request cancelled",
        preheader=preheader,
        body_html=body_html,
        footer_note=_default_footer(),
        eyebrow="Leave management",
    )
    return send_email(
        to_email=reviewer_email,
        to_name=reviewer_name,
        subject=f"Leave request cancelled by {requester_name}",
        text_body=text_body,
        html_body=html_body,
    )


def send_leave_reviewed_email(
    *,
    requester_email: str,
    requester_name: str,
    requester_role: str,
    approved: bool,
    reviewer_name: str,
    leave_type: str,
    duration_type: str,
    start_date: date,
    end_date: date,
    working_days: float,
    reason: str,
    review_note: str | None = None,
) -> bool:
    status_label = "approved" if approved else "declined"
    dashboard_url = _role_dashboard_url(requester_role, path="attendance")
    action_text, action_html = _action_block(action_url=dashboard_url, label="View leave history")
    details_text, details_html = _leave_details_block(
        requester_name=requester_name,
        leave_type=leave_type,
        duration_type=duration_type,
        start_date=start_date,
        end_date=end_date,
        working_days=working_days,
        reason=reason,
    )
    preheader = f"Your leave request was {status_label} by {reviewer_name}."

    note_text = f"Review note: {review_note}\n" if review_note else ""
    note_html = (
        _callout(
            f"<strong>Reviewer note:</strong> {review_note}",
            tone="success" if approved else "warning",
        )
        if review_note
        else ""
    )
    status_callout = _callout(
        f"Your leave has been <strong>{status_label}</strong>."
        + (" Have a good break!" if approved else " Please contact your reviewer if you need clarification."),
        tone="success" if approved else "danger",
    )

    text_body = (
        f"Hello {requester_name},\n\n"
        f"Your leave request on {settings.APP_NAME} was {status_label} by {reviewer_name}.\n\n"
        f"{details_text}"
        f"{note_text}"
        f"{action_text}"
    )
    body_html = (
        f"{_greeting_html(requester_name)}"
        f"{_paragraph_html(f'Your leave request has been reviewed by <strong>{reviewer_name}</strong> and the outcome is below.')}"
        f"{status_callout}"
        f"{details_html}"
        f"{note_html}"
        f"{action_html}"
    )
    html_body = _html_wrapper(
        title=f"Leave request {status_label}",
        preheader=preheader,
        body_html=body_html,
        footer_note=_default_footer(),
        eyebrow="Leave management",
    )
    return send_email(
        to_email=requester_email,
        to_name=requester_name,
        subject=f"Your leave request was {status_label}",
        text_body=text_body,
        html_body=html_body,
    )


def send_password_changed_email(
    *,
    role_label: str,
    to_email: str,
    name: str,
    member_id: int | None = None,
    actor_name: str | None = None,
    when_label: str | None = None,
    ip_address: str | None = None,
) -> bool:
    """Notify the user that their password was changed.

    ``actor_name`` distinguishes a self-service change from an admin-driven reset.
    ``when_label``/``ip_address`` add forensic context when available.
    """
    role_lower = role_label.lower()
    self_changed = actor_name is None or actor_name == name
    login_url = _role_login_url(role_label)
    action_text, action_html = _action_block(action_url=login_url, label=_sign_in_action_label())
    account_phrase = _account_access_phrase(role_label)

    rows: list[tuple[str, str]] = []
    if member_id is not None:
        rows.append(("Account ID", _account_reference(role_label=role_label, member_id=member_id)))
    rows.append(("Email", to_email))
    rows.append(
        ("Changed by", "You (self-service)" if self_changed else f"{actor_name} (administrator)")
    )
    if when_label:
        rows.append(("When", when_label))
    if ip_address:
        rows.append(("IP address", ip_address))
    _, info_html = _info_block(rows)

    callout_html = _callout(
        "If you did <strong>not</strong> make this change, contact your administrator immediately and rotate the password again from a trusted device.",
        tone="warning",
    )
    preheader = f"Your {settings.APP_NAME} password was changed."

    text_body = (
        f"Hello {name},\n\n"
        f"This is a confirmation that the password for your {account_phrase} on {settings.APP_NAME} was changed.\n\n"
        + "".join(f"{label}: {value}\n" for label, value in rows if "<" not in value)
        + "\nIf you did not make this change, contact your administrator immediately.\n\n"
        + action_text
    )
    body_html = (
        f"{_greeting_html(name)}"
        f"{_paragraph_html('This is a security confirmation that the password for your account was recently changed.')}"
        f"{info_html}"
        f"{callout_html}"
        f"{action_html}"
    )
    html_body = _html_wrapper(
        title="Password changed",
        preheader=preheader,
        body_html=body_html,
        footer_note=(
            f"This is an automated security notification from {settings.APP_NAME}. "
            f"{_default_footer()}"
        ),
        eyebrow="Security alert",
    )
    return send_email(
        to_email=to_email,
        to_name=name,
        subject=f"Your {settings.APP_NAME} password was changed",
        text_body=text_body,
        html_body=html_body,
    )
