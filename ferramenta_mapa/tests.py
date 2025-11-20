from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse


class FerramentaMapaTestCase(TestCase):
    """Test ferramenta_mapa views."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

    def test_mapa_fotos_login_required(self):
        """Test that mapa_fotos view requires authentication."""
        response = self.client.get(reverse('ferramenta_mapa:mapa_fotos'))
        self.assertEqual(response.status_code, 302)

    def test_mapa_fotos_authenticated(self):
        """Test mapa_fotos view for authenticated user."""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('ferramenta_mapa:mapa_fotos'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('title', response.context)
