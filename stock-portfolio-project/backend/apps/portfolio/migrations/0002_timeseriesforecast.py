from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0001_initial'),
        ('stocks', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TimeSeriesForecast',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('model_name', models.CharField(default='ARIMA', max_length=32)),
                ('horizon_days', models.PositiveSmallIntegerField()),
                ('points_used', models.PositiveIntegerField(default=0)),
                ('latest_close', models.DecimalField(decimal_places=4, max_digits=12)),
                ('predicted_close', models.DecimalField(decimal_places=4, max_digits=12)),
                ('predicted_change_percent', models.DecimalField(decimal_places=4, max_digits=10)),
                ('historical_points', models.JSONField(blank=True, default=list)),
                ('prediction_points', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('portfolio', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='time_series_forecasts', to='portfolio.portfolio')),
                ('stock', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='time_series_forecasts', to='stocks.stock')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
