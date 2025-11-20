from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import authenticate, login
from django.views.decorators.http import require_http_methods


def home(request):
    """Home/dashboard view."""
    context = {
        'title': 'Dashboard',
    }
    return render(request, 'usuarios/home.html', context)


@require_http_methods(["GET", "POST"])
def register(request):
    """User registration view."""
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('usuarios:home')
    else:
        form = UserCreationForm()
    return render(request, 'usuarios/register.html', {'form': form})
