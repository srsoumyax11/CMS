import logging
import os
from email.message import EmailMessage
from typing import Dict, Any, Optional

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from fastapi import BackgroundTasks

from app.core.database import AsyncSessionLocal
from app.models.settings import SystemSetting

logger = logging.getLogger(__name__)

# Setup Jinja2 environment for email templates
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "templates", "email")
env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"])
)

async def _get_smtp_settings() -> Optional[Dict[str, str]]:
    """
    Fetches the latest SMTP settings directly from the database.
    This creates its own session since it runs in the background.
    """
    settings = {}
    async with AsyncSessionLocal() as session:
        stmt = select(SystemSetting).where(
            SystemSetting.key.in_([
                "global_email_enabled",
                "smtp_host",
                "smtp_port",
                "smtp_user",
                "smtp_password",
                "smtp_from_address"
            ])
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()
        
        for row in rows:
            settings[row.key] = row.value
            
    # Check if global emails are enabled
    if settings.get("global_email_enabled", "false").lower() != "true":
        logger.info("Global email sending is disabled in settings. Skipping email.")
        return None
        
    return settings

async def _send_email_worker(to_email: str, subject: str, template_name: str, context: Dict[str, Any]):
    """
    The actual async worker that fetches settings, renders the template, and sends the email.
    """
    try:
        # 1. Fetch DB Settings
        smtp_config = await _get_smtp_settings()
        if not smtp_config:
            return  # Disabled globally
            
        host = smtp_config.get("smtp_host")
        port_str = smtp_config.get("smtp_port", "587")
        user = smtp_config.get("smtp_user")
        password = smtp_config.get("smtp_password")
        from_address = smtp_config.get("smtp_from_address", "noreply@synergyinstitute.net")
        
        if not all([host, port_str, user, password]):
            logger.error("Incomplete SMTP settings in database. Cannot send email.")
            return
            
        port = int(port_str)
        
        # 2. Render Template
        template = env.get_template(template_name)
        html_content = template.render(**context)
        
        # 3. Build Email Message
        msg = EmailMessage()
        msg["From"] = from_address
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.add_alternative(html_content, subtype="html")
        
        # 4. Send Email via aiosmtplib
        use_tls = (port == 465)
        start_tls = (port == 587)
        
        await aiosmtplib.send(
            msg,
            hostname=host,
            port=port,
            username=user,
            password=password,
            use_tls=use_tls,
            start_tls=start_tls
        )
        logger.info(f"Successfully sent email '{subject}' to {to_email}")
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")

def send_email_background(
    background_tasks: BackgroundTasks, 
    to_email: str, 
    subject: str, 
    template_name: str, 
    context: Dict[str, Any]
):
    """
    Helper to inject the email worker into FastAPI's BackgroundTasks.
    It does not block the API response.
    """
    background_tasks.add_task(
        _send_email_worker,
        to_email=to_email,
        subject=subject,
        template_name=template_name,
        context=context
    )
