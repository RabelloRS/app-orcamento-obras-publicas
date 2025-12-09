from django.urls import path
from . import views

app_name = 'pav_concreto'

urlpatterns = [
    path('', views.index, name='index'),
]
