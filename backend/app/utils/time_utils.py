from datetime import datetime, timedelta


def now_beijing() -> datetime:
    """Get current datetime in Beijing timezone (UTC+8)."""
    return datetime.utcnow() + timedelta(hours=8)

def now_beijing_str() -> str:
    """Get current datetime string in Beijing timezone (UTC+8). format: YYYY-MM-DD HH:MM:SS"""
    return now_beijing().strftime("%Y-%m-%d %H:%M:%S")

def now_beijing_iso() -> str:
    """Get current datetime ISO string in Beijing timezone (UTC+8)."""
    return now_beijing().isoformat()
