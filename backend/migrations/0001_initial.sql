CREATE TABLE counters (
	key VARCHAR(140) NOT NULL,
	value BIGINT NOT NULL,
	expires_at BIGINT NOT NULL,
	PRIMARY KEY (key)
);

CREATE INDEX ix_counters_expires_at ON counters (expires_at);

CREATE TABLE owners (
	id VARCHAR(36) NOT NULL,
	token_hash VARCHAR(64) NOT NULL,
	created_at BIGINT NOT NULL,
	revoked INTEGER NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (token_hash)
);

CREATE TABLE service_keys (
	name VARCHAR(40) NOT NULL,
	digest VARCHAR(64) NOT NULL,
	PRIMARY KEY (name)
);

CREATE TABLE media (
	id VARCHAR(36) NOT NULL,
	owner_id VARCHAR(36) NOT NULL,
	object_key VARCHAR(120) NOT NULL,
	purpose VARCHAR(16) NOT NULL,
	status VARCHAR(16) NOT NULL,
	size BIGINT NOT NULL,
	width INTEGER NOT NULL,
	height INTEGER NOT NULL,
	created_at BIGINT NOT NULL,
	ready_at BIGINT,
	last_error VARCHAR(40),
	attempts INTEGER NOT NULL,
	next_retry BIGINT NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(owner_id) REFERENCES owners (id),
	UNIQUE (object_key)
);

CREATE INDEX ix_media_created_at ON media (created_at);

CREATE INDEX ix_media_owner_id ON media (owner_id);

CREATE INDEX ix_media_status ON media (status);

CREATE TABLE operations (
	id VARCHAR(36) NOT NULL,
	owner_id VARCHAR(36) NOT NULL,
	kind VARCHAR(16) NOT NULL,
	key VARCHAR(80) NOT NULL,
	fingerprint VARCHAR(64) NOT NULL,
	resource_id VARCHAR(36) NOT NULL,
	created_at BIGINT NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (owner_id, kind, key),
	FOREIGN KEY(owner_id) REFERENCES owners (id)
);

CREATE INDEX ix_operations_created_at ON operations (created_at);

CREATE INDEX ix_operations_owner_id ON operations (owner_id);

CREATE TABLE cards (
	id VARCHAR(36) NOT NULL,
	owner_id VARCHAR(36) NOT NULL,
	media_id VARCHAR(36) NOT NULL,
	token_hash VARCHAR(64) NOT NULL,
	document TEXT NOT NULL,
	created_at BIGINT NOT NULL,
	expires_at BIGINT NOT NULL,
	revoked INTEGER NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(owner_id) REFERENCES owners (id),
	FOREIGN KEY(media_id) REFERENCES media (id),
	UNIQUE (token_hash)
);

CREATE INDEX ix_cards_expires_at ON cards (expires_at);

CREATE INDEX ix_cards_media_id ON cards (media_id);

CREATE INDEX ix_cards_owner_id ON cards (owner_id);
