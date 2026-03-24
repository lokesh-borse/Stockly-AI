from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.register),
    path('login/', views.login),
    path('logout/', views.logout),
    path('user/', views.user_info),
    path('token/refresh/', TokenRefreshView.as_view()),
    # Password reset
    path('forgot-password/', views.forgot_password),
    path('reset-password/', views.reset_password),
    # MPIN
    path('mpin/set/', views.set_mpin),
    path('mpin/verify/', views.verify_mpin),
    # Admin
    path('admin/users/', views.admin_user_list),
    path('admin/users/<int:user_id>/portfolios/', views.admin_user_portfolios),
    path('admin/portfolio/<int:portfolio_id>/delete/', views.admin_delete_portfolio),
]
