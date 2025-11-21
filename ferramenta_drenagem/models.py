from django.db import models

# Create your models here.

class RainEquation(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nome/Cidade")
    k = models.FloatField(verbose_name="K")
    a = models.FloatField(verbose_name="a")
    b = models.FloatField(verbose_name="b")
    c = models.FloatField(verbose_name="c")
    
    # Optional: Link to user if it's a custom equation
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
