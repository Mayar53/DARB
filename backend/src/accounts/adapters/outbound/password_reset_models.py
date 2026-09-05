"""Persistence adapter: the Django ORM model for password reset codes.

A code is created when a user requests a password reset, stored hashed (never
plaintext), and expires after a short window (default 30 minutes). A code can
be used once; requesting a new code invalidates previous ones for the same
email.
"""

from __future__ import annotations

from django.db import models


class PasswordResetCode(models.Model):
    email = models.EmailField(db_index=True)
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "accounts"
        db_table = "accounts_password_reset_code"
        verbose_name = "password reset code"
        verbose_name_plural = "password reset codes"
        indexes = [models.Index(fields=["email", "used"])]

    def __str__(self) -> str:
        return f"{self.email} (used={self.used})"
