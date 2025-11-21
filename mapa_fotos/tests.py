from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse


class MapaFotosTestCase(TestCase):
    """Test mapa_fotos views."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

    def test_mapa_publico_public_access(self):
        """Test that mapa_publico view is publicly accessible."""
        response = self.client.get(reverse('mapa_fotos:mapa_publico'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('title', response.context)

    def test_mapa_login_required(self):
        """Test that mapa view requires authentication."""
        response = self.client.get(reverse('mapa_fotos:mapa'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/contas/login/', response.url)

    def test_mapa_authenticated(self):
        """Test mapa view for authenticated user."""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('mapa_fotos:mapa'))
        self.assertEqual(response.status_code, 200)

    def test_upload_redirect(self):
        """Test that upload view redirects to mapa since we moved to client-side only."""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('mapa_fotos:upload'))
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('mapa_fotos:mapa'))
