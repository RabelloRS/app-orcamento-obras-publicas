from django.conf import settings
from django.db import models
from django.utils import timezone


class EmailDomainGroup(models.Model):
	"""Represents a company/provider email domain."""

	domain = models.CharField(max_length=255, unique=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["domain"]

	def __str__(self) -> str:  # pragma: no cover - display helper
		return self.domain


class UserAccessProfile(models.Model):
	"""Stores approval status and domain grouping for each user."""

	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="access_profile",
	)
	domain_group = models.ForeignKey(
		EmailDomainGroup,
		on_delete=models.PROTECT,
		related_name="user_profiles",
	)
	is_approved = models.BooleanField(default=False)
	approved_at = models.DateTimeField(null=True, blank=True)
	approved_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name="approved_profiles",
	)
	notes = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self) -> str:  # pragma: no cover - display helper
		return f"Perfil de acesso de {self.user}"  # noqa: P103 (pt)

	def mark_approved(self, approver):
		"""Helper to approve user and activate Django account."""
		if self.is_approved:
			return
		self.is_approved = True
		self.approved_at = timezone.now()
		self.approved_by = approver
		self.save(update_fields=["is_approved", "approved_at", "approved_by"])
		self.user.is_active = True
		self.user.save(update_fields=["is_active"])
