from django.urls import path
from . import views

app_name = 'ferramenta_drenagem'

urlpatterns = [
    path('calculo-volume/', views.calculo_volume, name='calculo_volume'),
    path('dimensionamento/', views.dimensionamento, name='dimensionamento'),
    path('idfgeo/', views.idfgeo, name='idfgeo'),
    path('api/add-equation/', views.add_equation, name='add_equation'),
]
