-- 1. Insere as roles primeiro
INSERT IGNORE INTO tb_role (id, name) VALUES (1, 'adm');
INSERT IGNORE INTO tb_role (id, name) VALUES (2, 'usr');

-- 2. Insere o usuário (com senha em BCrypt hash)
-- Hash BCrypt de "123456": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
INSERT IGNORE INTO tb_user (id, username, password) VALUES
    (1, 'admin', '$2a$10$r6dtw/of0o8GZ5c9QgqYDuczJJsHuEUQG5qCfH0Ukgwu48PBTC.12');

-- 3. Associa o usuário à role ADMIN
INSERT IGNORE INTO tb_user_role (user_id, role_id) VALUES (1, 1);
