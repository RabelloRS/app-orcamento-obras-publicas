from django.urls import path
from . import views

app_name = 'mapa_fotos'

urlpatterns = [
    path('upload/', views.upload_photos, name='upload'),
    path('', views.mapa, name='mapa'),
]