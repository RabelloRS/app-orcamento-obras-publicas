from django.test import TestCase, Client
from django.urls import reverse


class FerramentaDrenagemTestCase(TestCase):
    """Test ferramenta_drenagem views."""

    def setUp(self):
        self.client = Client()

    def test_calculo_volume_public_access(self):
        """Test that calculo_volume is publicly accessible without login."""
        response = self.client.get(reverse('ferramenta_drenagem:calculo_volume'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('title', response.context)

    def test_calculo_volume_context(self):
        """Test calculo_volume view context."""
        response = self.client.get(reverse('ferramenta_drenagem:calculo_volume'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['title'], 'Cálculo de Volume - Drenagem Urbana')
