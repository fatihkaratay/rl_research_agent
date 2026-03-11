"""Feature 1: Weekly email + Slack digest."""
import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
DIGEST_TO_EMAIL = os.getenv("DIGEST_TO_EMAIL", "")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
DIGEST_TOP_N = int(os.getenv("DIGEST_TOP_N", "10"))


def _format_paper_html(paper: dict) -> str:
    title = paper.get("title", "Untitled")
    novelty = paper.get("novelty_score", "N/A")
    category = paper.get("rl_category", "Unknown")
    key_innovation = paper.get("key_innovation", "")
    pdf_url = paper.get("pdf_url", "#")
    authors = ", ".join(paper.get("authors", [])[:3])
    return (
        f"<div style='margin-bottom:20px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;'>"
        f"<div style='font-size:12px;color:#6366f1;font-weight:700;margin-bottom:6px;'>"
        f"Novelty {novelty}/10 &bull; {category}</div>"
        f"<a href='{pdf_url}' style='font-size:15px;font-weight:700;color:#1e293b;text-decoration:none;'>{title}</a>"
        f"<p style='font-size:13px;color:#64748b;margin:6px 0 0;'>{authors}</p>"
        f"<p style='font-size:13px;color:#475569;margin:8px 0 0;'>{key_innovation}</p>"
        f"</div>"
    )


def _format_paper_slack(paper: dict, rank: int) -> dict:
    title = paper.get("title", "Untitled")
    novelty = paper.get("novelty_score", "N/A")
    category = paper.get("rl_category", "Unknown")
    key_innovation = paper.get("key_innovation", "")
    pdf_url = paper.get("pdf_url", "#")
    authors = ", ".join(paper.get("authors", [])[:3])
    return {
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": (
                f"*{rank}. <{pdf_url}|{title}>*\n"
                f"Novelty: `{novelty}/10` | Category: `{category}`\n"
                f"Authors: {authors}\n"
                f"_{key_innovation}_"
            ),
        },
    }


def send_email_digest(papers: List[dict]) -> bool:
    """Send weekly email digest. Returns True on success."""
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS, DIGEST_TO_EMAIL]):
        logger.info("Email digest skipped — SMTP credentials not configured.")
        return False

    top_papers = sorted(papers, key=lambda p: p.get("novelty_score", 0), reverse=True)[:DIGEST_TOP_N]

    html_parts = "".join(_format_paper_html(p) for p in top_papers)
    html_body = (
        f"<html><body style='font-family:sans-serif;max-width:680px;margin:auto;'>"
        f"<h1 style='color:#1e293b;'>RL Research Weekly Digest</h1>"
        f"<p style='color:#64748b;'>Top {len(top_papers)} papers this week by novelty score.</p>"
        f"{html_parts}"
        f"<p style='color:#94a3b8;font-size:11px;margin-top:32px;'>Powered by RL Research Agent</p>"
        f"</body></html>"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"RL Research Weekly Digest — Top {len(top_papers)} Papers"
    msg["From"] = SMTP_USER
    msg["To"] = DIGEST_TO_EMAIL
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [DIGEST_TO_EMAIL], msg.as_string())
        logger.info(f"Email digest sent to {DIGEST_TO_EMAIL} with {len(top_papers)} papers.")
        return True
    except Exception as e:
        logger.error(f"Failed to send email digest: {e}")
        return False


async def send_slack_digest(papers: List[dict]) -> bool:
    """Send weekly Slack digest. Returns True on success."""
    if not SLACK_WEBHOOK_URL:
        logger.info("Slack digest skipped — SLACK_WEBHOOK_URL not configured.")
        return False

    top_papers = sorted(papers, key=lambda p: p.get("novelty_score", 0), reverse=True)[:DIGEST_TOP_N]

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "RL Research Weekly Digest"},
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"Top *{len(top_papers)}* papers this week ranked by novelty score.",
            },
        },
        {"type": "divider"},
    ]

    for i, paper in enumerate(top_papers, start=1):
        blocks.append(_format_paper_slack(paper, i))

    payload = {"blocks": blocks}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(SLACK_WEBHOOK_URL, json=payload)
            resp.raise_for_status()
        logger.info(f"Slack digest sent with {len(top_papers)} papers.")
        return True
    except Exception as e:
        logger.error(f"Failed to send Slack digest: {e}")
        return False
