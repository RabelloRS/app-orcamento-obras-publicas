from django.urls import path
from . import views

app_name = 'mapa_fotos'

urlpatterns = [
    path('publico/', views.mapa_publico, name='mapa_publico'),
    path('', views.mapa, name='mapa'),
    path('upload/', views.upload_photos, name='upload'),
]