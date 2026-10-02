import logging
import sys
from pythonjsonlogger import jsonlogger
from contextvars import ContextVar
import uuid

# Context variable to hold a correlation ID across async calls for the same request
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        if not log_record.get('timestamp'):
            # This logic adds an ISO-8601 timestamp
            from datetime import datetime
            log_record['timestamp'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        if log_record.get('level'):
            log_record['level'] = log_record['level'].upper()
        else:
            log_record['level'] = record.levelname
            
        request_id = request_id_var.get()
        if request_id:
            log_record['request_id'] = request_id

def setup_logging(log_level: str = "INFO"):
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Remove existing handlers
    while logger.handlers:
        logger.handlers.pop()

    log_handler = logging.StreamHandler(sys.stdout)
    formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s')
    log_handler.setFormatter(formatter)
    logger.addHandler(log_handler)
    
    # Prevent third party libraries from spamming
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    return logger

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
