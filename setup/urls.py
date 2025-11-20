"""
URL configuration for setup project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('contas/', include('django.contrib.auth.urls')),
    path('', include('usuarios.urls')),
    path('drenagem/', include('ferramenta_drenagem.urls')),
    # Old `/mapa/` route pointed to the legacy photo-mapping app.
    # Disable the old map route by redirecting to the newer visualizer
    # and expose the photo upload/map endpoints under `/fotos/`.
    path('mapa/', RedirectView.as_view(url='/ferramentas/visualizador/', permanent=False)),
    path('fotos/', include('mapa_fotos.urls')),
    path('ferramentas/', include('ferramenta_mapa.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
