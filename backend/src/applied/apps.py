from django.apps import AppConfig


class AppliedConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "src.applied"
    label = "applied"
    verbose_name = "Applied opportunities"
