CREATE DATABASE lookout;
USE lookout;
-- =========================================================
-- 1. USERS
-- =========================================================
CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,

    storage_limit BIGINT UNSIGNED NOT NULL,
    storage_used BIGINT UNSIGNED NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
-- =========================================================
-- 2. PROJECTS
-- =========================================================
CREATE TABLE projects (
    project_id BIGINT UNSIGNED AUTO_INCREMENT,
    owner_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (project_id),

    KEY idx_projects_owner_id (owner_id),

    CONSTRAINT fk_projects_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
-- =========================================================
-- 3. FILES
-- =========================================================
CREATE TABLE files (
    file_id BIGINT UNSIGNED AUTO_INCREMENT,

    owner_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NULL,

    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,

    storage_key VARCHAR(700) NOT NULL,
    storage_area VARCHAR(30) NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (file_id),

    UNIQUE KEY uq_files_storage_key (storage_key),

    KEY idx_files_owner_id (owner_id),
    KEY idx_files_project_id (project_id),

    CONSTRAINT fk_files_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_files_project
        FOREIGN KEY (project_id)
        REFERENCES projects(project_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
ALTER TABLE files ADD COLUMN deleted_at DATETIME NULL AFTER status;
ALTER TABLE projects
  ADD UNIQUE KEY uq_projects_id_owner (project_id, owner_id);

ALTER TABLE files
  DROP FOREIGN KEY fk_files_project;

ALTER TABLE files
  ADD CONSTRAINT fk_files_project_owner
    FOREIGN KEY (project_id, owner_id)
    REFERENCES projects (project_id, owner_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
ALTER TABLE users
  ADD CONSTRAINT chk_users_storage_within_limit
    CHECK (storage_used <= storage_limit);
ALTER TABLE files
  MODIFY COLUMN visibility ENUM('private','public') NOT NULL DEFAULT 'private',
  MODIFY COLUMN status ENUM('active','deleted','processing','failed') NOT NULL DEFAULT 'active';

ALTER TABLE projects
  MODIFY COLUMN status ENUM('active','archived','deleted') NOT NULL DEFAULT 'active';
-- =========================================================
-- 4. FEATURES
-- =========================================================
CREATE TABLE features (
    feature_id BIGINT UNSIGNED AUTO_INCREMENT,

    name VARCHAR(150) NOT NULL,
    description TEXT,
    version VARCHAR(30) NOT NULL,

    creator_id BIGINT UNSIGNED NULL,
    storage_key VARCHAR(700) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (feature_id),

    KEY idx_features_creator_id (creator_id),

    CONSTRAINT fk_features_creator
        FOREIGN KEY (creator_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
-- =========================================================
-- 5. USER_FEATURES
-- =========================================================
CREATE TABLE user_features (
    user_id BIGINT UNSIGNED NOT NULL,
    feature_id BIGINT UNSIGNED NOT NULL,

    installed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, feature_id),

    KEY idx_user_features_feature_id (feature_id),

    CONSTRAINT fk_user_features_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_user_features_feature
        FOREIGN KEY (feature_id)
        REFERENCES features(feature_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
ALTER TABLE user_features
  ADD COLUMN uninstalled_at DATETIME NULL AFTER installed_at;
-- =========================================================
-- 6. MARKETPLACE_ITEMS
-- =========================================================
CREATE TABLE marketplace_items (
    item_id BIGINT UNSIGNED AUTO_INCREMENT,

    creator_id BIGINT UNSIGNED NOT NULL,
    file_id BIGINT UNSIGNED NULL,
    feature_id BIGINT UNSIGNED NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    downloads BIGINT UNSIGNED NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (item_id),

    KEY idx_marketplace_creator_id (creator_id),
    KEY idx_marketplace_file_id (file_id),
    KEY idx_marketplace_feature_id (feature_id),

    CONSTRAINT fk_marketplace_creator
        FOREIGN KEY (creator_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_marketplace_file
        FOREIGN KEY (file_id)
        REFERENCES files(file_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_marketplace_feature
        FOREIGN KEY (feature_id)
        REFERENCES features(feature_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
DELIMITER $$

CREATE TRIGGER trg_marketplace_has_content_insert
BEFORE INSERT ON marketplace_items
FOR EACH ROW
BEGIN
    IF NEW.file_id IS NULL AND NEW.feature_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'marketplace_items must reference a file or a feature';
    END IF;
END$$

CREATE TRIGGER trg_marketplace_has_content_update
BEFORE UPDATE ON marketplace_items
FOR EACH ROW
BEGIN
    IF NEW.file_id IS NULL AND NEW.feature_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'marketplace_items must reference a file or a feature';
    END IF;
END$$

DELIMITER ;