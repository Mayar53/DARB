from django.apps import AppConfig


class StoriesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "src.stories"
    label = "stories"
    verbose_name = "Participation stories"
