import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from storage.models.base import Base

class Valuation(Base):
    __tablename__ = "valuations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    region: Mapped[str] = mapped_column(String, default="national")
    property_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    dcf_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    cap_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )
