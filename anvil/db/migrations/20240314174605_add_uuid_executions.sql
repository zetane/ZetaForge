-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
CREATE TABLE executions_backup (
    id INTEGER PRIMARY KEY,
   	pipeline INTEGER NOT NULL,
  	status TEXT DEFAULT "Pending" NOT NULL,
	  created INTEGER NOT NULL,
	  completed INTEGER,
	  json TEXT,
	  deleted INTEGER DEFAULT FALSE NOT NULL,
    executionid TEXT
);

INSERT INTO executions_backup
SELECT e.*, NULL AS executionid
FROM Executions e;

DROP TABLE Executions;

UPDATE executions_backup
SET executionid = (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || '4' || substr(hex(randomblob(2)), 2) || '-' || substr('AB89', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))));

CREATE TABLE Executions (
    id INTEGER PRIMARY KEY,
   	pipeline INTEGER NOT NULL,
  	status TEXT DEFAULT "Pending" NOT NULL,
	  created INTEGER NOT NULL,
	  completed INTEGER,
	  json TEXT,
	  deleted INTEGER DEFAULT FALSE NOT NULL,
    executionid TEXT NOT NULL,
    FOREIGN KEY(pipeline) REFERENCES pipelines(id)
);

INSERT INTO Executions
SELECT e2.*
FROM executions_backup e2;

DROP TABLE executions_backup;

CREATE INDEX idx_executions_executionId ON Executions (executionid);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
DROP INDEX idx_executions_executionid;
ALTER TABLE Executions DROP COLUMN executionid;
-- +goose StatementEnd
