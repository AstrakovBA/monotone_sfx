# Generated by Django 5.2.3 on 2025-06-11 12:35

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AudioFile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("original_file", models.FileField(upload_to="audio/original/")),
                (
                    "processed_file",
                    models.FileField(
                        blank=True, null=True, upload_to="audio/processed/"
                    ),
                ),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("eq_settings", models.JSONField(blank=True, default=dict)),
                ("volume", models.FloatField(default=0.0)),
                ("speed", models.FloatField(default=1.0)),
                ("preserve_pitch", models.BooleanField(default=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
