from django.core.management.base import BaseCommand, CommandError
from apps.stocks.models import StockCatalog
import csv
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET


class Command(BaseCommand):
    help = 'Import stock catalog rows from CSV (or XLSX when pandas/openpyxl is available).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            default='data/stocks_with_sectors.csv',
            help='Path relative to backend folder or absolute path. Default: data/stocks_with_sectors.csv',
        )
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Delete existing StockCatalog rows before importing.',
        )

    def handle(self, *args, **options):
        raw_path = options['file']
        file_path = Path(raw_path)
        if not file_path.is_absolute():
            file_path = Path.cwd() / file_path

        if not file_path.exists():
            raise CommandError(f'File not found: {file_path}')

        rows = self._read_rows(file_path)
        if not rows:
            raise CommandError('No data rows found in file.')

        if options['replace']:
            deleted, _ = StockCatalog.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted} existing rows.'))

        created = 0
        updated = 0

        for row in rows:
            stock_name = (row.get('stock_name') or '').strip()
            market = (row.get('market') or '').strip()
            symbol = (row.get('symbol') or '').strip()
            sector = (row.get('sector') or '').strip()

            if not (stock_name and market and symbol and sector):
                continue

            _, is_created = StockCatalog.objects.update_or_create(
                symbol=symbol,
                market=market,
                defaults={
                    'stock_name': stock_name,
                    'sector': sector,
                },
            )
            if is_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Import complete from {file_path}. Created: {created}, Updated: {updated}, Total: {StockCatalog.objects.count()}'
        ))

    def _read_rows(self, file_path: Path):
        suffix = file_path.suffix.lower()
        if suffix == '.csv':
            with file_path.open('r', encoding='utf-8-sig', newline='') as f:
                reader = csv.DictReader(f)
                return [self._normalize_keys(r) for r in reader]

        if suffix in {'.xlsx', '.xls'}:
            try:
                import pandas as pd
                df = pd.read_excel(file_path)
                rows = df.to_dict(orient='records')
                return [self._normalize_keys(r) for r in rows]
            except Exception:
                if suffix == '.xlsx':
                    return self._read_xlsx_fallback(file_path)
                raise CommandError('Unable to read .xls without optional dependencies.')

        raise CommandError('Unsupported file type. Use .csv, .xlsx or .xls')

    def _normalize_keys(self, row):
        mapped = {}
        for key, value in row.items():
            normalized = str(key or '').strip().lower().replace('_', ' ')
            mapped[normalized] = '' if value is None else str(value)

        return {
            'stock_name': mapped.get('stock name') or mapped.get('name') or mapped.get('stock'),
            'market': mapped.get('market'),
            'symbol': mapped.get('symbol') or mapped.get('ticker') or mapped.get('yfinance ticker'),
            'sector': mapped.get('sector'),
        }

    def _read_xlsx_fallback(self, file_path: Path):
        ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rel_ns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}

        with zipfile.ZipFile(file_path) as zf:
            shared_strings = self._read_shared_strings(zf, ns)
            sheet_path = self._first_sheet_path(zf, ns, rel_ns)
            if not sheet_path:
                raise CommandError('Could not find worksheet in XLSX file.')

            root = ET.fromstring(zf.read(sheet_path))
            rows = root.findall('.//x:sheetData/x:row', ns)
            if not rows:
                return []

            headers, header_cols = self._parse_row(rows[0], shared_strings, ns)
            parsed = []
            for row in rows[1:]:
                values, cols = self._parse_row(row, shared_strings, ns)
                row_map = {}
                for idx, header in enumerate(headers):
                    col = header_cols[idx] if idx < len(header_cols) else None
                    value = ''
                    if col in cols:
                        value = values[cols.index(col)]
                    row_map[header] = value
                parsed.append(self._normalize_keys(row_map))
            return parsed

    def _read_shared_strings(self, zf, ns):
        path = 'xl/sharedStrings.xml'
        if path not in zf.namelist():
            return []
        root = ET.fromstring(zf.read(path))
        values = []
        for si in root.findall('.//x:si', ns):
            parts = [t.text or '' for t in si.findall('.//x:t', ns)]
            values.append(''.join(parts))
        return values

    def _first_sheet_path(self, zf, ns, rel_ns):
        workbook = ET.fromstring(zf.read('xl/workbook.xml'))
        first_sheet = workbook.find('.//x:sheets/x:sheet', ns)
        if first_sheet is None:
            return None

        rel_id = first_sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        if not rel_id:
            return None

        rels = ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))
        target = None
        for rel in rels.findall('.//r:Relationship', rel_ns):
            if rel.attrib.get('Id') == rel_id:
                target = rel.attrib.get('Target')
                break
        if not target:
            return None

        target = target.replace('\\', '/').lstrip('/')
        if not target.startswith('xl/'):
            target = f"xl/{target}"
        return target

    def _parse_row(self, row_elem, shared_strings, ns):
        values = []
        cols = []
        for cell in row_elem.findall('x:c', ns):
            ref = cell.attrib.get('r', '')
            col = ''.join(ch for ch in ref if ch.isalpha())
            cell_type = cell.attrib.get('t')
            val_elem = cell.find('x:v', ns)
            text = ''

            if cell_type == 's' and val_elem is not None:
                idx = int(val_elem.text or 0)
                text = shared_strings[idx] if idx < len(shared_strings) else ''
            elif cell_type == 'inlineStr':
                inline = cell.find('x:is/x:t', ns)
                text = inline.text if inline is not None and inline.text is not None else ''
            elif val_elem is not None and val_elem.text is not None:
                text = val_elem.text

            cols.append(col)
            values.append(text)
        return values, cols
