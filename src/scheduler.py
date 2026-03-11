"""Feature 14: Scheduled auto-runs using APScheduler."""
import os
import logging
from datetime import datetime, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

from src.database import (
    get_schedule_state,
    update_schedule_state,
    papers_collection,
)

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_CRON = os.getenv("SCHEDULE_CRON", "0 8 * * *")

scheduler: Optional[AsyncIOScheduler] = None


async def _run_daily_agent():
    """Daily agent run for general + author feeds."""
    from src.agent.graph import research_graph
    from src.database import set_agent_status, get_agent_status

    logger.info("[Scheduler] Starting daily agent run...")

    await update_schedule_state({"last_run": datetime.now(timezone.utc).isoformat()})

    for feed_type in ["general", "author"]:
        if await get_agent_status(feed_type):
            logger.info(f"[Scheduler] Agent already running for '{feed_type}', skipping.")
            continue

        await set_agent_status(feed_type, True)
        try:
            logger.info(f"[Scheduler] Running agent for feed_type='{feed_type}'")
            initial_state = {
                "feed_type": feed_type,
                "raw_papers": [],
                "new_papers": [],
                "analyzed_papers": [],
            }
            await research_graph.ainvoke(initial_state)
            logger.info(f"[Scheduler] Agent finished for '{feed_type}'")
        except Exception as e:
            logger.error(f"[Scheduler] Agent error for '{feed_type}': {e}")
        finally:
            await set_agent_status(feed_type, False)


async def _run_weekly_citations():
    """Weekly citation count update."""
    from src.tools.citations import update_citation_counts
    logger.info("[Scheduler] Starting weekly citation update...")
    try:
        updated = await update_citation_counts()
        logger.info(f"[Scheduler] Citation update complete: {updated} papers updated.")
    except Exception as e:
        logger.error(f"[Scheduler] Citation update failed: {e}")


async def _run_weekly_digest():
    """Weekly email + Slack digest."""
    from src.digest import send_email_digest, send_slack_digest
    logger.info("[Scheduler] Starting weekly digest...")
    try:
        # Get top papers from the last 7 days
        from datetime import timedelta
        one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        cursor = papers_collection.find(
            {"created_at": {"$gte": one_week_ago}},
            {"_id": 0, "embedding": 0},
        ).sort("novelty_score", -1).limit(50)
        papers = await cursor.to_list(length=50)

        if not papers:
            logger.info("[Scheduler] No recent papers for digest.")
            return

        send_email_digest(papers)
        await send_slack_digest(papers)
        logger.info(f"[Scheduler] Digest sent with {len(papers)} papers.")
    except Exception as e:
        logger.error(f"[Scheduler] Digest failed: {e}")


def _parse_cron(cron_str: str) -> dict:
    """Parse a cron string into APScheduler CronTrigger kwargs."""
    parts = cron_str.strip().split()
    if len(parts) != 5:
        logger.warning(f"Invalid cron string '{cron_str}', using default.")
        parts = DEFAULT_CRON.split()
    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


async def start_scheduler():
    """Initialize and start the APScheduler."""
    global scheduler

    state = await get_schedule_state()
    cron_str = state.get("cron", DEFAULT_CRON)
    enabled = state.get("enabled", True)

    scheduler = AsyncIOScheduler(timezone="UTC")

    # Daily agent run
    cron_kwargs = _parse_cron(cron_str)
    scheduler.add_job(
        _run_daily_agent,
        CronTrigger(**cron_kwargs, timezone="UTC"),
        id="daily_agent",
        replace_existing=True,
        max_instances=1,
    )

    # Weekly citation update (Sundays at 6am UTC)
    scheduler.add_job(
        _run_weekly_citations,
        CronTrigger(day_of_week="sun", hour=6, minute=0, timezone="UTC"),
        id="weekly_citations",
        replace_existing=True,
        max_instances=1,
    )

    # Weekly digest (Sundays at 7am UTC)
    scheduler.add_job(
        _run_weekly_digest,
        CronTrigger(day_of_week="sun", hour=7, minute=0, timezone="UTC"),
        id="weekly_digest",
        replace_existing=True,
        max_instances=1,
    )

    if enabled:
        scheduler.start()
        logger.info(f"[Scheduler] Started with cron='{cron_str}'")
    else:
        logger.info("[Scheduler] Scheduler is disabled in settings.")

    # Store next run time
    try:
        daily_job = scheduler.get_job("daily_agent")
        if daily_job and daily_job.next_run_time:
            await update_schedule_state({
                "next_run": daily_job.next_run_time.isoformat(),
                "cron": cron_str,
                "enabled": enabled,
            })
    except Exception as e:
        logger.debug(f"Could not store next_run: {e}")

    return scheduler


async def stop_scheduler():
    """Stop the scheduler gracefully."""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped.")


async def update_scheduler_cron(new_cron: str, enabled: bool = True):
    """Update the scheduler cron and restart if needed."""
    global scheduler

    if scheduler:
        cron_kwargs = _parse_cron(new_cron)
        try:
            scheduler.reschedule_job(
                "daily_agent",
                trigger=CronTrigger(**cron_kwargs, timezone="UTC"),
            )
            if enabled and not scheduler.running:
                scheduler.start()
            elif not enabled and scheduler.running:
                scheduler.pause()
        except Exception as e:
            logger.error(f"Failed to reschedule: {e}")

    await update_schedule_state({"cron": new_cron, "enabled": enabled})
    logger.info(f"[Scheduler] Updated: cron='{new_cron}', enabled={enabled}")
