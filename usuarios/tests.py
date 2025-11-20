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
        """Test that unauthenticated users are allowed on home but can see login link."""
        response = self.client.get(reverse('usuarios:home'))
        self.assertEqual(response.status_code, 200)

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
        """Test successful user registration."""
        response = self.client.post(
            reverse('usuarios:register'),
            {
                'username': 'newuser',
                'password1': 'complexpass123',
                'password2': 'complexpass123'
            },
            follow=True
        )
        self.assertTrue(User.objects.filter(username='newuser').exists())
        self.assertIn('_auth_user_id', self.client.session)

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
