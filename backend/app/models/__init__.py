from app.models.user import User, UserRole
from app.models.badge import Badge, UserBadge
from app.models.training import TrainingModule, TrainingProgress
from app.models.household import Household, SegregationLog
from app.models.waste_report import WasteReport
from app.models.facility import Facility
from app.models.carbon import CarbonActivity
from app.models.token import TokenAccount, TokenTransaction, TokenBlock
from app.models.contact import ContactMessage  # new


__all__ = [
    "User",
    "UserRole",
    "Badge",
    "UserBadge",
    "TrainingModule",
    "TrainingProgress",
    "Household",
    "SegregationLog",
    "WasteReport",
    "Facility",
    "CarbonActivity",
    "TokenAccount",
    "TokenTransaction",
    "TokenBlock",
]