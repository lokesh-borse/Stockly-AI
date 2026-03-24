from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.auth.urls')),
    path('api/eda/', include('apps.eda.urls')),
    path('api/', include('apps.portfolio.urls')),
    path('api/', include('apps.stocks.urls')),
]


