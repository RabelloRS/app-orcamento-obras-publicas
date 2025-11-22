from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User


class FerramentaDrenagemTestCase(TestCase):
    """Test ferramenta_drenagem views."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='tester', email='tester@example.com', password='teste123'
        )

    def test_calculo_volume_requires_login(self):
        """Anonymous user should be redirected to login when accessing calculo_volume."""
        response = self.client.get(reverse('ferramenta_drenagem:calculo_volume'))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse('usuarios:login'), response.url)

    def test_calculo_volume_authenticated_access(self):
        """Authenticated user can access calculo_volume."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('ferramenta_drenagem:calculo_volume'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('title', response.context)

    def test_calculo_volume_context(self):
        """Test calculo_volume view context."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('ferramenta_drenagem:calculo_volume'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['title'], 'Cálculo de Volume - Drenagem Urbana')

    def test_dimensionamento_authenticated_access(self):
        """Dimensionamento view should be accessible to authenticated users."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('ferramenta_drenagem:dimensionamento'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Dimensionamento Hidráulico')

    def test_idfgeo_requires_login(self):
        """IDFGeo should require authentication."""
        response = self.client.get(reverse('ferramenta_drenagem:idfgeo'))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse('usuarios:login'), response.url)

    def test_idfgeo_authenticated_access(self):
        """Authenticated user gets 200 on IDFGeo."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('ferramenta_drenagem:idfgeo'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'IDFGeo')

    def test_idfgeo_shortcut_redirect(self):
        """/idfgeo/ should redirect (302) to /drenagem/idfgeo/."""
        response = self.client.get('/idfgeo/')
        self.assertIn(response.status_code, (301, 302))
        self.assertTrue(response['Location'].endswith('/drenagem/idfgeo/'))
