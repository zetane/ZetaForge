-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
ALTER TABLE Pipelines ADD merkle TEXT;
CREATE INDEX pipelines_hash_idx ON Pipelines (hash);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
DROP INDEX IF EXISTS pipelines_hash_idx;
ALTER TABLE Pipelines DROP merkle;
-- +goose StatementEnd
