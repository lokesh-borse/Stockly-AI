from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('stocks', '0003_rename_stocks_stoc_market_c95adf_idx_stocks_stoc_market_0c176e_idx'),
    ]

    operations = [
        migrations.DeleteModel(
            name='StockUniverse',
        ),
    ]
