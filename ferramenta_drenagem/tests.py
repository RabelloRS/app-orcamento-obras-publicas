from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse


class FerramentaDrenagemTestCase(TestCase):
    """Test ferramenta_drenagem views."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

    def test_calculo_volume_login_required(self):
        """Test that calculo_volume requires authentication."""
        response = self.client.get(reverse('ferramenta_drenagem:calculo_volume'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/contas/login/', response.url)

    def test_calculo_volume_authenticated(self):
        """Test calculo_volume view for authenticated user."""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('ferramenta_drenagem:calculo_volume'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('title', response.context)
