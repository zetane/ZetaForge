-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
CREATE TABLE Pipelines (
	id INTEGER PRIMARY KEY,
	organization TEXT NOT NULL,
	created INTEGER NOT NULL,
	uuid TEXT NOT NULL,
	hash TEXT NOT NULL,
	json TEXT NOT NULL,
	deployed INTEGER DEFAULT FALSE NOT NULL,
	deleted INTEGER DEFAULT FALSE NOT NULL
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
DROP TABLE Pipelines;
-- +goose StatementEnd
