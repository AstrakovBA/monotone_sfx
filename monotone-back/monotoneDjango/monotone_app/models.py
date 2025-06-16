from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class AudioFile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    original_file = models.FileField(upload_to='audio/original/')
    processed_file = models.FileField(upload_to='audio/processed/', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    eq_settings = models.JSONField(default=dict, blank=True)
    volume = models.FloatField(default=0.0)
    speed = models.FloatField(default=1.0)
    preserve_pitch = models.BooleanField(default=True)

    def __str__(self):
        return f"Audio {self.id} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"