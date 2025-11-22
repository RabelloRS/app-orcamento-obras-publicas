from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import authenticate, login
from django.views.decorators.http import require_http_methods


def public_home(request):
    """Public homepage - accessible without login."""
    context = {
        'title': 'Início',
    }
    return render(request, 'public_home.html', context)


@login_required(login_url='usuarios:login')
def dashboard(request):
    """Restricted landing page."""
    context = {
        'title': 'Início',
    }
    return render(request, 'usuarios/dashboard.html', context)


@login_required(login_url='usuarios:login')
def dashboard_new(request):
    """Pilot new unified layout dashboard."""
    context = {
        'title': 'Início (Piloto)',
    }
    return render(request, 'usuarios/dashboard_new.html', context)


def home(request):
    """Redirect to appropriate page based on auth status."""
    if request.user.is_authenticated:
        return redirect('usuarios:dashboard')
    return redirect('usuarios:public_home')


@require_http_methods(["GET", "POST"])
def register(request):
    """User registration view."""
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('usuarios:dashboard')
    else:
        form = UserCreationForm()
    return render(request, 'usuarios/register.html', {'form': form})
