import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from storage.models.base import Base

class MacroIndicator(Base):
    __tablename__ = "macro_indicators"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    series_id: Mapped[str] = mapped_column(String, index=True)
    value: Mapped[float] = mapped_column(Float)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        index=True
    )
    source: Mapped[str] = mapped_column(String, default="FRED")
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
