from django.contrib import admin
from .models import AudioFile

class AudioFileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at', 'volume', 'speed', 'preserve_pitch')
    list_filter = ('created_at', 'preserve_pitch')
    search_fields = ('user__username',)
    readonly_fields = ('created_at',)

admin.site.register(AudioFile, AudioFileAdmin)