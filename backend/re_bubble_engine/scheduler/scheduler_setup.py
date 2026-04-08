from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import settings
from scheduler.jobs.job_macro_refresh import run_macro_refresh_job
from scheduler.jobs.job_agent_run import run_agent_job

def create_scheduler() -> AsyncIOScheduler:
  scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")
  scheduler.add_job(
    run_macro_refresh_job, "interval",
    minutes=settings.MACRO_REFRESH_INTERVAL_MINUTES,
    id="macro_refresh", replace_existing=True,
    max_instances=1
  )
  scheduler.add_job(
    run_agent_job, "interval",
    minutes=settings.AGENT_RUN_INTERVAL_MINUTES,
    id="agent_run", replace_existing=True,
    max_instances=1
  )
  return scheduler
