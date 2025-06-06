from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Event, Metric

async def calculate_metrics(session: AsyncSession):
    result = await session.execute(
        select(Event.event_type, func.count()).group_by(Event.event_type)
    )
    for event_type, count in result.all():
        existing = await session.execute(
            select(Metric).where(Metric.event_type == event_type)
        )
        metric = existing.scalar_one_or_none()
        if metric:
            metric.count = count
        else:
            metric = Metric(event_type=event_type, count=count)
            session.add(metric)
    await session.commit()

scheduler = AsyncIOScheduler()

async def _job(session_factory):
    async with session_factory() as session:
        await calculate_metrics(session)

def start_scheduler(session_factory):
    scheduler.add_job(_job, 'interval', minutes=1, args=[session_factory])
    scheduler.start()

