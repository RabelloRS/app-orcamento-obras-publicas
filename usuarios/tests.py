from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse


class UsuariosAuthTestCase(TestCase):
    """Test authentication flow for usuarios app."""

    def setUp(self):
        """Set up test client and test user."""
        self.client = Client()
        self.test_user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_home_redirect_when_not_authenticated(self):
        """Test that unauthenticated users are redirected from home to public_home."""
        response = self.client.get(reverse('usuarios:home'))
        self.assertEqual(response.status_code, 302)
        # Should redirect to public_home
        self.assertTrue(response.url.endswith(reverse('usuarios:public_home')))

    def test_home_redirect_when_authenticated(self):
        """Test that authenticated users are redirected from home to dashboard."""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('usuarios:home'))
        self.assertEqual(response.status_code, 302)
        # Should redirect to dashboard
        self.assertTrue(response.url.endswith(reverse('usuarios:dashboard')))

    def test_public_home_accessible_without_auth(self):
        """Test that public home is accessible without authentication."""
        response = self.client.get(reverse('usuarios:public_home'))
        self.assertEqual(response.status_code, 200)

    def test_dashboard_requires_auth(self):
        """Test that dashboard requires authentication."""
        response = self.client.get(reverse('usuarios:dashboard'))
        # Should redirect to login
        self.assertEqual(response.status_code, 302)

    def test_login_view_get(self):
        """Test GET request to login page."""
        response = self.client.get(reverse('usuarios:login'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('form', response.context)

    def test_login_success(self):
        """Test successful login."""
        response = self.client.post(
            reverse('usuarios:login'),
            {'username': 'testuser', 'password': 'testpass123'},
            follow=True
        )
        self.assertIn('_auth_user_id', self.client.session)

    def test_login_fail(self):
        """Test failed login with wrong password."""
        response = self.client.post(
            reverse('usuarios:login'),
            {'username': 'testuser', 'password': 'wrongpass'},
            follow=True
        )
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_logout(self):
        """Test logout functionality."""
        self.client.login(username='testuser', password='testpass123')
        self.assertIn('_auth_user_id', self.client.session)
        response = self.client.post(reverse('usuarios:logout'), follow=True)
        # After logout, redirect happens; check response is 200
        self.assertEqual(response.status_code, 200)

    def test_register_view_get(self):
        """Test GET request to register page."""
        response = self.client.get(reverse('usuarios:register'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('form', response.context)

    def test_register_success(self):
        """Test registration with approval workflow (user inactive, not auto-login)."""
        response = self.client.post(
            reverse('usuarios:register'),
            {
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password1': 'complexpass123',
                'password2': 'complexpass123'
            },
            follow=True
        )
        self.assertTrue(User.objects.filter(username='newuser').exists())
        user = User.objects.get(username='newuser')
        self.assertFalse(user.is_active)  # aguardará aprovação
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_register_fail_password_mismatch(self):
        """Test registration fails when passwords don't match."""
        response = self.client.post(
            reverse('usuarios:register'),
            {
                'username': 'newuser2',
                'password1': 'complexpass123',
                'password2': 'differentpass123'
            }
        )
        self.assertFalse(User.objects.filter(username='newuser2').exists())


class ManualTestCase(TestCase):
    """Test manual/help pages functionality."""

    def setUp(self):
        """Set up test client."""
        self.client = Client()

    def test_manual_index_accessible(self):
        """Test that manual index page is accessible without authentication."""
        response = self.client.get(reverse('usuarios:manual'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Manual de Instruções e Ajuda')

    def test_manual_index_lists_tools(self):
        """Test that manual index page lists all tools."""
        response = self.client.get(reverse('usuarios:manual'))
        self.assertEqual(response.status_code, 200)
        # Check that tool cards are present
        self.assertContains(response, 'Microdrenagem Urbana')
        self.assertContains(response, 'IDFGeo RS')
        self.assertContains(response, 'Mapa de Fotos')
        self.assertContains(response, 'HidroCalc Pro')
        self.assertContains(response, 'Pavimentação.br')
        self.assertContains(response, 'Dimensionamento Hidráulico')

    def test_manual_detail_microdrenagem(self):
        """Test that microdrenagem manual detail page is accessible."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'microdrenagem'}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Microdrenagem Urbana')
        self.assertContains(response, 'Fundamentação Teórica')
        self.assertContains(response, 'Como Utilizar')

    def test_manual_detail_idfgeo(self):
        """Test that idfgeo manual detail page is accessible."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'idfgeo'}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'IDFGeo RS')

    def test_manual_detail_mapa_fotos(self):
        """Test that mapa_fotos manual detail page is accessible."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'mapa_fotos'}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Mapa de Fotos')

    def test_manual_detail_hidrograma(self):
        """Test that hidrograma manual detail page is accessible."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'hidrograma'}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'HidroCalc Pro')

    def test_manual_detail_pavimentacao(self):
        """Test that pavimentacao manual detail page is accessible."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'pavimentacao'}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Pavimentação.br')

    def test_manual_detail_dimensionamento(self):
        """Test that dimensionamento manual detail page is accessible."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'dimensionamento'}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Dimensionamento Hidráulico')

    def test_manual_detail_invalid_app_redirects_to_index(self):
        """Test that invalid app_name shows the manual index."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'invalid_app'}))
        self.assertEqual(response.status_code, 200)
        # Should show the index page instead
        self.assertContains(response, 'Manual de Instruções e Ajuda')

    def test_manual_detail_has_developer_info(self):
        """Test that manual detail pages contain developer information."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'microdrenagem'}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Rodrigo Emanuel Rabello')
        self.assertContains(response, 'Engenheiro Civil')

    def test_manual_detail_has_theory_section(self):
        """Test that manual detail pages have theory section."""
        response = self.client.get(reverse('usuarios:manual_detail', kwargs={'app_name': 'microdrenagem'}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Método Racional')
        self.assertContains(response, 'Manning')
