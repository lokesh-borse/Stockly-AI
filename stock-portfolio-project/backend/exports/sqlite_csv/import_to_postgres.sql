-- PostgreSQL import script generated from SQLite export
-- Run this file with: psql -U <user> -d <db> -f import_to_postgres.sql
BEGIN;
SET session_replication_role = replica;

-- Import auth_group
\copy public."auth_group" ("id", "name") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/auth_group.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."auth_group"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."auth_group"), 1), (SELECT COUNT(*) > 0 FROM public."auth_group")) WHERE pg_get_serial_sequence('public."auth_group"', 'id') IS NOT NULL;

-- Import auth_user
\copy public."auth_user" ("id", "password", "last_login", "is_superuser", "username", "last_name", "email", "is_staff", "is_active", "date_joined", "first_name") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/auth_user.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."auth_user"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."auth_user"), 1), (SELECT COUNT(*) > 0 FROM public."auth_user")) WHERE pg_get_serial_sequence('public."auth_user"', 'id') IS NOT NULL;

-- Import django_content_type
\copy public."django_content_type" ("id", "app_label", "model") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/django_content_type.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."django_content_type"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."django_content_type"), 1), (SELECT COUNT(*) > 0 FROM public."django_content_type")) WHERE pg_get_serial_sequence('public."django_content_type"', 'id') IS NOT NULL;

-- Import django_migrations
\copy public."django_migrations" ("id", "app", "name", "applied") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/django_migrations.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."django_migrations"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."django_migrations"), 1), (SELECT COUNT(*) > 0 FROM public."django_migrations")) WHERE pg_get_serial_sequence('public."django_migrations"', 'id') IS NOT NULL;

-- Import django_session
\copy public."django_session" ("session_key", "session_data", "expire_date") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/django_session.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."django_session"', 'session_key'), GREATEST((SELECT COALESCE(MAX("session_key"), 0) FROM public."django_session"), 1), (SELECT COUNT(*) > 0 FROM public."django_session")) WHERE pg_get_serial_sequence('public."django_session"', 'session_key') IS NOT NULL;

-- Import stocks_stock
\copy public."stocks_stock" ("id", "symbol", "name", "sector", "industry", "market_cap", "pe_ratio", "dividend_yield", "_52_week_high", "_52_week_low", "created_at", "updated_at") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/stocks_stock.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."stocks_stock"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."stocks_stock"), 1), (SELECT COUNT(*) > 0 FROM public."stocks_stock")) WHERE pg_get_serial_sequence('public."stocks_stock"', 'id') IS NOT NULL;

-- Import auth_user_groups
\copy public."auth_user_groups" ("id", "user_id", "group_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/auth_user_groups.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."auth_user_groups"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."auth_user_groups"), 1), (SELECT COUNT(*) > 0 FROM public."auth_user_groups")) WHERE pg_get_serial_sequence('public."auth_user_groups"', 'id') IS NOT NULL;

-- Import authapp_passwordresetotp
\copy public."authapp_passwordresetotp" ("id", "otp_code", "created_at", "is_used", "user_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/authapp_passwordresetotp.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."authapp_passwordresetotp"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."authapp_passwordresetotp"), 1), (SELECT COUNT(*) > 0 FROM public."authapp_passwordresetotp")) WHERE pg_get_serial_sequence('public."authapp_passwordresetotp"', 'id') IS NOT NULL;

-- Import authapp_userprofile
\copy public."authapp_userprofile" ("id", "preferred_sector", "investment_goal", "risk_tolerance", "user_id", "telegram_chat_id", "mpin_hash", "mpin_set", "telegram_handle") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/authapp_userprofile.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."authapp_userprofile"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."authapp_userprofile"), 1), (SELECT COUNT(*) > 0 FROM public."authapp_userprofile")) WHERE pg_get_serial_sequence('public."authapp_userprofile"', 'id') IS NOT NULL;

-- Import portfolio_portfolio
\copy public."portfolio_portfolio" ("id", "name", "description", "created_at", "updated_at", "user_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/portfolio_portfolio.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."portfolio_portfolio"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."portfolio_portfolio"), 1), (SELECT COUNT(*) > 0 FROM public."portfolio_portfolio")) WHERE pg_get_serial_sequence('public."portfolio_portfolio"', 'id') IS NOT NULL;

-- Import token_blacklist_outstandingtoken
\copy public."token_blacklist_outstandingtoken" ("token", "created_at", "expires_at", "user_id", "jti", "id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/token_blacklist_outstandingtoken.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."token_blacklist_outstandingtoken"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."token_blacklist_outstandingtoken"), 1), (SELECT COUNT(*) > 0 FROM public."token_blacklist_outstandingtoken")) WHERE pg_get_serial_sequence('public."token_blacklist_outstandingtoken"', 'id') IS NOT NULL;

-- Import auth_permission
\copy public."auth_permission" ("id", "content_type_id", "codename", "name") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/auth_permission.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."auth_permission"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."auth_permission"), 1), (SELECT COUNT(*) > 0 FROM public."auth_permission")) WHERE pg_get_serial_sequence('public."auth_permission"', 'id') IS NOT NULL;

-- Import django_admin_log
\copy public."django_admin_log" ("id", "object_id", "object_repr", "action_flag", "change_message", "content_type_id", "user_id", "action_time") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/django_admin_log.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."django_admin_log"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."django_admin_log"), 1), (SELECT COUNT(*) > 0 FROM public."django_admin_log")) WHERE pg_get_serial_sequence('public."django_admin_log"', 'id') IS NOT NULL;

-- Import stocks_stockprice
\copy public."stocks_stockprice" ("id", "date", "open_price", "close_price", "high_price", "low_price", "volume", "stock_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/stocks_stockprice.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."stocks_stockprice"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."stocks_stockprice"), 1), (SELECT COUNT(*) > 0 FROM public."stocks_stockprice")) WHERE pg_get_serial_sequence('public."stocks_stockprice"', 'id') IS NOT NULL;

-- Import portfolio_growthanalysis
\copy public."portfolio_growthanalysis" ("id", "period_label", "mean_return", "std_dev", "sharpe_ratio", "total_return", "best_stock", "worst_stock", "computed_at", "portfolio_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/portfolio_growthanalysis.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."portfolio_growthanalysis"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."portfolio_growthanalysis"), 1), (SELECT COUNT(*) > 0 FROM public."portfolio_growthanalysis")) WHERE pg_get_serial_sequence('public."portfolio_growthanalysis"', 'id') IS NOT NULL;

-- Import portfolio_portfoliorating
\copy public."portfolio_portfoliorating" ("id", "score", "stars", "label", "computed_at", "portfolio_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/portfolio_portfoliorating.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."portfolio_portfoliorating"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."portfolio_portfoliorating"), 1), (SELECT COUNT(*) > 0 FROM public."portfolio_portfoliorating")) WHERE pg_get_serial_sequence('public."portfolio_portfoliorating"', 'id') IS NOT NULL;

-- Import portfolio_portfoliostock
\copy public."portfolio_portfoliostock" ("id", "quantity", "purchase_price", "purchase_date", "portfolio_id", "stock_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/portfolio_portfoliostock.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."portfolio_portfoliostock"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."portfolio_portfoliostock"), 1), (SELECT COUNT(*) > 0 FROM public."portfolio_portfoliostock")) WHERE pg_get_serial_sequence('public."portfolio_portfoliostock"', 'id') IS NOT NULL;

-- Import portfolio_timeseriesforecast
\copy public."portfolio_timeseriesforecast" ("id", "model_name", "horizon_days", "points_used", "latest_close", "predicted_close", "predicted_change_percent", "historical_points", "prediction_points", "created_at", "portfolio_id", "stock_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/portfolio_timeseriesforecast.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."portfolio_timeseriesforecast"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."portfolio_timeseriesforecast"), 1), (SELECT COUNT(*) > 0 FROM public."portfolio_timeseriesforecast")) WHERE pg_get_serial_sequence('public."portfolio_timeseriesforecast"', 'id') IS NOT NULL;

-- Import token_blacklist_blacklistedtoken
\copy public."token_blacklist_blacklistedtoken" ("blacklisted_at", "token_id", "id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/token_blacklist_blacklistedtoken.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."token_blacklist_blacklistedtoken"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."token_blacklist_blacklistedtoken"), 1), (SELECT COUNT(*) > 0 FROM public."token_blacklist_blacklistedtoken")) WHERE pg_get_serial_sequence('public."token_blacklist_blacklistedtoken"', 'id') IS NOT NULL;

-- Import auth_group_permissions
\copy public."auth_group_permissions" ("id", "group_id", "permission_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/auth_group_permissions.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."auth_group_permissions"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."auth_group_permissions"), 1), (SELECT COUNT(*) > 0 FROM public."auth_group_permissions")) WHERE pg_get_serial_sequence('public."auth_group_permissions"', 'id') IS NOT NULL;

-- Import auth_user_user_permissions
\copy public."auth_user_user_permissions" ("id", "user_id", "permission_id") FROM 'E:/stock-portfolio-project-LLM/stock-portfolio-project/backend/exports/sqlite_csv/auth_user_user_permissions.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
SELECT setval(pg_get_serial_sequence('public."auth_user_user_permissions"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM public."auth_user_user_permissions"), 1), (SELECT COUNT(*) > 0 FROM public."auth_user_user_permissions")) WHERE pg_get_serial_sequence('public."auth_user_user_permissions"', 'id') IS NOT NULL;

SET session_replication_role = DEFAULT;
COMMIT;
