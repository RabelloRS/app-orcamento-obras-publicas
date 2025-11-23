from django.urls import path
from . import views

app_name = 'ferramenta_drenagem'

urlpatterns = [
    path('microdrenagem/', views.microdrenagem, name='microdrenagem'),
    path('calculo-volume/', views.microdrenagem, name='calculo_volume'),  # Legacy alias
    path('dimensionamento/', views.dimensionamento, name='dimensionamento'),
    path('idfgeo/', views.idfgeo, name='idfgeo'),
    path('api/add-equation/', views.add_equation, name='add_equation'),
]
