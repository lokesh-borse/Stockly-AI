from django.urls import path

from .views import metals_correlation, nifty_clusters


urlpatterns = [
    path("metals/correlation/", metals_correlation),
    path("nifty/clusters/", nifty_clusters),
]
