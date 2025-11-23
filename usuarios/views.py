from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods

from .forms import RegistrationForm
from .models import EmailDomainGroup, UserAccessProfile


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
    """User registration view with post-approval access control."""
    domain_groups = list(
        EmailDomainGroup.objects.order_by('domain').values_list('domain', flat=True)
    )

    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = False  # aguardará aprovação
            user.save()

            email_domain = form.cleaned_data['email'].split('@')[1].lower()
            domain_group, _ = EmailDomainGroup.objects.get_or_create(domain=email_domain)
            UserAccessProfile.objects.create(user=user, domain_group=domain_group)

            messages.success(
                request,
                'Cadastro recebido! Aguarde a aprovação do administrador para acessar as áreas restritas.'
            )
            return redirect('usuarios:login')
    else:
        form = RegistrationForm()
    return render(
        request,
        'usuarios/register.html',
        {
            'form': form,
            'domain_groups': domain_groups,
        },
    )
