from django.urls import path
from . import views

urlpatterns = [
    path('visualizador/', views.mapa_fotos, name='mapa_fotos'),
]
