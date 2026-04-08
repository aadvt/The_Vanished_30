import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from storage.models.base import Base

class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    shock_params: Mapped[dict] = mapped_column(JSON)
    p10: Mapped[float] = mapped_column(Float)
    p25: Mapped[float] = mapped_column(Float)
    p50: Mapped[float] = mapped_column(Float)
    p75: Mapped[float] = mapped_column(Float)
    p90: Mapped[float] = mapped_column(Float)
    prob_loss: Mapped[float] = mapped_column(Float)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )
