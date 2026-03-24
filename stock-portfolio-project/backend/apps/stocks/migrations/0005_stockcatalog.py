from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('stocks', '0004_delete_stockuniverse'),
    ]

    operations = [
        migrations.CreateModel(
            name='StockCatalog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stock_name', models.CharField(max_length=255)),
                ('market', models.CharField(max_length=64)),
                ('symbol', models.CharField(max_length=32)),
                ('sector', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['market', 'sector', 'stock_name'],
            },
        ),
        migrations.AddIndex(
            model_name='stockcatalog',
            index=models.Index(fields=['market', 'sector'], name='stocks_stoc_market_0f17e7_idx'),
        ),
        migrations.AddIndex(
            model_name='stockcatalog',
            index=models.Index(fields=['symbol'], name='stocks_stoc_symbol_47252c_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='stockcatalog',
            unique_together={('symbol', 'market')},
        ),
    ]
