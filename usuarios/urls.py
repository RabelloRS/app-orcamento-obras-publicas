from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView
from . import views

app_name = 'usuarios'

urlpatterns = [
    path('', views.home, name='home'),
    path('contas/login/', LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('contas/logout/', LogoutView.as_view(next_page='usuarios:home'), name='logout'),
    path('contas/register/', views.register, name='register'),
]
