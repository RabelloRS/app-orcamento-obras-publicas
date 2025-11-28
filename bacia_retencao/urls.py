from django.urls import path
from .views import IndexView

app_name = 'bacia_retencao'

urlpatterns = [
    path('', IndexView.as_view(), name='index'),
]
