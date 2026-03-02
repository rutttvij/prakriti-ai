from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.services.marketing_service import get_config


@dataclass
class StatsSummary:
    total_users: int = 0
    total_waste_logs: int = 0
    total_verified_actions: int = 0
    total_carbon_saved: float = 0.0
    total_pcc_issued: float = 0.0
    avg_resolution_time_hours: float = 0.0
    open_reports: int = 0


def _table_exists(db: Session, table_name: str) -> bool:
    try:
        return inspect(db.get_bind()).has_table(table_name)
    except Exception:
        return False


def _scalar(db: Session, sql: str, default: float = 0.0) -> float:
    try:
        val = db.execute(text(sql)).scalar()
        return float(val or 0.0)
    except Exception:
        return default


def _int_scalar(db: Session, sql: str, default: int = 0) -> int:
    try:
        val = db.execute(text(sql)).scalar()
        return int(val or 0)
    except Exception:
        return default


def get_public_stats(db: Session) -> StatsSummary:
    users_ok = _table_exists(db, "users")
    logs_ok = _table_exists(db, "waste_logs")
    verifications_ok = _table_exists(db, "verifications")
    ledger_ok = _table_exists(db, "carbon_ledger")

    if users_ok and (logs_ok or verifications_ok or ledger_ok):
        total_users = _int_scalar(db, "SELECT COUNT(*) FROM users")
        total_waste_logs = _int_scalar(db, "SELECT COUNT(*) FROM waste_logs") if logs_ok else 0
        total_verified_actions = _int_scalar(db, "SELECT COUNT(*) FROM verifications") if verifications_ok else 0
        total_carbon_saved = _scalar(db, "SELECT COALESCE(SUM(carbon_saved_kgco2e),0) FROM carbon_ledger") if ledger_ok else 0.0
        total_pcc_issued = _scalar(db, "SELECT COALESCE(SUM(pcc_awarded),0) FROM carbon_ledger") if ledger_ok else 0.0

        if logs_ok and verifications_ok:
            avg_resolution_time_hours = _scalar(
                db,
                """
                SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (v.verified_at - wl.logged_at)) / 3600), 0)
                FROM verifications v
                JOIN waste_logs wl ON wl.id = v.waste_log_id
                """,
                default=0.0,
            )
        else:
            avg_resolution_time_hours = 0.0

        open_citizen_reports = (
            _int_scalar(
                db,
                """
                SELECT COUNT(*)
                FROM waste_reports
                WHERE UPPER(COALESCE(status::text, 'OPEN')) != 'RESOLVED'
                """,
                default=0,
            )
            if _table_exists(db, "waste_reports")
            else 0
        )
        open_bulk_pickups = (
            _int_scalar(
                db,
                """
                SELECT COUNT(*)
                FROM pickup_requests
                WHERE UPPER(COALESCE(status::text, 'REQUESTED')) NOT IN ('COMPLETED', 'CANCELLED')
                """,
                default=0,
            )
            if _table_exists(db, "pickup_requests")
            else 0
        )
        open_reports = open_citizen_reports + open_bulk_pickups

        return StatsSummary(
            total_users=total_users,
            total_waste_logs=total_waste_logs,
            total_verified_actions=total_verified_actions,
            total_carbon_saved=round(total_carbon_saved, 2),
            total_pcc_issued=round(total_pcc_issued, 2),
            avg_resolution_time_hours=round(avg_resolution_time_hours, 2),
            open_reports=open_reports,
        )

    fallback = get_config(db, "seed_metrics")
    return StatsSummary(
        total_users=int(fallback.get("total_users", 0)),
        total_waste_logs=int(fallback.get("total_waste_logs", 0)),
        total_verified_actions=int(fallback.get("total_verified_actions", 0)),
        total_carbon_saved=float(fallback.get("total_carbon_saved", 0.0)),
        total_pcc_issued=float(fallback.get("total_pcc_issued", 0.0)),
        avg_resolution_time_hours=float(fallback.get("avg_resolution_time_hours", 0.0)),
        open_reports=int(fallback.get("open_reports", 0)),
    )


def sample_ledger_rows(db: Session) -> list[dict]:
    if _table_exists(db, "carbon_ledger"):
        rows = db.execute(
            text(
                """
                SELECT cl.created_at, COALESCE(wl.category::text, 'mixed') AS category,
                       COALESCE(v.verified_weight, v.verified_weight_kg, 0) AS verified_weight,
                       cl.carbon_saved_kgco2e, cl.pcc_awarded, cl.quality_score
                FROM carbon_ledger cl
                LEFT JOIN waste_logs wl ON wl.id = cl.ref_id
                LEFT JOIN verifications v ON v.waste_log_id = wl.id
                WHERE cl.ref_type = 'WASTE_LOG_VERIFICATION'
                ORDER BY cl.created_at DESC
                LIMIT 6
                """
            )
        ).mappings().all()
        if rows:
            return [
                {
                    "timestamp": r["created_at"],
                    "category": r["category"],
                    "verified_weight": float(r["verified_weight"] or 0.0),
                    "carbon_saved_kgco2e": float(r["carbon_saved_kgco2e"] or 0.0),
                    "pcc_awarded": float(r["pcc_awarded"] or 0.0),
                    "quality_score": float(r["quality_score"] or 1.0),
                }
                for r in rows
            ]

    return [
        {
            "timestamp": "2026-02-10T10:30:00Z",
            "category": "plastic",
            "verified_weight": 32.5,
            "carbon_saved_kgco2e": 81.25,
            "pcc_awarded": 77.19,
            "quality_score": 0.95,
        },
        {
            "timestamp": "2026-02-14T09:10:00Z",
            "category": "organic",
            "verified_weight": 45.0,
            "carbon_saved_kgco2e": 54.0,
            "pcc_awarded": 51.84,
            "quality_score": 0.96,
        },
        {
            "timestamp": "2026-02-16T16:05:00Z",
            "category": "metal",
            "verified_weight": 18.0,
            "carbon_saved_kgco2e": 72.0,
            "pcc_awarded": 74.88,
            "quality_score": 1.04,
        },
    ]
