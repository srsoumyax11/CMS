import logging
import sys
from datetime import datetime
from contextvars import ContextVar
import os

# Context variable to hold a correlation ID across async calls for the same request
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

# ANSI Terminal Color Codes
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"

COLOR_GREEN = "\033[32m"
COLOR_BLUE = "\033[34m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"
COLOR_MAGENTA = "\033[35m"
COLOR_CYAN = "\033[36m"
COLOR_GRAY = "\033[90m"

LEVEL_MAP = {
    "DEBUG": ("🐛 DEBUG", COLOR_MAGENTA + BOLD),
    "INFO": ("✨ INFO ", COLOR_GREEN + BOLD),
    "WARNING": ("⚠️ WARN ", COLOR_YELLOW + BOLD),
    "ERROR": ("🚨 ERROR", COLOR_RED + BOLD),
    "CRITICAL": ("🔥 CRIT ", COLOR_RED + BOLD),
}

class EmojiColorFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now().strftime("%H:%M:%S")
        time_str = f"{COLOR_GRAY}[{timestamp}]{RESET}"

        level_name = record.levelname.upper()
        emoji, color_style = LEVEL_MAP.get(level_name, ("📌 INFO ", COLOR_CYAN + BOLD))
        level_str = f"{color_style}[{emoji}]{RESET}"

        name_str = f"{COLOR_CYAN}{record.name}{RESET}"
        
        req_id = request_id_var.get()
        req_str = f" {COLOR_GRAY}(id:{req_id[:6]}){RESET}" if req_id else ""

        message = record.getMessage()

        # Add extra details if present (status_code, process_time_ms)
        extra_info = []
        if hasattr(record, "status_code"):
            code = getattr(record, "status_code")
            if code < 300:
                extra_info.append(f"{COLOR_GREEN}{BOLD}HTTP {code}{RESET}")
            elif code < 400:
                extra_info.append(f"{COLOR_YELLOW}{BOLD}HTTP {code}{RESET}")
            else:
                extra_info.append(f"{COLOR_RED}{BOLD}HTTP {code}{RESET}")

        if hasattr(record, "process_time_ms"):
            time_ms = getattr(record, "process_time_ms")
            extra_info.append(f"{COLOR_GRAY}{time_ms}ms{RESET}")

        extra_str = f" {' '.join(extra_info)}" if extra_info else ""

        output = f"{time_str} {level_str}{req_str} {COLOR_BLUE}▸{RESET} {message}{extra_str}"

        if record.exc_info:
            exc_text = self.formatException(record.exc_info)
            output += f"\n{COLOR_RED}{exc_text}{RESET}"

        return output

def setup_logging(log_level: str = "INFO"):
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Enable ANSI colors on Windows PowerShell / Command Prompt
    if sys.platform == "win32":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except Exception:
            pass

    # Remove existing handlers
    while logger.handlers:
        logger.handlers.pop()

    log_handler = logging.StreamHandler(sys.stdout)
    log_handler.setFormatter(EmojiColorFormatter())
    logger.addHandler(log_handler)
    
    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    
    return logger

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
