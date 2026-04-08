import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Text, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from storage.models.base import Base

class BubbleFlag(Base):
    __tablename__ = "bubble_flags"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    region: Mapped[str] = mapped_column(String, default="national")
    overall_score: Mapped[int] = mapped_column(Integer)
    price_income_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_rent_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    cap_rate_spread: Mapped[float | None] = mapped_column(Float, nullable=True)
    affordability_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )
