from django.urls import path
from . import views

app_name = 'ferramenta_mapa'

urlpatterns = [
    path('visualizador/', views.mapa_fotos, name='mapa_fotos'),
]
