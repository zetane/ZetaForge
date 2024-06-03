-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
CREATE TABLE Executions (
	id INTEGER PRIMARY KEY,
	pipeline INTEGER NOT NULL,
	status TEXT DEFAULT "Pending" NOT NULL,
	created INTEGER NOT NULL,
	completed INTEGER,
	json TEXT,
	deleted INTEGER DEFAULT FALSE NOT NULL,

	FOREIGN KEY(pipeline) REFERENCES pipelines(id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
DROP TABLE Executions;
-- +goose StatementEnd
