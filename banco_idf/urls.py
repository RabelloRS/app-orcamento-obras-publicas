from django.urls import path
from . import views

app_name = 'banco_idf'

urlpatterns = [
    path('', views.consulta_idf, name='consulta'),
    path('calculadora/', views.calculadora_idf, name='calculadora'),
    path('api/formulas/', views.api_formulas, name='api_formulas'),
    path('api/calculate/', views.api_calculate, name='api_calculate'),
]
