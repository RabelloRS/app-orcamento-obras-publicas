from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Photo


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "latitude", "longitude", "created_at")
    list_filter = ("created_at",)
