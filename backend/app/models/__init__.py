from app.models.user import User, UserRole
from app.models.badge import Badge, UserBadge
from app.models.training import TrainingModule, TrainingProgress, TrainingLesson
from app.models.household import Household, SegregationLog
from app.models.waste_report import WasteReport
from app.models.facility import Facility
from app.models.carbon import CarbonActivity
from app.models.token import TokenAccount, TokenTransaction, TokenBlock
from app.models.contact import ContactMessage  # new
from app.models.marketing import (
    MarketingPartner,
    MarketingTestimonial,
    MarketingCaseStudy,
    MarketingFAQ,
    MarketingConfig,
)
from app.models.leads import Lead, DemoRequest, NewsletterSubscriber
from app.models.bulk import (
    BulkGenerator,
    WasteLog,
    PickupRequest,
    Verification,
    Wallet,
    Transaction,
    BulkApprovalStatus,
    WasteLogCategory,
    WasteLogStatus,
    PickupRequestStatus,
    TransactionType,
    TransactionStatus,
)
from app.models.pcc import EmissionFactor, CarbonLedger


__all__ = [
    "User",
    "UserRole",
    "Badge",
    "UserBadge",
    "TrainingModule",
    "TrainingLesson",
    "TrainingProgress",
    "Household",
    "SegregationLog",
    "WasteReport",
    "Facility",
    "CarbonActivity",
    "TokenAccount",
    "TokenTransaction",
    "TokenBlock",
    "BulkGenerator",
    "WasteLog",
    "PickupRequest",
    "Verification",
    "Wallet",
    "Transaction",
    "BulkApprovalStatus",
    "WasteLogCategory",
    "WasteLogStatus",
    "PickupRequestStatus",
    "TransactionType",
    "TransactionStatus",
    "EmissionFactor",
    "CarbonLedger",
    "MarketingPartner",
    "MarketingTestimonial",
    "MarketingCaseStudy",
    "MarketingFAQ",
    "MarketingConfig",
    "Lead",
    "DemoRequest",
    "NewsletterSubscriber",
]
