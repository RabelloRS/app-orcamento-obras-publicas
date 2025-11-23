from django.contrib import admin
from django.utils import timezone

from .models import EmailDomainGroup, UserAccessProfile


@admin.register(EmailDomainGroup)
class EmailDomainGroupAdmin(admin.ModelAdmin):
	list_display = ("domain", "user_total", "created_at")
	search_fields = ("domain",)

	def user_total(self, obj):  # pragma: no cover - admin helper
		return obj.user_profiles.count()


@admin.register(UserAccessProfile)
class UserAccessProfileAdmin(admin.ModelAdmin):
	list_display = ("user", "domain_group", "is_approved", "approved_at")
	list_filter = ("is_approved", "domain_group")
	search_fields = ("user__username", "user__email", "domain_group__domain")
	actions = ["aprovar_usuarios"]

	@admin.action(description="Aprovar usuários selecionados")
	def aprovar_usuarios(self, request, queryset):  # pragma: no cover - admin helper
		aprovados = 0
		for profile in queryset.select_related("user"):
			if profile.is_approved:
				continue
			profile.is_approved = True
			profile.approved_at = timezone.now()
			profile.approved_by = request.user
			profile.save(update_fields=["is_approved", "approved_at", "approved_by"])
			profile.user.is_active = True
			profile.user.save(update_fields=["is_active"])
			aprovados += 1
		self.message_user(request, f"{aprovados} usuário(s) aprovados.")
