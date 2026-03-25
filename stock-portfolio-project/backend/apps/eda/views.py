from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services.metal_correlation_service import get_gold_silver_correlation
from .services.nifty_clustering_service import get_nifty_clusters
from apps.ml_analytics.models import NiftyClustering, GoldSilverCorrelation


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def metals_correlation(request):
    period = (request.query_params.get("period") or "5y").strip()
    interval = (request.query_params.get("interval") or "1d").strip()
    try:
        data = get_gold_silver_correlation(period=period, interval=interval)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response(
            {"detail": f"Failed to fetch metals correlation data: {exc}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not data:
        return Response(
            {"detail": "Unable to fetch enough gold/silver data for the selected period/interval."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # ✅ STORE IN DATABASE
    correlation_record = GoldSilverCorrelation.objects.create(
        period=period,
        interval=interval,
        correlation=data.get('correlation', 0.0),
        gold_data=data.get('gold_data', []),
        silver_data=data.get('silver_data', []),
        statistics=data.get('statistics', {}),
    )
    
    data['correlation_id'] = correlation_record.id
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nifty_clusters(request):
    period = (request.query_params.get("period") or "1y").strip()
    interval = (request.query_params.get("interval") or "1d").strip()

    try:
        data = get_nifty_clusters(period=period, interval=interval)
    except Exception as exc:
        return Response(
            {"detail": f"Failed to generate nifty clusters: {exc}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not data:
        return Response(
            {"detail": "Unable to fetch enough NIFTY data for clustering."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # ✅ STORE IN DATABASE
    cluster_record = NiftyClustering.objects.create(
        period=period,
        interval=interval,
        n_clusters=data.get('n_clusters', 3),
        clustering_data=data.get('items', []),
        summary=data.get('summary', []),
        pca_explained_variance=data.get('pca_explained_variance'),
    )
    
    data['clustering_id'] = cluster_record.id
    return Response(data)
