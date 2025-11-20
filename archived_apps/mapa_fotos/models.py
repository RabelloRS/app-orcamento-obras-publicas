from django.db import models

# Create your models here.
from django.db import models


class Photo(models.Model):
    image = models.ImageField(upload_to='photos/')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo #{self.pk}"
