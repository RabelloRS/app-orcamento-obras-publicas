from django.contrib import admin
from .models import IDFFormula


@admin.register(IDFFormula)
class IDFFormulaAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'k', 'a', 'b', 'c', 'year', 'is_active')
    list_filter = ('state', 'is_active', 'year')
    search_fields = ('name', 'city', 'source', 'author')
    ordering = ('state', 'city', 'name')
    
    fieldsets = (
        ('Localização', {
            'fields': ('name', 'city', 'state', 'latitude', 'longitude')
        }),
        ('Parâmetros IDF', {
            'fields': ('k', 'a', 'b', 'c'),
            'description': 'Equação: i = K × TR^a / (t + b)^c'
        }),
        ('Validade', {
            'fields': ('duration_min', 'duration_max', 'return_period_min', 'return_period_max')
        }),
        ('Referência', {
            'fields': ('source', 'author', 'year')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
