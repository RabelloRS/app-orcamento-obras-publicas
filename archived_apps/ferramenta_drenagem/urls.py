from django.urls import path
from . import views

app_name = 'ferramenta_drenagem'

urlpatterns = [
    path('', views.index, name='index'),
    path('calculo-volume/', views.calculo_volume, name='calculo_volume'),
]
