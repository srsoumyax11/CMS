import smtplib
from email.message import EmailMessage
from typing import Optional
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("email")

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, body_html: str) -> bool:
        """
        Sends an email using configured SMTP settings.
        If SMTP_HOST is not configured, logs the email output in dev mode.
        """
        smtp_host = getattr(settings, "SMTP_HOST", None)
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_pass = getattr(settings, "SMTP_PASSWORD", None)
        from_email = getattr(settings, "EMAILS_FROM_EMAIL", "noreply@college.edu")

        if not smtp_host:
            logger.info(f"📧 [DEV EMAIL MOCK] To: {to_email} | Subject: {subject}\nBody:\n{body_html}\n")
            return True

        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to_email
            msg.set_content(body_html, subtype="html")

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"🚨 Failed to send email to {to_email}: {e}")
            return False

    @classmethod
    def send_overdue_gatepass_alert(
        cls, to_email: str, student_name: str, pass_code: str, expected_return: str
    ) -> bool:
        subject = f"🚨 URGENT: Overdue Gate Pass Notice - {student_name}"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Campus Security Alert: Overdue Gate Pass</h2>
                <p>Dear Parent / Guardian,</p>
                <p>This is an automated security notification regarding student <strong>{student_name}</strong>.</p>
                <ul>
                    <li><strong>Gate Pass Code:</strong> {pass_code}</li>
                    <li><strong>Expected Return Time:</strong> {expected_return}</li>
                    <li><strong>Status:</strong> <span style="color: red; font-weight: bold;">OVERDUE</span></li>
                </ul>
                <p>The student has not checked back into campus within the permitted return window. Please contact security or department head immediately.</p>
            </body>
        </html>
        """
        return cls.send_email(to_email, subject, html)

    @classmethod
    def send_attendance_shortage_alert(
        cls, to_email: str, student_name: str, subject_name: str, percentage: float
    ) -> bool:
        subject = f"⚠️ Attendance Shortage Warning - {student_name} ({subject_name})"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Academic Alert: Low Attendance Shortage</h2>
                <p>Dear Student / Parent,</p>
                <p>Student <strong>{student_name}</strong> has fallen below the required attendance threshold in <strong>{subject_name}</strong>.</p>
                <p>Current Attendance Percentage: <strong style="color: red;">{percentage:.1f}%</strong> (Required Minimum: 75.0%)</p>
                <p>Please ensure regular class attendance to avoid semester examination debarment.</p>
            </body>
        </html>
        """
        return cls.send_email(to_email, subject, html)
