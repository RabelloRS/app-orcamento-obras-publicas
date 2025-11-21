from django.test import TestCase, Client
from django.urls import reverse


class FerramentaMapaTestCase(TestCase):
    """Test ferramenta_mapa views."""

    def setUp(self):
        self.client = Client()

    def test_mapa_fotos_public_access(self):
        """Test that mapa_fotos view is publicly accessible without login."""
        response = self.client.get(reverse('ferramenta_mapa:mapa_fotos'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('title', response.context)

    def test_mapa_fotos_context(self):
        """Test mapa_fotos view context."""
        response = self.client.get(reverse('ferramenta_mapa:mapa_fotos'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['title'], 'Mapeamento de Fotos Georreferenciadas')
