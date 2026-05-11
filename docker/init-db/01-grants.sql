-- Grant allka user CREATE globally (required for Prisma shadow database)
-- and ALL on allka-prefixed databases
GRANT CREATE ON *.* TO 'allka'@'%';
GRANT ALL PRIVILEGES ON `allka%`.* TO 'allka'@'%';
FLUSH PRIVILEGES;
