-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
CREATE TABLE SetupVersion (
	id INTEGER PRIMARY KEY,
    created INTEGER NOT NULL,
	version TEXT NOT NULL
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
DROP TABLE SetupVersion;
-- +goose StatementEnd
